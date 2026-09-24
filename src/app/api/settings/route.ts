import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: 1, cutoffTime: "19:00" } });
  }
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { cutoffTime } = body;
  
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: { cutoffTime },
    create: { id: 1, cutoffTime }
  });
  
  return NextResponse.json(settings);
}
