import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await prisma.$queryRawUnsafe(`SELECT * FROM "Item" ORDER BY product_title ASC`);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Item" (item_zsku, pbarcode, product_title, brand, unit_size, unit_type, "imageUrl", in_stock, substitute_zsku, item_type, category, max_qty)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (item_zsku) DO UPDATE SET
         pbarcode = EXCLUDED.pbarcode,
         product_title = EXCLUDED.product_title,
         brand = EXCLUDED.brand,
         unit_size = EXCLUDED.unit_size,
         unit_type = EXCLUDED.unit_type,
         "imageUrl" = EXCLUDED."imageUrl",
         substitute_zsku = EXCLUDED.substitute_zsku,
         item_type = EXCLUDED.item_type,
         category = EXCLUDED.category,
         max_qty = EXCLUDED.max_qty`,
      b.item_zsku, b.pbarcode || '', b.product_title,
      b.brand || null, b.unit_size || null, b.unit_type || null,
      b.imageUrl || null, b.in_stock ?? true,
      b.substitute_zsku || null,
      b.item_type || 'GENERAL', b.category || 'INGREDIENTS',
      b.max_qty ? parseInt(b.max_qty) : null
    );
    return NextResponse.json({ success: true, item_zsku: b.item_zsku });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const b = await req.json();
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    const fields: Record<string, any> = {
      pbarcode: b.pbarcode, product_title: b.product_title,
      brand: b.brand ?? undefined, unit_size: b.unit_size ?? undefined,
      unit_type: b.unit_type ?? undefined, imageUrl: b.imageUrl ?? undefined,
      in_stock: b.in_stock, substitute_zsku: b.substitute_zsku ?? undefined,
      item_type: b.item_type, category: b.category,
      max_qty: b.max_qty !== undefined ? (b.max_qty === '' ? null : parseInt(b.max_qty)) : undefined
    };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        sets.push(`"${key}" = $${i++}`);
        vals.push(val === '' ? null : val);
      }
    }
    if (sets.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    vals.push(b.item_zsku);
    await prisma.$executeRawUnsafe(`UPDATE "Item" SET ${sets.join(', ')} WHERE item_zsku = $${i}`, ...vals);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const item_zsku = searchParams.get('item_zsku');
    if (!item_zsku) return NextResponse.json({ error: 'item_zsku required' }, { status: 400 });
    await prisma.$executeRawUnsafe(`DELETE FROM "Item" WHERE item_zsku = $1`, item_zsku);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
