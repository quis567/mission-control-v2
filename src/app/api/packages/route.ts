import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const packages = await prisma.package.findMany({
    orderBy: { price: 'asc' },
    include: { _count: { select: { clients: true } } },
  });
  return NextResponse.json(packages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pkg = await prisma.package.create({
    data: {
      name: body.name,
      description: body.description || null,
      price: parseFloat(body.price) || 0,
      services: body.services || '[]',
      isCustom: body.isCustom || false,
    },
  });
  return NextResponse.json(pkg, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const pkg = await prisma.package.update({
    where: { id: body.id },
    data: {
      name: body.name,
      description: body.description,
      price: body.price != null ? parseFloat(body.price) : undefined,
      services: body.services,
    },
  });
  return NextResponse.json(pkg);
}
