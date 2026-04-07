import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      include: { client: { select: { businessName: true, status: true } } },
    });

    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, businessName: true, status: true, monthlyRevenue: true },
    });

    // MRR: sum of active monthly services
    const activeMonthly = services.filter(s => s.status === 'active' && s.billingType === 'monthly');
    const mrr = activeMonthly.reduce((sum, s) => sum + (s.price || 0), 0);

    // Quarterly and annual recurring, normalized to monthly
    const activeQuarterly = services.filter(s => s.status === 'active' && s.billingType === 'quarterly');
    const activeAnnual = services.filter(s => s.status === 'active' && s.billingType === 'annual');
    const quarterlyMonthly = activeQuarterly.reduce((sum, s) => sum + (s.price || 0) / 3, 0);
    const annualMonthly = activeAnnual.reduce((sum, s) => sum + (s.price || 0) / 12, 0);
    const totalMrr = mrr + quarterlyMonthly + annualMonthly;

    // One-time revenue
    const oneTime = services.filter(s => s.billingType === 'one-time');
    const totalOneTime = oneTime.reduce((sum, s) => sum + (s.price || 0), 0);

    // Revenue by service type
    const byServiceType: Record<string, number> = {};
    for (const s of services.filter(s => s.status === 'active')) {
      byServiceType[s.serviceType] = (byServiceType[s.serviceType] || 0) + (s.price || 0);
    }

    // Client counts by status
    const clientsByStatus: Record<string, number> = {};
    for (const c of clients) {
      clientsByStatus[c.status] = (clientsByStatus[c.status] || 0) + 1;
    }

    // Top clients by revenue
    const topClients = clients
      .filter(c => c.monthlyRevenue && c.monthlyRevenue > 0)
      .sort((a, b) => (b.monthlyRevenue || 0) - (a.monthlyRevenue || 0))
      .slice(0, 10)
      .map(c => ({ name: c.businessName, revenue: c.monthlyRevenue, status: c.status }));

    // Upcoming renewals (next 30 days)
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingRenewals = services
      .filter(s => s.nextBillingDate && new Date(s.nextBillingDate) >= now && new Date(s.nextBillingDate) <= in30 && s.status === 'active')
      .map(s => ({
        serviceType: s.serviceType,
        client: s.client?.businessName,
        price: s.price,
        date: s.nextBillingDate,
      }));

    return NextResponse.json({
      mrr: totalMrr,
      totalOneTime,
      projectedAnnual: totalMrr * 12,
      totalClients: clients.length,
      clientsByStatus,
      byServiceType,
      topClients,
      upcomingRenewals,
      activeServices: services.filter(s => s.status === 'active').length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
