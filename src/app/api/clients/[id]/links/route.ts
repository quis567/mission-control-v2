import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const links = await prisma.clientLink.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(links);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const link = await prisma.clientLink.create({
      data: {
        clientId: id,
        category: body.category || null,
        label: body.label,
        url: body.url || null,
        username: body.username || null,
        password: body.password || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
