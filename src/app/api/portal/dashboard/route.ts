import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { getPortalClientId } = await import('@/lib/portalSession');
    const clientId = await getPortalClientId(request);
    if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: {
        id: true, businessName: true, contactName: true, slug: true,
        websites: {
          select: {
            url: true, status: true, lastUpdated: true, hostingProvider: true, cmsPlatform: true,
            seoPages: { select: { seoScore: true, issues: true, lastAudited: true, pageUrl: true } },
          },
          take: 1,
        },
        changeRequests: { orderBy: { submittedAt: 'desc' }, take: 10, select: { id: true, changeType: true, pageLocation: true, status: true, priority: true, submittedAt: true, completedAt: true } },
        _count: { select: { changeRequests: true } },
      },
    });

    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const openRequests = client.changeRequests.filter(r => r.status !== 'complete').length;
    const completedRequests = await prisma.changeRequest.count({ where: { clientId, status: 'complete' } });

    // Aggregate SEO data across all crawled pages on the primary website
    const website = client.websites[0] || null;
    let seo: {
      score: number | null;
      pagesCrawled: number;
      totalIssues: number;
      lastCrawled: string | null;
      topIssues: { type: string; count: number }[];
    } | null = null;

    if (website && website.seoPages.length > 0) {
      const pages = website.seoPages;
      const scoredPages = pages.filter(p => typeof p.seoScore === 'number');
      const avgScore = scoredPages.length > 0
        ? Math.round(scoredPages.reduce((s, p) => s + (p.seoScore || 0), 0) / scoredPages.length)
        : null;

      // Count issues by type across all pages
      const issueCounts: Record<string, number> = {};
      let totalIssues = 0;
      for (const page of pages) {
        try {
          const parsed = JSON.parse(page.issues || '[]');
          for (const iss of parsed) {
            totalIssues++;
            const type = typeof iss === 'string' ? iss : iss.type || iss.message || 'Issue';
            issueCounts[type] = (issueCounts[type] || 0) + 1;
          }
        } catch { /* skip */ }
      }
      const topIssues = Object.entries(issueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type, count]) => ({ type, count }));

      const lastCrawled = pages
        .map(p => p.lastAudited)
        .filter((d): d is Date => !!d)
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;

      seo = {
        score: avgScore,
        pagesCrawled: pages.length,
        totalIssues,
        lastCrawled: lastCrawled ? lastCrawled.toISOString() : null,
        topIssues,
      };
    }

    return NextResponse.json({
      businessName: client.businessName,
      contactName: client.contactName,
      slug: client.slug,
      website: website ? { url: website.url, status: website.status, lastUpdated: website.lastUpdated, hostingProvider: website.hostingProvider, cmsPlatform: website.cmsPlatform } : null,
      seo,
      openRequests,
      completedRequests,
      totalRequests: client._count.changeRequests,
      recentRequests: client.changeRequests,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
