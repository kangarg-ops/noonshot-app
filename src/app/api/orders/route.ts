import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ds_code, items } = body;

    if (!ds_code || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Fetch store info
    const store = await prisma.store.findUnique({
      where: { ds_code }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Fetch items details for validation
    const itemZskus = items.map((i: any) => i.item_zsku);
    const dbItems = await prisma.item.findMany({
      where: { item_zsku: { in: itemZskus } }
    });
    const dbItemMap = new Map(dbItems.map(it => [it.item_zsku, it]));

    // Date boundary for monthly limit check (start of current calendar month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    // Check past orders this month for SUBKO Niche Blend limit (max 2 per month)
    const monthlyOrders = await prisma.order.findMany({
      where: {
        ds_code,
        timestamp: { gte: startOfMonth }
      },
      include: { items: true }
    });

    const validatedItems = [];

    for (const it of items) {
      const dbItem = dbItemMap.get(it.item_zsku);
      if (!dbItem) continue;

      let requestedQty = Math.max(0, parseInt(it.zsku_qty) || 0);
      if (requestedQty === 0) continue;

      // 1. Check Out of Stock or Maximum set to zero
      if (!dbItem.in_stock || dbItem.max_qty === 0) {
        return NextResponse.json({
          error: `Item "${dbItem.product_title}" is currently Out of Stock (Order limit: 0).`
        }, { status: 400 });
      }

      const title = (dbItem.product_title || "").toLowerCase();
      const brand = (dbItem.brand || "").toLowerCase();
      const isSubkoBean = title.includes("subko") || brand.includes("subko") || title.includes("native blend") || title.includes("niche blend");
      const isSubkoNiche = isSubkoBean && title.includes("niche");

      // 2. SUBKO Beans daily limit: maximum 1 unit per day
      if (isSubkoBean && requestedQty > 1) {
        requestedQty = 1;
      }

      // 3. SUBKO Niche Blend monthly limit: maximum 2 per month per store
      if (isSubkoNiche) {
        let pastNicheTotal = 0;
        monthlyOrders.forEach(o => {
          o.items.forEach(oi => {
            if (oi.item_zsku === it.item_zsku) {
              pastNicheTotal += oi.zsku_qty;
            }
          });
        });

        if (pastNicheTotal >= 2) {
          return NextResponse.json({
            error: `Monthly allocation limit reached: Store ${ds_code} has already ordered the maximum monthly limit (2 units) for SUBKO Niche Blend.`
          }, { status: 400 });
        }

        requestedQty = Math.min(requestedQty, 1);
      }

      // 4. Check general max_qty limit
      if (dbItem.max_qty !== null && dbItem.max_qty !== undefined && dbItem.max_qty > 0) {
        if (requestedQty > dbItem.max_qty) {
          requestedQty = dbItem.max_qty;
        }
      }

      validatedItems.push({
        item_zsku: it.item_zsku,
        zsku_qty: requestedQty
      });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json({ error: 'No valid in-stock items in cart' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        ds_code,
        items: {
          create: validatedItems
        }
      }
    });

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error: any) {
    console.error("Order submit error:", error);
    return NextResponse.json({ error: error.message || 'Failed to submit order' }, { status: 500 });
  }
}
