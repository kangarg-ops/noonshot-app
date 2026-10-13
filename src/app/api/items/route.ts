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
