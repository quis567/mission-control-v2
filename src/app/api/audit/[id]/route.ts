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

// PATCH /api/audit/[id] — update email draft and/or design override
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { emailSubject, emailBody, designOverride } = body;

  // Handle design score override
  if (designOverride !== undefined) {
    const existing = await prisma.auditSubmission.findUnique({ where: { id } });
    if (!existing || !existing.results) {
      return NextResponse.json({ error: 'Audit not found or has no results' }, { status: 404 });
    }

    const results = JSON.parse(existing.results);
    if (results.categoryScores) {
      const overrideScore = Math.max(0, Math.min(100, Number(designOverride)));
      results.categoryScores.designElements.score = overrideScore;
      // Recalculate overall
      const cats = results.categoryScores;
      cats.overall = Math.round(
        (cats.designElements.score + cats.messagingHeadlines.score + cats.seoFoundation.score +
         cats.conversionElements.score + cats.mobileExperience.score + cats.contentStructure.score) / 6
      );

      await prisma.auditSubmission.update({
        where: { id },
        data: { results: JSON.stringify(results) },
      });

      return NextResponse.json({ ok: true });
    }
  }

  const audit = await prisma.auditSubmission.update({
    where: { id },
    data: {
      ...(emailSubject !== undefined && { emailSubject }),
      ...(emailBody !== undefined && { emailBody }),
    },
  });

  return NextResponse.json({ ok: true, audit });
}
