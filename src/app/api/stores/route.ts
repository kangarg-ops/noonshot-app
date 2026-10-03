import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      orderBy: { ds_name: 'asc' }
    });
    return NextResponse.json(stores);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ds_code, ds_name, store_type } = body;
    const store = await prisma.store.create({
      data: { ds_code, ds_name, store_type: store_type || "SHOT" }
    });
    return NextResponse.json(store);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { ds_code, isActive } = body;
    const store = await prisma.store.update({
      where: { ds_code },
      data: { isActive }
    });
    return NextResponse.json(store);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}
