import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

function calculateSeoScore(page: any): number {
  let score = 100;
  if (!page.pageTitle) score -= 20; else if ((page.titleLength || 0) < 30 || (page.titleLength || 0) > 65) score -= 10;
  if (!page.metaDescription) score -= 20; else if ((page.metaDescLength || 0) < 120 || (page.metaDescLength || 0) > 160) score -= 10;
  if (!page.h1Tag) score -= 15; else if ((page.h1Count || 0) > 1) score -= 5;
  if ((page.imagesTotal || 0) > 0 && (page.imagesWithAlt || 0) < (page.imagesTotal || 0)) score -= 10;
  if ((page.wordCount || 0) < 300) score -= 10;
  if ((page.internalLinks || 0) < 2) score -= 5;
  return Math.max(0, Math.min(100, score));
}

export async function POST(req: NextRequest) {
  try {
    const { websiteId } = await req.json();
    if (!websiteId) return NextResponse.json({ error: 'websiteId required' }, { status: 400 });

    const website = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!website) return NextResponse.json({ error: 'Website not found' }, { status: 404 });

    const prompt = `You are an SEO auditor. Visit this website and analyze every page you can find by following internal links.

Website URL: ${website.url}

For each page you find, extract:
- pageUrl (full URL)
- pageTitle (the <title> tag content)
- titleLength (character count of title)
- metaDescription (the meta description content)
- metaDescLength (character count)
- h1Tag (the H1 text, or null if missing)
- h1Count (how many H1 tags on the page)
- headingStructure (JSON string counting H2, H3, H4 tags)
- imagesTotal (total number of images)
- imagesWithAlt (number of images with alt text)
- internalLinks (number of links to same domain)
- externalLinks (number of links to other domains)
- wordCount (approximate visible body text word count)

Analyze up to 20 pages. Start with the homepage, then follow internal navigation links.

Respond ONLY with a JSON array of page objects. No markdown, no code fences.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const textContent = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || '';

    let pages: any[] = [];
    try {
      const match = textContent.match(/\[[\s\S]*\]/);
      if (match) pages = JSON.parse(match[0]);
    } catch {
      return NextResponse.json({ error: 'Failed to parse crawl data', raw: textContent.substring(0, 500) }, { status: 500 });
    }

    let issuesFound = 0;
    const now = new Date();

    for (const page of pages) {
      const seoScore = calculateSeoScore(page);
      if (seoScore < 50) issuesFound++;

      const existing = await prisma.seoPage.findFirst({
        where: { websiteId, pageUrl: page.pageUrl },
      });

      const pageData = {
        pageTitle: page.pageTitle || null,
        titleLength: page.titleLength || (page.pageTitle?.length || null),
        metaDescription: page.metaDescription || null,
        metaDescLength: page.metaDescLength || (page.metaDescription?.length || null),
        h1Tag: page.h1Tag || null,
        h1Count: page.h1Count || null,
        headingStructure: typeof page.headingStructure === 'string' ? page.headingStructure : JSON.stringify(page.headingStructure || {}),
        imagesTotal: page.imagesTotal || 0,
        imagesWithAlt: page.imagesWithAlt || 0,
        internalLinks: page.internalLinks || 0,
        externalLinks: page.externalLinks || 0,
        wordCount: page.wordCount || 0,
        seoScore,
        lastAudited: now,
      };

      if (existing) {
        // Log changes
        const fields = ['pageTitle', 'metaDescription', 'h1Tag', 'seoScore'] as const;
        for (const field of fields) {
          const oldVal = String(existing[field] || '');
          const newVal = String(pageData[field] || '');
          if (oldVal !== newVal) {
            await prisma.seoChange.create({
              data: {
                seoPageId: existing.id,
                fieldChanged: field,
                oldValue: oldVal,
                newValue: newVal,
                changedBy: 'crawler',
              },
            });
          }
        }
        await prisma.seoPage.update({ where: { id: existing.id }, data: pageData });
      } else {
        await prisma.seoPage.create({
          data: { websiteId, pageUrl: page.pageUrl, ...pageData },
        });
      }
    }

    // Save crawl history
    await prisma.crawlHistory.create({
      data: { websiteId, pagesFound: pages.length, issuesFound },
    });

    return NextResponse.json({
      pagesFound: pages.length,
      issuesFound,
      message: `Crawl complete — ${pages.length} pages analyzed, ${issuesFound} issues found`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
