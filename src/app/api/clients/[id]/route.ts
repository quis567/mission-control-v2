import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        websites: { orderBy: { createdAt: 'desc' } },
        services: { orderBy: { createdAt: 'desc' } },
        links: { orderBy: { createdAt: 'desc' } },
        notes: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { websites: true, services: true, tasks: true } },
        package: { select: { id: true, name: true, price: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    const fields = ['businessName', 'contactName', 'email', 'phone', 'businessType', 'city', 'state', 'status', 'tags', 'packageId'];
    for (const f of fields) {
      if (f in body) data[f] = body[f];
    }
    if ('monthlyRevenue' in body) data.monthlyRevenue = body.monthlyRevenue ? parseFloat(body.monthlyRevenue) : null;
    if ('dateAcquired' in body) data.dateAcquired = body.dateAcquired ? new Date(body.dateAcquired) : null;

    const client = await prisma.client.update({ where: { id }, data });
    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
