import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const websites = await prisma.website.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { businessName: true } },
        seoPages: { select: { seoScore: true }, orderBy: { seoScore: 'asc' } },
      },
    });

    return NextResponse.json(websites);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const website = await prisma.website.create({
      data: {
        clientId: body.clientId,
        url: body.url,
        status: body.status || 'development',
        hostingProvider: body.hostingProvider || null,
        domainRegistrar: body.domainRegistrar || null,
        domainExpiration: body.domainExpiration ? new Date(body.domainExpiration) : null,
        sslStatus: body.sslStatus || null,
        cmsPlatform: body.cmsPlatform || null,
        launchDate: body.launchDate ? new Date(body.launchDate) : null,
        gaConnected: body.gaConnected || false,
        gaPropertyId: body.gaPropertyId || null,
        gscConnected: body.gscConnected || false,
        maintenancePlan: body.maintenancePlan || false,
        notes: body.notes || null,
        netlifySiteId: body.netlifySiteId || null,
        githubRepoUrl: body.githubRepoUrl || null,
      },
    });

    return NextResponse.json(website, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
