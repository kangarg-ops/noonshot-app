import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// This forces Next.js to fetch fresh data every time instead of caching an empty list
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await prisma.item.findMany({ orderBy: { product_title: 'asc' } });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const item = await (prisma.item.create as any)({ data: body });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { item_zsku, ...rest } = body;
    const item = await (prisma.item.update as any)({ where: { item_zsku }, data: rest });
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
