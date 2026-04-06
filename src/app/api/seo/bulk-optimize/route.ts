import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic';
import prisma from '@/lib/db';
import { calculateSeoScore } from '@/lib/seo';

export async function POST(request: NextRequest) {
  try {
    const { websiteId } = await request.json();

    if (!websiteId) {
      return NextResponse.json({ error: 'websiteId required' }, { status: 400 });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      include: { client: true },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const pages = await prisma.seoPage.findMany({
      where: { websiteId },
      orderBy: { pageUrl: 'asc' },
    });

    if (pages.length === 0) {
      return NextResponse.json({ error: 'No pages found — run a crawl first' }, { status: 400 });
    }

    // Build a summary of all pages for the AI
    const pageSummaries = pages.map(p => ({
      id: p.id,
      url: p.pageUrl,
      title: p.pageTitle || 'No title',
      description: p.metaDescription || 'No description',
      h1: p.h1Tag || 'No H1',
      wordCount: p.wordCount || 0,
      currentKeyword: p.targetKeyword || '',
      seoScore: p.seoScore || 0,
    }));

    const prompt = `You are an SEO expert. Analyze ALL pages of this website and generate optimized SEO data for each one.

Business: ${website.client?.businessName || 'Unknown'}
Website: ${website.url}

Pages:
${pageSummaries.map((p, i) => `Page ${i + 1}: ${p.url}
   Title: ${p.title}
   Description: ${p.description}
   H1: ${p.h1}
   Current keyword: ${p.currentKeyword || 'none'}
   Score: ${p.seoScore}/100`).join('\n\n')}

For EACH page, generate:
- An optimized title tag (50-60 chars)
- An optimized meta description (150-160 chars)
- A target keyword (most relevant for ranking)

Make sure keywords are unique across pages to avoid cannibalization.
Consider local SEO and the business type.

Respond in this exact JSON format (use the page numbers 1, 2, 3... as shown above):
{"pages": [{"pageNumber": 1, "title": "optimized title", "description": "optimized description", "targetKeyword": "primary keyword"}]}

You MUST include an entry for EVERY page, numbered sequentially starting from 1.`;

    const result = await callClaude(
      'You are an SEO expert specializing in local service businesses. Respond with valid JSON only, no markdown.',
      prompt,
      4000
    );

    const parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim());

    // Apply all optimizations to the database
    const results: { pageId: string; url: string; changes: string[] }[] = [];

    for (const opt of parsed.pages) {
      // Match by pageNumber (1-indexed) back to our pages array
      const idx = (opt.pageNumber || 0) - 1;
      const existing = pages[idx];
      if (!existing) continue;

      const updates: any = {};
      const changes: { fieldChanged: string; oldValue: string | null; newValue: string | null }[] = [];
      const changeLabels: string[] = [];

      if (opt.title && opt.title !== existing.pageTitle) {
        updates.pageTitle = opt.title;
        updates.titleLength = opt.title.length;
        changes.push({ fieldChanged: 'pageTitle', oldValue: existing.pageTitle || '', newValue: opt.title });
        changeLabels.push('title');
      }

      if (opt.description && opt.description !== existing.metaDescription) {
        updates.metaDescription = opt.description;
        updates.metaDescLength = opt.description.length;
        changes.push({ fieldChanged: 'metaDescription', oldValue: existing.metaDescription || '', newValue: opt.description });
        changeLabels.push('description');
      }

      if (opt.targetKeyword && opt.targetKeyword !== existing.targetKeyword) {
        updates.targetKeyword = opt.targetKeyword;
        changes.push({ fieldChanged: 'targetKeyword', oldValue: existing.targetKeyword || '', newValue: opt.targetKeyword });
        changeLabels.push('keyword');
      }

      if (Object.keys(updates).length === 0) {
        results.push({ pageId: existing.id, url: existing.pageUrl, changes: ['No changes needed'] });
        continue;
      }

      // Recalculate score
      const merged = { ...existing, ...updates };
      updates.seoScore = calculateSeoScore(merged);
      updates.lastAudited = new Date();

      await prisma.seoPage.update({ where: { id: existing.id }, data: updates });

      // Log changes
      for (const change of changes) {
        await prisma.seoChange.create({
          data: { seoPageId: existing.id, ...change, changedBy: 'ai-bulk' },
        });
      }

      results.push({ pageId: existing.id, url: existing.pageUrl, changes: changeLabels });
    }

    return NextResponse.json({
      success: true,
      message: `Optimized ${results.filter(r => r.changes[0] !== 'No changes needed').length} of ${pages.length} pages`,
      results,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
