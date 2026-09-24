import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as xlsx from 'xlsx';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    
    let settings = await prisma.settings.findFirst();
    const cutoffTime = settings?.cutoffTime || "19:00";
    const [cutoffHour, cutoffMin] = cutoffTime.split(':').map(Number);
    
    let targetDate = new Date();
    if (dateParam) {
      targetDate = new Date(dateParam);
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
    
    // Aggregate: Group by ds_code, then by item_zsku, and take MAX qty
    const aggregated: Record<string, Record<string, any>> = {};
    
    orders.forEach(order => {
      const storeCode = order.ds_code;
      if (!aggregated[storeCode]) {
        aggregated[storeCode] = {};
      }
      
      order.items.forEach(orderItem => {
        const itemCode = orderItem.item_zsku;
        const currentQty = orderItem.zsku_qty;
        
        if (!aggregated[storeCode][itemCode]) {
          aggregated[storeCode][itemCode] = {
            pbarcode: orderItem.item.pbarcode,
            zsku_qty: currentQty,
            item_zsku: itemCode,
            product_title: orderItem.item.product_title,
            ds_code: storeCode,
            ds_name: order.store.ds_name
          };
        } else {
          // Take the MAX quantity
          if (currentQty > aggregated[storeCode][itemCode].zsku_qty) {
            aggregated[storeCode][itemCode].zsku_qty = currentQty;
          }
        }
      });
    });
    
    // Flatten the object for Excel
    const data = [];
    for (const storeCode in aggregated) {
      for (const itemCode in aggregated[storeCode]) {
        data.push(aggregated[storeCode][itemCode]);
      }
    }
    
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Orders");
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="orders_${targetDate.toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
