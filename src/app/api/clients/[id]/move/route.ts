import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();

  const validStatuses = ['lead', 'prospect', 'proposal', 'active', 'paused', 'churned'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const client = await prisma.client.update({
    where: { id },
    data: { status, statusChangedAt: new Date() },
  });

  return NextResponse.json(client);
}
