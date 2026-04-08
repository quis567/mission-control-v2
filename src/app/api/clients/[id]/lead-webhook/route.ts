import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/db';

// POST — (re)generate a lead webhook key for this client.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = randomBytes(24).toString('hex');
  const client = await prisma.client.update({
    where: { id },
    data: { leadWebhookKey: key },
    select: { id: true, leadWebhookKey: true },
  });
  return NextResponse.json(client);
}

// GET — return current key (if any).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    select: { leadWebhookKey: true },
  });
  return NextResponse.json({ leadWebhookKey: client?.leadWebhookKey || null });
}

// DELETE — revoke the key.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.client.update({ where: { id }, data: { leadWebhookKey: null } });
  return NextResponse.json({ ok: true });
}
