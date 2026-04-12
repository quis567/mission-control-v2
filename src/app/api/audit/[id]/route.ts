import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/audit/[id] — fetch audit detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const audit = await prisma.auditSubmission.findUnique({ where: { id } });
  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...audit,
    results: audit.results ? JSON.parse(audit.results) : null,
  });
}

// PATCH /api/audit/[id] — update email draft
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { emailSubject, emailBody } = body;

  const audit = await prisma.auditSubmission.update({
    where: { id },
    data: {
      ...(emailSubject !== undefined && { emailSubject }),
      ...(emailBody !== undefined && { emailBody }),
    },
  });

  return NextResponse.json({ ok: true, audit });
}
