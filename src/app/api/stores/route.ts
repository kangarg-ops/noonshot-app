import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
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
    const { ds_code, ds_name } = body;
    const store = await prisma.store.create({
      data: { ds_code, ds_name }
    });
    return NextResponse.json(store);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}
