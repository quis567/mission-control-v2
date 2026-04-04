import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateSeoScore } from '@/lib/seo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pages = await prisma.seoPage.findMany({
      where: { websiteId: id },
      orderBy: { pageUrl: 'asc' },
    });
    return NextResponse.json(pages);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const titleLength = body.pageTitle?.length || null;
    const metaDescLength = body.metaDescription?.length || null;

    const pageData = {
      pageTitle: body.pageTitle || null,
      titleLength,
      metaDescription: body.metaDescription || null,
      metaDescLength,
      h1Tag: body.h1Tag || null,
      h1Count: body.h1Count ?? null,
      headingStructure: body.headingStructure || null,
      imagesTotal: body.imagesTotal ?? null,
      imagesWithAlt: body.imagesWithAlt ?? null,
      internalLinks: body.internalLinks ?? null,
      externalLinks: body.externalLinks ?? null,
      wordCount: body.wordCount ?? null,
      targetKeyword: body.targetKeyword || null,
      keywordDensity: body.keywordDensity ?? null,
    };

    const seoScore = calculateSeoScore(pageData);

    const page = await prisma.seoPage.create({
      data: {
        websiteId: id,
        pageUrl: body.pageUrl,
        ...pageData,
        seoScore,
        lastAudited: new Date(),
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // websiteId not needed for PATCH — we use seoPageId from body
    const body = await request.json();
    const { seoPageId, ...fields } = body;

    if (!seoPageId) {
      return NextResponse.json({ error: 'seoPageId required' }, { status: 400 });
    }

    const existing = await prisma.seoPage.findUnique({ where: { id: seoPageId } });
    if (!existing) {
      return NextResponse.json({ error: 'SEO page not found' }, { status: 404 });
    }

    // Track changes
    const changes: { fieldChanged: string; oldValue: string | null; newValue: string | null }[] = [];
    const trackFields = ['pageTitle', 'metaDescription', 'h1Tag', 'targetKeyword'];
    for (const f of trackFields) {
      if (f in fields && fields[f] !== (existing as any)[f]) {
        changes.push({
          fieldChanged: f,
          oldValue: String((existing as any)[f] || ''),
          newValue: String(fields[f] || ''),
        });
      }
    }

    if (fields.pageTitle !== undefined) fields.titleLength = fields.pageTitle?.length || null;
    if (fields.metaDescription !== undefined) fields.metaDescLength = fields.metaDescription?.length || null;

    // Recalculate score
    const merged = { ...existing, ...fields };
    fields.seoScore = calculateSeoScore(merged);
    fields.lastAudited = new Date();

    const updated = await prisma.seoPage.update({ where: { id: seoPageId }, data: fields });

    // Save change history
    for (const change of changes) {
      await prisma.seoChange.create({
        data: { seoPageId, ...change, changedBy: body.changedBy || 'user' },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
