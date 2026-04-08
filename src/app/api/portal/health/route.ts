import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getPortalClientId } from '@/lib/portalSession';
import { runHealthCheck } from '@/lib/health';

export const maxDuration = 120;

// GET — return most recent snapshot for the logged-in client.
export async function GET(request: NextRequest) {
  const clientId = await getPortalClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const latest = await prisma.healthSnapshot.findFirst({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ snapshot: latest });
}

// POST — trigger a fresh health check for the logged-in client's primary website.
export async function POST(request: NextRequest) {
  const clientId = await getPortalClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: { id: clientId, deletedAt: null },
    include: { websites: { take: 1 } },
  });
  const website = client?.websites[0];
  if (!website?.url) return NextResponse.json({ error: 'No website configured' }, { status: 400 });

  // Throttle: if a snapshot was taken in the last 5 minutes, return it instead.
  const recent = await prisma.healthSnapshot.findFirst({
    where: { clientId, createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) return NextResponse.json({ snapshot: recent, cached: true });

  const result = await runHealthCheck(website.url, website.netlifySiteId);
  const snapshot = await prisma.healthSnapshot.create({
    data: {
      clientId,
      url: result.url,
      uptime: result.uptime,
      httpStatus: result.httpStatus,
      responseTimeMs: result.responseTimeMs,
      pagespeedMobile: result.pagespeedMobile,
      pagespeedDesktop: result.pagespeedDesktop,
      lcpMs: result.lcpMs,
      clsScore: result.clsScore,
      inpMs: result.inpMs,
      sslValid: result.sslValid,
      sslExpiresAt: result.sslExpiresAt,
      sslIssuer: result.sslIssuer,
      netlifyState: result.netlifyState,
      netlifyDeployedAt: result.netlifyDeployedAt,
      raw: JSON.stringify(result.raw),
    },
  });

  return NextResponse.json({ snapshot, cached: false });
}
