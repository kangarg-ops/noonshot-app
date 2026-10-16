import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as xlsx from 'xlsx';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();
    
    let settings = await prisma.settings.findFirst();
    const cutoffTime = settings?.cutoffTime || "19:00";
    const [cutoffHour, cutoffMin] = cutoffTime.split(':').map(Number);
    
    let targetDate = new Date();
    let y = targetDate.getUTCFullYear();
    let m = targetDate.getUTCMonth();
    let d = targetDate.getUTCDate();

    if (dateParam) {
      const parts = dateParam.split('-').map(Number);
      y = parts[0];
      m = parts[1] - 1;
      d = parts[2];
    }

    // Cutoff calculation in IST (UTC+5:30)
    const cutoffMinutesFromMidnight = (cutoffHour * 60 + cutoffMin) - (5 * 60 + 30);
    const endTimestamp = Date.UTC(y, m, d, 0, cutoffMinutesFromMidnight, 0, 0);
    const endDate = new Date(endTimestamp);
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    
    const orders = await prisma.order.findMany({
      where: {
        timestamp: {
          gt: startDate,
          lte: endDate
        }
      },
      include: {
        items: {
          include: {
            item: true
          }
        },
        store: true
      }
    });
    
    // Aggregate: Group by ds_code, then by item_zsku, taking MAX qty across submissions
    const aggregated: Record<string, Record<string, any>> = {};
    
    orders.forEach(order => {
      const storeCode = order.ds_code;
      if (!aggregated[storeCode]) {
        aggregated[storeCode] = {};
      }
      
      order.items.forEach(orderItem => {
        const itemCode = orderItem.item_zsku;
        const currentQty = Math.max(0, parseInt(orderItem.zsku_qty as any) || 0);

        // Exclude anything that has 0 qty or is not ordered
        if (currentQty <= 0) return;

        // Exclude items that are marked Out of Stock or have Max Qty = 0
        if (orderItem.item && (!orderItem.item.in_stock || orderItem.item.max_qty === 0)) {
          return;
        }

        // Warehouse routing logic:
        // AUHID02 for AUHDS and AINDS
        // DXBID04 for DXBDS and SHJDS
        const storeCodeUpper = storeCode.toUpperCase();
        let src_wh_code = "DXBID04";
        if (storeCodeUpper.startsWith("AUH") || storeCodeUpper.startsWith("AIN")) {
          src_wh_code = "AUHID02";
        } else if (storeCodeUpper.startsWith("DXB") || storeCodeUpper.startsWith("SHJ")) {
          src_wh_code = "DXBID04";
        }

        const dst_wh_code = storeCode;
        const partner_id = "294928";
        const barcode = orderItem.item?.pbarcode || "";
        const title = orderItem.item?.product_title || "";
        const category = order.store?.store_type || "SHOT";
        const storeName = order.store?.ds_name || storeCode;

        if (!aggregated[storeCode][itemCode]) {
          aggregated[storeCode][itemCode] = {
            src_wh_code,
            dst_wh_code,
            partner_id,
            barcode,
            Quantity: currentQty,
            ZSKU: itemCode,
            Title: title,
            Category: category,
            STORE: storeName
          };
        } else {
          // Take the MAX quantity across submissions for the same SKU
          if (currentQty > aggregated[storeCode][itemCode].Quantity) {
            aggregated[storeCode][itemCode].Quantity = currentQty;
          }
        }
      });
    });

    // Enforce SUBKO Specialty Beans allocation (1 max per day per store)
    for (const storeCode in aggregated) {
      for (const itemCode in aggregated[storeCode]) {
        const row = aggregated[storeCode][itemCode];
        const t = (row.Title || "").toLowerCase();
        if (t.includes("subko") || t.includes("native blend") || t.includes("niche blend")) {
          row.Quantity = Math.min(row.Quantity, 1);
        }
      }
    }
    
    // Flatten rows with exact column order, omitting any 0 or OOS items
    const data: any[] = [];
    for (const storeCode in aggregated) {
      for (const itemCode in aggregated[storeCode]) {
        const r = aggregated[storeCode][itemCode];
        if (!r.Quantity || r.Quantity <= 0) continue;
        data.push({
          "src_wh_code": r.src_wh_code,
          "dst_wh_code": r.dst_wh_code,
          "partner_id": r.partner_id,
          "barcode": r.barcode,
          "Quantity": r.Quantity,
          "ZSKU": r.ZSKU,
          "Title": r.Title,
          "Category": r.Category,
          "STORE": r.STORE
        });
      }
    }
    
    const dateStr = dateParam || new Date(endTimestamp).toISOString().split('T')[0];

    // If no orders found, output template with headers
    const ws = data.length > 0
      ? xlsx.utils.json_to_sheet(data)
      : xlsx.utils.json_to_sheet([{
          "src_wh_code": "",
          "dst_wh_code": "",
          "partner_id": "",
          "barcode": "",
          "Quantity": "",
          "ZSKU": "",
          "Title": "",
          "Category": "",
          "STORE": ""
        }]);

    if (format === 'csv') {
      const csvContent = xlsx.utils.sheet_to_csv(ws);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="orders_${dateStr}.csv"`
        }
      });
    }

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Orders");
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="orders_${dateStr}.xlsx"`
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
