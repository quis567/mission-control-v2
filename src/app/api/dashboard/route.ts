import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      clients,
      services,
      tasks,
      tasksCompletedWeek,
      websites,
      seoPages,
      proposals,
      agents,
      crawlHistory,
      recentClients,
      recentProposals,
    ] = await Promise.all([
      prisma.client.findMany({ select: { id: true, businessName: true, status: true, createdAt: true } }),
      prisma.service.findMany({ where: { status: 'active', billingType: 'monthly' }, select: { price: true } }),
      prisma.task.findMany({ select: { id: true, title: true, status: true, updatedAt: true } }),
      prisma.task.count({ where: { status: 'done', updatedAt: { gte: weekAgo } } }),
      prisma.website.count(),
      prisma.seoPage.findMany({ select: { issues: true, pageUrl: true, seoScore: true, lastAudited: true, website: { select: { url: true } } } }),
      prisma.proposal.findMany({ select: { id: true, status: true, createdAt: true, client: { select: { businessName: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.agent.findMany({ select: { name: true, status: true }, take: 7 }),
      prisma.crawlHistory.findMany({ select: { pagesFound: true, issuesFound: true, crawledAt: true, website: { select: { url: true } } }, orderBy: { crawledAt: 'desc' }, take: 5 }),
      prisma.client.findMany({ where: { createdAt: { gte: monthAgo } }, select: { businessName: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.proposal.findMany({ where: { createdAt: { gte: monthAgo } }, select: { client: { select: { businessName: true } }, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    // KPIs
    const mrr = services.reduce((sum, s) => sum + (s.price || 0), 0);
    const activeClients = clients.filter(c => c.status?.toLowerCase() === 'active').length;

    // SEO issues count
    let seoIssuesTotal = 0;
    const seoIssueSites = new Set<string>();
    for (const page of seoPages) {
      try {
        const issues = JSON.parse(page.issues || '[]');
        if (issues.length > 0) {
          seoIssuesTotal += issues.length;
          seoIssueSites.add(page.website?.url || '');
        }
      } catch { /* skip */ }
    }

    // Pipeline counts
    const pipeline: Record<string, number> = { Lead: 0, Prospect: 0, Proposal: 0, Active: 0, Paused: 0, Churned: 0 };
    for (const c of clients) {
      const status = c.status?.charAt(0).toUpperCase() + c.status?.slice(1).toLowerCase();
      if (status in pipeline) pipeline[status]++;
      else if (c.status?.toLowerCase() === 'lead') pipeline.Lead++;
      else if (c.status?.toLowerCase() === 'active') pipeline.Active++;
    }

    // Navigation badges
    const activeTasks = tasks.filter(t => ['in_progress', 'assigned', 'todo', 'inbox'].includes(t.status)).length;
    const draftProposals = proposals.filter(p => p.status === 'draft').length;

    // Recent activity feed — combine from multiple sources
    const activity: { type: string; message: string; timestamp: string; color: string }[] = [];

    // Crawl history
    for (const crawl of crawlHistory) {
      activity.push({
        type: 'seo_crawl',
        message: `SEO crawl completed — ${crawl.website?.url || 'site'} (${crawl.pagesFound} pages)`,
        timestamp: crawl.crawledAt.toISOString(),
        color: 'green',
      });
    }

    // Recent clients
    for (const c of recentClients) {
      activity.push({
        type: 'new_client',
        message: `New client added: ${c.businessName}`,
        timestamp: c.createdAt.toISOString(),
        color: 'blue',
      });
    }

    // Recent proposals
    for (const p of recentProposals) {
      activity.push({
        type: 'proposal',
        message: `Proposal created for ${p.client?.businessName}`,
        timestamp: p.createdAt.toISOString(),
        color: 'purple',
      });
    }

    // Completed tasks this week
    const recentDoneTasks = tasks.filter(t => t.status === 'done' && t.updatedAt >= weekAgo).slice(0, 5);
    for (const t of recentDoneTasks) {
      activity.push({
        type: 'task_done',
        message: `Task completed: ${t.title}`,
        timestamp: t.updatedAt.toISOString(),
        color: 'green',
      });
    }

    // Sort by timestamp descending, take 10
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      kpis: {
        mrr: Math.round(mrr),
        activeClients,
        seoIssues: seoIssuesTotal,
        seoIssuesSites: seoIssueSites.size,
        tasksCompleted: tasksCompletedWeek,
      },
      navigation: {
        activeTasks,
        leads: pipeline.Lead,
        activeClients,
        websites,
        seoIssues: seoIssuesTotal,
        draftProposals,
        mrr: Math.round(mrr),
      },
      pipeline,
      recentActivity: activity.slice(0, 10),
      revenue: { current: Math.round(mrr) },
      agents,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
