import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as cheerio from 'cheerio';

export const maxDuration = 300;

function calculateSeoScore(page: {
  pageTitle: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescLength: number;
  h1Tag: string | null;
  h1Count: number;
  imagesTotal: number;
  imagesWithAlt: number;
  wordCount: number;
  internalLinks: number;
}): number {
  let score = 100;
  if (!page.pageTitle) score -= 20;
  else if (page.titleLength < 30 || page.titleLength > 65) score -= 10;
  if (!page.metaDescription) score -= 20;
  else if (page.metaDescLength < 120 || page.metaDescLength > 160) score -= 10;
  if (!page.h1Tag) score -= 15;
  else if (page.h1Count > 1) score -= 5;
  if (page.imagesTotal > 0 && page.imagesWithAlt < page.imagesTotal) score -= 10;
  if (page.wordCount < 300) score -= 10;
  if (page.internalLinks < 2) score -= 5;
  return Math.max(0, Math.min(100, score));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MissionControlSEOBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractPageData(html: string, pageUrl: string, baseUrl: URL) {
  const $ = cheerio.load(html);

  // Remove script/style tags for text extraction
  $('script, style, noscript').remove();

  const title = $('title').first().text().trim() || null;
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || null;
  const h1Elements = $('h1');
  const h1Tag = h1Elements.first().text().trim() || null;
  const h1Count = h1Elements.length;

  // Heading structure
  const headingStructure: Record<string, number> = {};
  for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    const count = $(tag).length;
    if (count > 0) headingStructure[tag] = count;
  }

  // Images
  const images = $('img');
  const imagesTotal = images.length;
  let imagesWithAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt && alt.trim().length > 0) imagesWithAlt++;
  });

  // Links
  let internalLinks = 0;
  let externalLinks = 0;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const linkUrl = new URL(href, pageUrl);
      if (linkUrl.hostname === baseUrl.hostname) {
        internalLinks++;
      } else if (linkUrl.protocol.startsWith('http')) {
        externalLinks++;
      }
    } catch {
      // relative link counts as internal
      if (!href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
        internalLinks++;
      }
    }
  });

  // Word count from visible text
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  const titleLength = title ? title.length : 0;
  const metaDescLength = metaDesc ? metaDesc.length : 0;

  return {
    pageTitle: title,
    titleLength,
    metaDescription: metaDesc,
    metaDescLength,
    h1Tag,
    h1Count,
    headingStructure: JSON.stringify(headingStructure),
    imagesTotal,
    imagesWithAlt,
    internalLinks,
    externalLinks,
    wordCount,
    seoScore: calculateSeoScore({
      pageTitle: title,
      titleLength,
      metaDescription: metaDesc,
      metaDescLength,
      h1Tag,
      h1Count,
      imagesTotal,
      imagesWithAlt,
      wordCount,
      internalLinks,
    }),
  };
}

function discoverLinks(html: string, currentUrl: string, baseUrl: URL): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const linkUrl = new URL(href, currentUrl);
      // Same domain only, no anchors, no query params for dedup
      if (linkUrl.hostname !== baseUrl.hostname) return;
      if (!linkUrl.protocol.startsWith('http')) return;
      // Skip common non-page extensions
      const path = linkUrl.pathname.toLowerCase();
      if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|css|js|zip|mp4|mp3)$/.test(path)) return;
      // Normalize: remove trailing slash, strip hash/query for dedup
      linkUrl.hash = '';
      linkUrl.search = '';
      const normalized = linkUrl.href.replace(/\/+$/, '') || linkUrl.origin;
      links.add(normalized);
    } catch {
      // skip invalid URLs
    }
  });

  return Array.from(links);
}

