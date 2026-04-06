import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const website = await prisma.website.findUnique({
      where: { id },
      include: {
        client: { select: { businessName: true } },
        seoPages: { orderBy: { pageUrl: 'asc' } },
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json(website);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    const stringFields = ['url', 'status', 'hostingProvider', 'domainRegistrar', 'sslStatus', 'cmsPlatform', 'gaPropertyId', 'maintenanceDetails', 'notes', 'screenshotUrl', 'netlifySiteId', 'githubRepoUrl'];
    const boolFields = ['gaConnected', 'gscConnected', 'maintenancePlan'];
    const dateFields = ['domainExpiration', 'launchDate', 'lastUpdated', 'screenshotUpdatedAt'];

    for (const f of stringFields) { if (f in body) data[f] = body[f]; }
    for (const f of boolFields) { if (f in body) data[f] = !!body[f]; }
    for (const f of dateFields) { if (f in body) data[f] = body[f] ? new Date(body[f]) : null; }

    const website = await prisma.website.update({ where: { id }, data });
    return NextResponse.json(website);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
