import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getPortalClientId } from '@/lib/portalSession';

export async function GET(request: NextRequest) {
  const clientId = await getPortalClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  const limit = Math.min(Number(searchParams.get('limit') || '100'), 500);

  const submissions = await prisma.leadSubmission.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // CSV export
  if (format === 'csv') {
    const header = ['Date', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'Source', 'Page URL'];
    const esc = (v: string | null) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const rows = submissions.map((s) =>
      [
        s.createdAt.toISOString(),
        s.name,
        s.email,
        s.phone,
        s.subject,
        s.message,
        s.source,
        s.pageUrl,
      ].map(esc).join(','),
    );
    const csv = [header.join(','), ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // Stats: this month vs last month
  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonth, lastMonth] = await Promise.all([
    prisma.leadSubmission.count({ where: { clientId, createdAt: { gte: startThisMonth } } }),
    prisma.leadSubmission.count({
      where: { clientId, createdAt: { gte: startLastMonth, lt: startThisMonth } },
    }),
  ]);

  // Daily counts for the last 30 days (for sparkline)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = await prisma.leadSubmission.findMany({
    where: { clientId, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const buckets: Record<string, number> = {};
  for (const r of recent) {
    const k = r.createdAt.toISOString().slice(0, 10);
    buckets[k] = (buckets[k] || 0) + 1;
  }
  const daily = Object.entries(buckets)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    submissions,
    stats: { thisMonth, lastMonth, daily },
  });
}

// Mark a lead as read
export async function PATCH(request: NextRequest) {
  const clientId = await getPortalClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, read } = await request.json();
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const lead = await prisma.leadSubmission.findFirst({ where: { id, clientId } });
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await prisma.leadSubmission.update({ where: { id }, data: { read: read ?? true } });
  return NextResponse.json({ ok: true });
}
