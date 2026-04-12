import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/audit — list all audit submissions
export async function GET() {
  const audits = await prisma.auditSubmission.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    audits.map(a => ({
      ...a,
      results: a.results ? JSON.parse(a.results) : null,
    }))
  );
}
