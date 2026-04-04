import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { callClaude } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    const { websiteId } = await request.json();

    const pages = await prisma.seoPage.findMany({
      where: { websiteId },
      orderBy: { pageUrl: 'asc' },
    });

    if (pages.length === 0) {
      return NextResponse.json({ error: 'No pages to audit' }, { status: 400 });
    }

    const pageSummary = pages.map(p => ({
      url: p.pageUrl,
      title: p.pageTitle || 'MISSING',
      titleLength: p.titleLength,
      metaDescription: p.metaDescription ? `${p.metaDescription.substring(0, 60)}...` : 'MISSING',
      metaDescLength: p.metaDescLength,
      h1: p.h1Tag || 'MISSING',
      h1Count: p.h1Count,
      wordCount: p.wordCount,
      imagesTotal: p.imagesTotal,
      imagesWithAlt: p.imagesWithAlt,
      internalLinks: p.internalLinks,
      externalLinks: p.externalLinks,
      seoScore: p.seoScore,
      targetKeyword: p.targetKeyword || 'none set',
    }));

    const result = await callClaude(
      'You are an SEO auditor for local service business websites. Respond with valid JSON only, no markdown.',
      `Perform a full SEO audit on this website's pages. Identify issues and prioritize them.

Pages data:
${JSON.stringify(pageSummary, null, 2)}

Respond in this exact JSON format:
{
  "overallScore": 65,
  "summary": "Brief 1-2 sentence summary",
  "issues": [
    {
      "severity": "critical",
      "page": "/page-url",
      "issue": "Description of the issue",
      "recommendation": "How to fix it"
    }
  ],
  "strengths": ["Things done well"],
  "priorityActions": ["Top 3 things to fix first"]
}

Severity levels: critical, important, minor.`,
      3000
    );

    const parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim());
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
