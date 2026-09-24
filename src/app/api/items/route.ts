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
    const { item_zsku, pbarcode, product_title, imageUrl, in_stock, substitute_zsku } = body;
    const item = await prisma.item.create({
      data: { 
        item_zsku, 
        pbarcode, 
        product_title, 
        imageUrl: imageUrl || null,
        in_stock: in_stock ?? true, 
        substitute_zsku: substitute_zsku || null 
      }
    });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
