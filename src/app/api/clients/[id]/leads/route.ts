import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Admin view of lead submissions for a client.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') || '100'), 500);

  const [submissions, totalCount] = await Promise.all([
    prisma.leadSubmission.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.leadSubmission.count({ where: { clientId: id } }),
  ]);

  return NextResponse.json({ submissions, totalCount });
}
