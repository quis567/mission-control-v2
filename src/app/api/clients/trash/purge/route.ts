import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST or GET /api/clients/trash/purge — hard-delete clients soft-deleted >7 days ago.
// Called by Vercel Cron daily. Vercel cron uses GET, so support both.
async function purge(request: NextRequest) {
  try {
    // Vercel cron sends an Authorization header with CRON_SECRET when configured
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDelete = await prisma.client.findMany({
      where: { deletedAt: { not: null, lt: cutoff } },
      select: { id: true, businessName: true },
    });

    const ids = toDelete.map(c => c.id);
    if (ids.length === 0) {
      return NextResponse.json({ purged: 0, clients: [] });
    }

    // Hard delete — relies on Prisma cascade rules. Wrap in transaction.
    await prisma.$transaction([
      prisma.client.deleteMany({ where: { id: { in: ids } } }),
    ]);

    return NextResponse.json({ purged: ids.length, clients: toDelete });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export const GET = purge;
export const POST = purge;
