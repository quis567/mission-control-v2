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

    // Pull real data from DB
    const [seoChanges, completedTasks, websites] = await Promise.all([
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
    ]);

    const currentSeoScores = websites.flatMap(w =>
      w.seoPages.map(p => ({ url: p.pageUrl, score: p.seoScore || 0, title: p.pageTitle }))
    );

    const activeServices = client.services.map(s => s.serviceType);
    const pkgName = client.package?.name || 'Custom';
    const pkgPrice = client.package?.price || client.monthlyRevenue || 0;
    const monthName = startDate.toLocaleString('en-US', { month: 'long' });

    const prompt = `You are a client success manager at TruePath Studios writing a monthly performance report.

Generate a professional, positive monthly report for this client:

Client: ${client.businessName}
Package: ${pkgName} — $${pkgPrice}/mo
Report Period: ${monthName} ${year}

Data from this month:
SEO Changes Made: ${JSON.stringify(seoChanges.slice(0, 20))}
Tasks Completed: ${JSON.stringify(completedTasks.slice(0, 15))}
Active Services: ${JSON.stringify(activeServices)}
Current SEO Scores: ${JSON.stringify(currentSeoScores.slice(0, 20))}
Websites: ${websites.map(w => w.url).join(', ')}

Write these sections:

1. SUMMARY — 2-3 sentence overview of what was accomplished. Be positive and specific.
2. SEO_PROGRESS — What SEO work was done, what improved. If no SEO data, note monitoring will begin.
3. WEBSITE_UPDATES — Changes made to their website. If none, mention site is stable.
4. TASKS_COMPLETED — Summary of work done in client-friendly language.
5. NEXT_MONTH — What we plan to focus on next month. Be specific.
6. RECOMMENDATIONS — 1-2 suggestions for additional services (subtle upsell).

Keep tone professional, positive, results-focused. Client should feel great value.

Respond ONLY with JSON:
{
  "summary": "...",
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

    let content;
    try {
      const match = response.match(/\{[\s\S]*\}/);
      content = match ? JSON.parse(match[0]) : { summary: response };
    } catch {
      content = { summary: response };
    }

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
