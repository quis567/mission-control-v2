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
        businessName: true,
        websites: {
          select: { url: true, status: true, hostingProvider: true, cmsPlatform: true, domainRegistrar: true, domainExpiration: true, launchDate: true, lastUpdated: true, maintenancePlan: true, maintenanceDetails: true },
          take: 1,
        },
        services: { where: { status: 'active' }, select: { serviceType: true, price: true, billingType: true, nextBillingDate: true }, orderBy: { createdAt: 'desc' } },
        package: { select: { name: true, price: true } },
      },
    });

    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      businessName: client.businessName,
      website: client.websites[0] || null,
      services: client.services,
      package: client.package,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
