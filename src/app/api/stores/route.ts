import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "email" TEXT;`);
    const stores = await prisma.$queryRawUnsafe(`SELECT * FROM "Store" WHERE "isActive" = true ORDER BY ds_name ASC`);
    return NextResponse.json(stores);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await prisma.$executeRawUnsafe(`ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "email" TEXT;`);
    const { ds_code, ds_name, store_type, email } = body;
    
    const formattedEmail = email ? email.trim().toLowerCase() : null;
    const formattedType = store_type || "SHOT";

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Store" (ds_code, ds_name, store_type, email, "isActive")
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (ds_code) DO UPDATE SET
         ds_name = EXCLUDED.ds_name,
         store_type = EXCLUDED.store_type,
         email = EXCLUDED.email,
         "isActive" = true`,
      ds_code.trim(), ds_name.trim(), formattedType, formattedEmail
    );
    return NextResponse.json({ success: true, ds_code });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await prisma.$executeRawUnsafe(`ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "email" TEXT;`);
    const { ds_code, store_type, email, ds_name, isActive } = body;
    
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;

    if (store_type !== undefined) {
      sets.push(`store_type = $${i++}`);
      vals.push(store_type);
    }
    if (email !== undefined) {
      sets.push(`email = $${i++}`);
      vals.push(email ? email.trim().toLowerCase() : null);
    }
    if (ds_name !== undefined) {
      sets.push(`ds_name = $${i++}`);
      vals.push(ds_name.trim());
    }
    if (isActive !== undefined) {
      sets.push(`"isActive" = $${i++}`);
      vals.push(isActive);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    vals.push(ds_code);
    await prisma.$executeRawUnsafe(`UPDATE "Store" SET ${sets.join(', ')} WHERE ds_code = $${i}`, ...vals);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ds_code = searchParams.get('ds_code');
    const all = searchParams.get('all');

    if (all === 'true') {
      await prisma.$executeRawUnsafe(`DELETE FROM "OrderItem"`);
      await prisma.$executeRawUnsafe(`DELETE FROM "Order"`);
      await prisma.$executeRawUnsafe(`DELETE FROM "Store"`);
      return NextResponse.json({ success: true, message: "All stores deleted" });
    }

    if (!ds_code) {
      return NextResponse.json({ error: "ds_code or all=true required" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "Store" WHERE ds_code = $1`, ds_code);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
