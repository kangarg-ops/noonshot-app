import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ds_code, items } = body;

    if (!ds_code || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        ds_code,
        items: {
          create: items.map((item: any) => ({
            item_zsku: item.item_zsku,
            zsku_qty: item.zsku_qty
          }))
        }
      }
    });

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit order' }, { status: 500 });
  }
}
