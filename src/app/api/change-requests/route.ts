import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const clientId = searchParams.get('clientId');
    const sortBy = searchParams.get('sortBy') || 'submittedAt';
    const sortDir = searchParams.get('sortDir') || 'desc';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (clientId) where.clientId = clientId;

    const requests = await prisma.changeRequest.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      include: {
        client: {
          select: {
            id: true,
            businessName: true,
            contactName: true,
            email: true,
            slug: true,
            websites: { select: { url: true }, take: 1 },
          },
        },
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
