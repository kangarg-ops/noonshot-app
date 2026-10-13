import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AdminUser" (
      "email" TEXT PRIMARY KEY,
      "created_at" TIMESTAMP DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "AdminUser" ("email") VALUES ('kangarg@noon.com') ON CONFLICT DO NOTHING;
  `);
}

export async function GET() {
  try {
    await ensureTable();
    const admins = await prisma.$queryRawUnsafe(`SELECT * FROM "AdminUser" ORDER BY "created_at" ASC`);
    return NextResponse.json(admins);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const body = await req.json();
    const email = body.email ? body.email.trim().toLowerCase() : '';

    if (!email || !email.endsWith('@noon.com')) {
      return NextResponse.json({ error: 'Valid @noon.com email required' }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "AdminUser" ("email") VALUES ($1) ON CONFLICT DO NOTHING`,
      email
    );
    return NextResponse.json({ success: true, email });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'email parameter required' }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "AdminUser" WHERE "email" = $1`, email.trim().toLowerCase());
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
