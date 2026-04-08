import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getPortalClientId } from '@/lib/portalSession';
import { fetchGbpSnapshot } from '@/lib/gbp';

export const maxDuration = 60;

// GET — return the latest snapshot + connection status.
export async function GET(request: NextRequest) {
  const clientId = await getPortalClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [latest, conn, client] = await Promise.all([
    prisma.gbpSnapshot.findFirst({ where: { clientId }, orderBy: { createdAt: 'desc' } }),
    prisma.gbpConnection.findUnique({ where: { clientId } }),
    prisma.client.findUnique({ where: { id: clientId }, select: { gbpPlaceId: true, googleReviewUrl: true } }),
  ]);

  return NextResponse.json({
    snapshot: latest,
    connected: !!conn,
    placeId: client?.gbpPlaceId || null,
    reviewUrl: client?.googleReviewUrl || null,
  });
}

// POST — trigger a refresh.
export async function POST(request: NextRequest) {
  const clientId = await getPortalClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Throttle: one refresh per 10 minutes.
  const recent = await prisma.gbpSnapshot.findFirst({
    where: { clientId, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) return NextResponse.json({ snapshot: recent, cached: true });

  const data = await fetchGbpSnapshot(clientId);
  if (!data) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

  const snapshot = await prisma.gbpSnapshot.create({
    data: {
      clientId,
      rating: data.rating,
      reviewCount: data.reviewCount,
      newReviewsMonth: data.newReviewsMonth,
      recentReviews: JSON.stringify(data.recentReviews),
      raw: JSON.stringify(data.raw),
    },
  });
  return NextResponse.json({ snapshot, cached: false });
}
