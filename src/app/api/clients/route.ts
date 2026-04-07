import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const businessType = searchParams.get('businessType');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDir = searchParams.get('sortDir') || 'desc';

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (businessType) where.businessType = businessType;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      include: {
        _count: { select: { websites: true, services: true, tasks: true } },
        package: { select: { id: true, name: true, price: true } },
        websites: {
          select: {
            id: true, url: true, cmsPlatform: true, lastUpdated: true,
            seoPages: { select: { seoScore: true, issues: true, lastAudited: true } },
          },
        },
        services: { where: { status: 'active' }, select: { price: true, billingType: true } },
        tasks: { orderBy: { updatedAt: 'desc' }, take: 1, where: { status: 'done' }, select: { title: true, updatedAt: true } },
        notes: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
        proposals: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    });

    // Enrich each client with computed fields
    const now = Date.now();
    const enriched = clients.map(c => {
      // Revenue
      const monthlyRevenue = c.services.reduce((sum, s) => sum + (s.billingType === 'monthly' && s.price ? s.price : 0), 0) || c.package?.price || c.monthlyRevenue || 0;

      // SEO
      const allSeoPages = c.websites.flatMap(w => w.seoPages);
      const avgSeoScore = allSeoPages.length > 0 ? Math.round(allSeoPages.reduce((s, p) => s + (p.seoScore || 0), 0) / allSeoPages.length) : null;
      let totalSeoIssues = 0;
      for (const p of allSeoPages) { try { totalSeoIssues += JSON.parse(p.issues || '[]').length; } catch {} }

      // Last activity
      const dates: { type: string; desc: string; date: Date }[] = [];
      if (c.tasks[0]) dates.push({ type: 'task', desc: `Task completed — ${c.tasks[0].title}`, date: c.tasks[0].updatedAt });
      if (c.notes[0]) dates.push({ type: 'note', desc: 'Note added', date: c.notes[0].createdAt });
      if (c.proposals[0]) dates.push({ type: 'proposal', desc: 'Proposal created', date: c.proposals[0].createdAt });
      for (const w of c.websites) {
        const lastCrawl = w.seoPages.map(p => p.lastAudited).filter(Boolean).sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
        if (lastCrawl) dates.push({ type: 'seo_crawl', desc: 'SEO crawl completed', date: new Date(lastCrawl) });
        if (w.lastUpdated) dates.push({ type: 'deploy', desc: 'Site deployed', date: new Date(w.lastUpdated) });
      }
      dates.sort((a, b) => b.date.getTime() - a.date.getTime());
      const lastActivity = dates[0] ? { type: dates[0].type, description: dates[0].desc, date: dates[0].date.toISOString() } : null;

      // Health
      const daysSinceActivity = lastActivity ? (now - new Date(lastActivity.date).getTime()) / (1000 * 60 * 60 * 24) : 999;
      let health = 'gray';
      if (c.status?.toLowerCase() === 'active' || c.status?.toLowerCase() === 'paused') {
        if (daysSinceActivity > 30 || (avgSeoScore !== null && avgSeoScore < 50) || c.status?.toLowerCase() === 'paused') health = 'red';
        else if (daysSinceActivity > 14 || totalSeoIssues >= 3) health = 'yellow';
        else health = 'green';
      }

      // Simplified websites for response
      const websitesSimple = c.websites.map(w => ({
        id: w.id, url: w.url, cmsPlatform: w.cmsPlatform,
        seoScore: w.seoPages.length > 0 ? Math.round(w.seoPages.reduce((s, p) => s + (p.seoScore || 0), 0) / w.seoPages.length) : null,
        seoIssues: w.seoPages.reduce((sum, p) => { try { return sum + JSON.parse(p.issues || '[]').length; } catch { return sum; } }, 0),
      }));

      return {
        id: c.id, businessName: c.businessName, contactName: c.contactName, email: c.email, phone: c.phone,
        businessType: c.businessType, city: c.city, state: c.state, status: c.status,
        package: c.package, monthlyRevenue, createdAt: c.createdAt,
        websites: websitesSimple, websiteCount: c._count.websites, serviceCount: c._count.services, taskCount: c._count.tasks,
        avgSeoScore, totalSeoIssues, lastActivity, health,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Auto-generate slug from business name
    let slug = generateSlug(body.businessName);
    const existing = await prisma.client.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const client = await prisma.client.create({
      data: {
        businessName: body.businessName,
        contactName: body.contactName || null,
        email: body.email || null,
        phone: body.phone || null,
        businessType: body.businessType || null,
        city: body.city || null,
        state: body.state || null,
        slug,
        status: body.status || 'lead',
        monthlyRevenue: body.monthlyRevenue ? parseFloat(body.monthlyRevenue) : null,
        dateAcquired: body.dateAcquired ? new Date(body.dateAcquired) : null,
        tags: body.tags || '[]',
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
