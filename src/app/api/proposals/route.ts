import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const clientId = new URL(req.url).searchParams.get('clientId');
  const where = clientId ? { clientId } : {};

  const proposals = await prisma.proposal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { id: true, businessName: true, contactName: true, businessType: true } },
    },
  });

  return NextResponse.json(proposals);
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (status) {
    data.status = status;
    if (status === 'sent') data.sentAt = new Date();
  }

  const proposal = await prisma.proposal.update({ where: { id }, data });
  return NextResponse.json(proposal);
}
