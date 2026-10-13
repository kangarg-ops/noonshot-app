import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "brand" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "unit_size" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "unit_type" TEXT`);
    return NextResponse.json({ success: true, message: 'Columns added successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
