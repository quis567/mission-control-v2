import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const clientId = new URL(req.url).searchParams.get('clientId');
  const where = clientId ? { clientId } : {};

  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { id: true, businessName: true, packageId: true, package: { select: { name: true, price: true } } } },
    },
  });

  return NextResponse.json(reports);
}
