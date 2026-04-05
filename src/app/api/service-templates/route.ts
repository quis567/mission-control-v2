import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const templates = await prisma.serviceTemplate.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
