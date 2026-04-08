import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { runHealthCheck } from '@/lib/health';

export const maxDuration = 300;

// POST /api/admin/health/refresh
// Body: { clientId?: string }  — if omitted, refresh all active clients with a primary website.
// Auth: CRON_SECRET as Bearer token (used by vercel.json crons), or an admin session cookie.
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.replace(/^Bearer\s+/i, '');
  if (!process.env.CRON_SECRET || bearer !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({} as { clientId?: string }));
  const { clientId } = body;

  const clients = await prisma.client.findMany({
    where: {
      deletedAt: null,
      ...(clientId ? { id: clientId } : { status: { in: ['active', 'client'] } }),
    },
    include: { websites: { take: 1 } },
  });

  const results: Array<{ clientId: string; ok: boolean; error?: string }> = [];
  for (const c of clients) {
    const site = c.websites[0];
    if (!site?.url) { results.push({ clientId: c.id, ok: false, error: 'no website' }); continue; }
    try {
      const r = await runHealthCheck(site.url, site.netlifySiteId);
      await prisma.healthSnapshot.create({
        data: {
          clientId: c.id,
          url: r.url,
          uptime: r.uptime,
          httpStatus: r.httpStatus,
          responseTimeMs: r.responseTimeMs,
          pagespeedMobile: r.pagespeedMobile,
          pagespeedDesktop: r.pagespeedDesktop,
          lcpMs: r.lcpMs,
          clsScore: r.clsScore,
          inpMs: r.inpMs,
          sslValid: r.sslValid,
          sslExpiresAt: r.sslExpiresAt,
          sslIssuer: r.sslIssuer,
          netlifyState: r.netlifyState,
          netlifyDeployedAt: r.netlifyDeployedAt,
          raw: JSON.stringify(r.raw),
        },
      });
      results.push({ clientId: c.id, ok: true });
    } catch (e) {
      results.push({ clientId: c.id, ok: false, error: String(e) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(request: NextRequest) {
  // Vercel cron invokes with GET; delegate to POST logic.
  return POST(request);
}
