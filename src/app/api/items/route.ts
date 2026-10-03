import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      orderBy: { product_title: 'asc' }
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { item_zsku, pbarcode, product_title, brand, imageUrl, in_stock, substitute_zsku, item_type, category, max_qty } = body;
    const item = await (prisma.item.create as any)({
      data: { 
        item_zsku, 
        pbarcode, 
        product_title,
        brand: brand || null,
        imageUrl: imageUrl || null,
        in_stock: in_stock ?? true, 
        substitute_zsku: substitute_zsku || null,
        item_type: item_type || "GENERAL",
        category: category || "INGREDIENTS",
        max_qty: max_qty ? parseInt(max_qty) : null
      }
    });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { item_zsku, in_stock, max_qty } = body;
    const updateData: any = {};
    if (in_stock !== undefined) updateData.in_stock = in_stock;
    if (max_qty !== undefined) updateData.max_qty = max_qty === "" ? null : parseInt(max_qty);
    const item = await prisma.item.update({
      where: { item_zsku },
      data: updateData
    });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const item_zsku = searchParams.get('item_zsku');
    if (!item_zsku) return NextResponse.json({ error: 'item_zsku required' }, { status: 400 });
    await prisma.item.delete({ where: { item_zsku } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
