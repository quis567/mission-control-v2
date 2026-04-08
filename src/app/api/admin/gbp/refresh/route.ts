import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { fetchGbpSnapshot } from '@/lib/gbp';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.replace(/^Bearer\s+/i, '');
  if (!process.env.CRON_SECRET || bearer !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Refresh any active client that either has a GBP OAuth connection or a gbpPlaceId.
  const clients = await prisma.client.findMany({
    where: {
      deletedAt: null,
      OR: [
        { gbpConnection: { isNot: null } },
        { gbpPlaceId: { not: null } },
      ],
    },
    select: { id: true },
  });

  const results: Array<{ clientId: string; ok: boolean }> = [];
  for (const c of clients) {
    try {
      const data = await fetchGbpSnapshot(c.id);
      if (!data) { results.push({ clientId: c.id, ok: false }); continue; }
      await prisma.gbpSnapshot.create({
        data: {
          clientId: c.id,
          rating: data.rating,
          reviewCount: data.reviewCount,
          newReviewsMonth: data.newReviewsMonth,
          recentReviews: JSON.stringify(data.recentReviews),
          raw: JSON.stringify(data.raw),
        },
      });
      results.push({ clientId: c.id, ok: true });
    } catch {
      results.push({ clientId: c.id, ok: false });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
