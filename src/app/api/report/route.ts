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
    if (dateParam) {
      const [y, m, d] = dateParam.split('-').map(Number);
      targetDate = new Date(y, m - 1, d);
    }
    
    // endDate = targetDate at cutoffTime
    const endDate = new Date(targetDate);
    endDate.setHours(cutoffHour, cutoffMin, 0, 0);
    
    // startDate = previous day at cutoffTime
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);
    
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
    
    // Aggregate: Group by ds_code, then by item_zsku, and take MAX qty across submissions
    const aggregated: Record<string, Record<string, any>> = {};
    
    orders.forEach(order => {
      const storeCode = order.ds_code;
      if (!aggregated[storeCode]) {
        aggregated[storeCode] = {};
      }
      
      order.items.forEach(orderItem => {
        const itemCode = orderItem.item_zsku;
        const currentQty = orderItem.zsku_qty;
        
        // src_wh_code logic: Abu Dhabi (AUH) uses AUHID02, Dubai (DXB) uses DXBID04
        const src_wh_code = storeCode.toUpperCase().startsWith("AUH") ? "AUHID02" : "DXBID04";
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
          // Rule: Take the MAX quantity across submissions for the same SKU
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
    
    // Flatten rows with exact column order
    const data: any[] = [];
    for (const storeCode in aggregated) {
      for (const itemCode in aggregated[storeCode]) {
        const r = aggregated[storeCode][itemCode];
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
    
    const ws = xlsx.utils.json_to_sheet(data);
    const dateStr = dateParam || targetDate.toISOString().split('T')[0];

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