// POST /api/seo/crawl — Two modes:
// { websiteId } → full crawl: discover + crawl all pages
// { websiteId, pageUrl } → single page crawl
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteId, pageUrl: singlePageUrl } = body;
    if (!websiteId) return NextResponse.json({ error: 'websiteId required' }, { status: 400 });

    const website = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!website || !website.url) return NextResponse.json({ error: 'Website not found or no URL' }, { status: 404 });

    const baseUrl = new URL(website.url.startsWith('http') ? website.url : `https://${website.url}`);
    const now = new Date();

    // Single page mode
    if (singlePageUrl) {
      const html = await fetchPage(singlePageUrl);
      if (!html) return NextResponse.json({ error: `Could not fetch ${singlePageUrl}` }, { status: 502 });

      const data = extractPageData(html, singlePageUrl, baseUrl);
      const existing = await prisma.seoPage.findFirst({ where: { websiteId, pageUrl: singlePageUrl } });

      if (existing) {
        const fields = ['pageTitle', 'metaDescription', 'h1Tag', 'seoScore'] as const;
        for (const field of fields) {
          const oldVal = String(existing[field] || '');
          const newVal = String(data[field] || '');
          if (oldVal !== newVal) {
            await prisma.seoChange.create({
              data: { seoPageId: existing.id, fieldChanged: field, oldValue: oldVal, newValue: newVal, changedBy: 'crawler' },
            });
          }
        }
        await prisma.seoPage.update({ where: { id: existing.id }, data: { ...data, lastAudited: now } });
      } else {
        await prisma.seoPage.create({ data: { websiteId, pageUrl: singlePageUrl, ...data, lastAudited: now } });
      }

      return NextResponse.json({ success: true, page: { pageUrl: singlePageUrl, ...data } });
    }

    // Full crawl mode — discover all pages then crawl each
    const homepageUrl = baseUrl.href.replace(/\/+$/, '') || baseUrl.origin;
    const homepageHtml = await fetchPage(homepageUrl);
    if (!homepageHtml) {
      return NextResponse.json({ error: `Could not fetch homepage: ${homepageUrl}` }, { status: 502 });
    }

    // Discover all internal links from homepage
    const discoveredUrls = new Set<string>([homepageUrl]);
    const linksFromHomepage = discoverLinks(homepageHtml, homepageUrl, baseUrl);
    linksFromHomepage.forEach(u => discoveredUrls.add(u));

    // Crawl discovered pages (limit to 50) and discover more links from each
    const maxPages = 50;
    const toCrawl = Array.from(discoveredUrls).slice(0, maxPages);
    const crawledPages: any[] = [];
    let issuesFound = 0;

    for (const url of toCrawl) {
      const html = url === homepageUrl ? homepageHtml : await fetchPage(url);
      if (!html) continue;

      // Discover more links from this page (breadth)
      if (discoveredUrls.size < maxPages) {
        const moreLinks = discoverLinks(html, url, baseUrl);
        for (const link of moreLinks) {
          if (discoveredUrls.size >= maxPages) break;
          if (!discoveredUrls.has(link)) {
            discoveredUrls.add(link);
            toCrawl.push(link);
          }
        }
      }

      const data = extractPageData(html, url, baseUrl);
      if (data.seoScore < 50) issuesFound++;

      // Upsert into database
      const existing = await prisma.seoPage.findFirst({ where: { websiteId, pageUrl: url } });
      if (existing) {
        const fields = ['pageTitle', 'metaDescription', 'h1Tag', 'seoScore'] as const;
        for (const field of fields) {
          const oldVal = String(existing[field] || '');
          const newVal = String(data[field] || '');
          if (oldVal !== newVal) {
            await prisma.seoChange.create({
              data: { seoPageId: existing.id, fieldChanged: field, oldValue: oldVal, newValue: newVal, changedBy: 'crawler' },
            });
          }
        }
        await prisma.seoPage.update({ where: { id: existing.id }, data: { ...data, lastAudited: now } });
      } else {
        await prisma.seoPage.create({ data: { websiteId, pageUrl: url, ...data, lastAudited: now } });
      }

      crawledPages.push({ pageUrl: url, ...data });
    }

    // Save crawl history
    await prisma.crawlHistory.create({
      data: { websiteId, pagesFound: crawledPages.length, issuesFound },
    });

    return NextResponse.json({
      pagesFound: crawledPages.length,
      issuesFound,
      pages: crawledPages,
      message: `Crawl complete — ${crawledPages.length} pages analyzed, ${issuesFound} issues found`,
    });
  } catch (error) {
    return NextResponse.json({ error: `Crawl error: ${String(error)}` }, { status: 500 });
  }
}
