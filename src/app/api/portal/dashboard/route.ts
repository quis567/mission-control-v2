import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { getPortalClientId } = await import('@/lib/portalSession');
    const clientId = await getPortalClientId(request);
    if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true, businessName: true, contactName: true, slug: true,
        websites: { select: { url: true, status: true, lastUpdated: true, hostingProvider: true, cmsPlatform: true }, take: 1 },
        changeRequests: { orderBy: { submittedAt: 'desc' }, take: 10, select: { id: true, changeType: true, pageLocation: true, status: true, priority: true, submittedAt: true, completedAt: true } },
        _count: { select: { changeRequests: true } },
      },
    });

    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const openRequests = client.changeRequests.filter(r => r.status !== 'complete').length;
    const completedRequests = await prisma.changeRequest.count({ where: { clientId, status: 'complete' } });

    return NextResponse.json({
      businessName: client.businessName,
      contactName: client.contactName,
      slug: client.slug,
      website: client.websites[0] || null,
      openRequests,
      completedRequests,
      totalRequests: client._count.changeRequests,
      recentRequests: client.changeRequests,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
