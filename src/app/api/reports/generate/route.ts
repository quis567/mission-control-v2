import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { callClaude } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  try {
    const { clientId, month, year } = await req.json();
    if (!clientId || !month || !year) {
      return NextResponse.json({ error: 'clientId, month, and year required' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { package: true, services: { where: { status: 'active' } } },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    // Date range for the target month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const prevStart = new Date(year, month - 2, 1);

    // Pull real data from DB
    const [
      seoChanges,
      completedTasks,
      websites,
      healthThisMonth,
      healthLastMonth,
      leadsThisMonth,
      leadsLastMonth,
      gbpLatest,
      gbpStartOfMonth,
    ] = await Promise.all([
      prisma.seoChange.findMany({
        where: {
          seoPage: { website: { clientId } },
          createdAt: { gte: startDate, lt: endDate },
        },
        select: { fieldChanged: true, oldValue: true, newValue: true, changedBy: true },
      }),
      prisma.task.findMany({
        where: {
          clientId,
          status: 'done',
          updatedAt: { gte: startDate, lt: endDate },
        },
        select: { title: true, description: true },
      }),
      prisma.website.findMany({
        where: { clientId },
        include: {
          seoPages: { select: { pageUrl: true, seoScore: true, pageTitle: true } },
        },
      }),
      prisma.healthSnapshot.findMany({
        where: { clientId, createdAt: { gte: startDate, lt: endDate } },
        select: { pagespeedMobile: true, pagespeedDesktop: true, uptime: true, responseTimeMs: true },
      }),
      prisma.healthSnapshot.findMany({
        where: { clientId, createdAt: { gte: prevStart, lt: startDate } },
        select: { pagespeedMobile: true, pagespeedDesktop: true },
      }),
      prisma.leadSubmission.count({ where: { clientId, createdAt: { gte: startDate, lt: endDate } } }),
      prisma.leadSubmission.count({ where: { clientId, createdAt: { gte: prevStart, lt: startDate } } }),
      prisma.gbpSnapshot.findFirst({ where: { clientId, createdAt: { lt: endDate } }, orderBy: { createdAt: 'desc' } }),
      prisma.gbpSnapshot.findFirst({ where: { clientId, createdAt: { lt: startDate } }, orderBy: { createdAt: 'desc' } }),
    ]);

    const currentSeoScores = websites.flatMap(w =>
      w.seoPages.map(p => ({ url: p.pageUrl, score: p.seoScore || 0, title: p.pageTitle }))
    );

    // Aggregate health metrics
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const mobileThis = avg(healthThisMonth.map(h => h.pagespeedMobile).filter((n): n is number => n != null));
    const mobileLast = avg(healthLastMonth.map(h => h.pagespeedMobile).filter((n): n is number => n != null));
    const desktopThis = avg(healthThisMonth.map(h => h.pagespeedDesktop).filter((n): n is number => n != null));
    const uptimePct = healthThisMonth.length
      ? Math.round((healthThisMonth.filter(h => h.uptime === true).length / healthThisMonth.length) * 100)
      : null;

    const reviewCountNow = gbpLatest?.reviewCount ?? null;
    const reviewCountPrev = gbpStartOfMonth?.reviewCount ?? null;
    const reviewDelta = reviewCountNow != null && reviewCountPrev != null ? reviewCountNow - reviewCountPrev : null;
    const currentRating = gbpLatest?.rating ?? null;

    // Compute an overall letter grade from weighted signals.
    const gradeScore = (() => {
      let score = 0;
      let weight = 0;
      if (mobileThis != null) { score += mobileThis; weight += 1; }
      if (uptimePct != null) { score += uptimePct; weight += 1; }
      if (currentRating != null) { score += (currentRating / 5) * 100; weight += 1; }
      if (currentSeoScores.length) {
        const avgSeo = currentSeoScores.reduce((s, p) => s + p.score, 0) / currentSeoScores.length;
        score += avgSeo; weight += 1;
      }
      return weight ? Math.round(score / weight) : null;
    })();
    const gradeLetter = gradeScore == null ? null
      : gradeScore >= 90 ? 'A'
      : gradeScore >= 80 ? 'B'
      : gradeScore >= 70 ? 'C'
      : gradeScore >= 60 ? 'D' : 'F';

    const activeServices = client.services.map(s => s.serviceType);
    const pkgName = client.package?.name || 'Custom';
    const pkgPrice = client.package?.price || client.monthlyRevenue || 0;
    const monthName = startDate.toLocaleString('en-US', { month: 'long' });

    const prompt = `You are a client success manager at TruePath Studios writing a monthly performance report.

Generate a professional, positive monthly report for this client:

Client: ${client.businessName}
Package: ${pkgName} — $${pkgPrice}/mo
Report Period: ${monthName} ${year}
Overall Grade: ${gradeLetter ?? 'N/A'} (${gradeScore ?? '—'}/100)

Performance metrics this month:
- Leads captured: ${leadsThisMonth} (last month: ${leadsLastMonth})
- Mobile page speed: ${mobileThis ?? 'N/A'} (last month: ${mobileLast ?? 'N/A'})
- Desktop page speed: ${desktopThis ?? 'N/A'}
- Uptime: ${uptimePct != null ? `${uptimePct}%` : 'N/A'}
- Google rating: ${currentRating ?? 'N/A'} stars
- Total Google reviews: ${reviewCountNow ?? 'N/A'}${reviewDelta != null ? ` (${reviewDelta >= 0 ? '+' : ''}${reviewDelta} this month)` : ''}

Work performed this month:
SEO Changes Made: ${JSON.stringify(seoChanges.slice(0, 20))}
Tasks Completed: ${JSON.stringify(completedTasks.slice(0, 15))}
Active Services: ${JSON.stringify(activeServices)}
Current SEO Scores: ${JSON.stringify(currentSeoScores.slice(0, 20))}
Websites: ${websites.map(w => w.url).join(', ')}

Write these sections:

1. SUMMARY — 2-3 sentence overview. Highlight the biggest win (most leads, speed improvement, new reviews, etc.). Be positive and specific.
2. RESULTS — Quantitative wins in plain English (e.g., "We captured 12 new leads this month, up from 8 last month"). Cover leads, reviews, speed, uptime.
3. SEO_PROGRESS — What SEO work was done, what improved.
4. WEBSITE_UPDATES — Changes made to their website. If none, mention site is stable and monitored.
5. TASKS_COMPLETED — Summary of work done in client-friendly language.
6. NEXT_MONTH — What we plan to focus on next month. Be specific.
7. RECOMMENDATIONS — 1-2 suggestions for additional services (subtle upsell).

Keep tone professional, positive, results-focused. Client should feel great value.

Respond ONLY with JSON:
{
  "summary": "...",
  "results": "...",
  "seoProgress": "...",
  "websiteUpdates": "...",
  "tasksCompleted": "...",
  "nextMonth": "...",
  "recommendations": "..."
}`;

    const response = await callClaude(
      'You are a professional report writer. Respond only with valid JSON.',
      prompt,
      4096
    );

    let content: Record<string, unknown>;
    try {
      const match = response.match(/\{[\s\S]*\}/);
      content = match ? JSON.parse(match[0]) : { summary: response };
    } catch {
      content = { summary: response };
    }

    // Attach computed metrics to the stored content so the UI can render them.
    const metrics = {
      gradeLetter,
      gradeScore,
      leadsThisMonth,
      leadsLastMonth,
      mobileThis,
      mobileLast,
      desktopThis,
      uptimePct,
      currentRating,
      reviewCountNow,
      reviewDelta,
    };
    content.metrics = metrics;

    const report = await prisma.report.create({
      data: {
        clientId,
        month,
        year,
        content: JSON.stringify(content),
      },
    });

    return NextResponse.json({
      id: report.id,
      content,
      metrics,
      clientName: client.businessName,
      packageName: pkgName,
      packagePrice: pkgPrice,
      month: monthName,
      year,
      seoChangesCount: seoChanges.length,
      tasksCompletedCount: completedTasks.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
