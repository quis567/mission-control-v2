import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { getPortalClientId } = await import('@/lib/portalSession');
    const clientId = await getPortalClientId(request);
    if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { clientId };
    if (status === 'open') where.status = { not: 'complete' };
    else if (status === 'complete') where.status = 'complete';

    const requests = await prisma.changeRequest.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      select: { id: true, changeType: true, pageLocation: true, details: true, priority: true, status: true, files: true, submittedAt: true, completedAt: true },
    });

    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
