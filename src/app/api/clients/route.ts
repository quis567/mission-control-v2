import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const businessType = searchParams.get('businessType');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDir = searchParams.get('sortDir') || 'desc';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (businessType) where.businessType = businessType;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      include: {
        _count: { select: { websites: true, services: true, tasks: true } },
        package: { select: { id: true, name: true, price: true } },
      },
    });

    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const client = await prisma.client.create({
      data: {
        businessName: body.businessName,
        contactName: body.contactName || null,
        email: body.email || null,
        phone: body.phone || null,
        businessType: body.businessType || null,
        city: body.city || null,
        state: body.state || null,
        status: body.status || 'lead',
        monthlyRevenue: body.monthlyRevenue ? parseFloat(body.monthlyRevenue) : null,
        dateAcquired: body.dateAcquired ? new Date(body.dateAcquired) : null,
        tags: body.tags || '[]',
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
