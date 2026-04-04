import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const services = await prisma.service.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(services);
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

    const service = await prisma.service.create({
      data: {
        clientId: id,
        serviceType: body.serviceType,
        status: body.status || 'active',
        billingType: body.billingType || null,
        price: body.price ? parseFloat(body.price) : null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        nextBillingDate: body.nextBillingDate ? new Date(body.nextBillingDate) : null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
