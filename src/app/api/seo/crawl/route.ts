import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as cheerio from 'cheerio';

export const maxDuration = 300;

// ── Fetch helpers ──────────────��───────────────────────────────

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string; responseTime: number; statusCode: number; htmlSize: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const start = Date.now();
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MissionControlSEOBot/1.0)', 'Accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    const responseTime = Date.now() - start;
    clearTimeout(timeout);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;
    const html = await res.text();
    return { html, finalUrl: res.url, responseTime, statusCode: res.status, htmlSize: Buffer.byteLength(html, 'utf8') };
  } catch { return null; }
}

function discoverLinks(html: string, currentUrl: string, baseUrl: URL): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const linkUrl = new URL(href, currentUrl);
      if (linkUrl.hostname !== baseUrl.hostname) return;
      if (!linkUrl.protocol.startsWith('http')) return;
      if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|css|js|zip|mp4|mp3|ico|woff|woff2|ttf)$/i.test(linkUrl.pathname)) return;
      linkUrl.hash = '';
      linkUrl.search = '';
      const normalized = linkUrl.href.replace(/\/+$/, '') || linkUrl.origin;
      links.add(normalized);
    } catch { /* skip */ }
  });
  return Array.from(links);
}

// ── Detailed page analysis ─────────────────────────────���───────

function analyzePage(html: string, pageUrl: string, baseUrl: URL, responseTime: number, statusCode: number, htmlSize: number) {
  const $ = cheerio.load(html);
  const rawHtml = html;

  // --- Meta Data ---
  const title = $('title').first().text().trim() || null;
  const titleLength = title ? title.length : 0;
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || null;
  const metaDescLength = metaDesc ? metaDesc.length : 0;
  const metaKeywords = $('meta[name="keywords"]').attr('content')?.trim() || null;
  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || null;
  const language = $('html').attr('lang')?.trim() || null;
  const hasCharset = !!($('meta[charset]').length || rawHtml.match(/charset\s*=\s*["']?utf-8/i));
  const hasDoctype = /^<!doctype\s+html>/i.test(rawHtml.trim());
  const hasFavicon = !!($('link[rel="icon"]').length || $('link[rel="shortcut icon"]').length || $('link[rel="apple-touch-icon"]').length);
  const hasViewport = !!$('meta[name="viewport"]').length;
  const hasOgTags = !!($('meta[property="og:title"]').length && $('meta[property="og:description"]').length);
  const hasTwitterTags = !!($('meta[name="twitter:title"]').length || $('meta[property="twitter:title"]').length);
  const isHttps = pageUrl.startsWith('https');

  // OG/Twitter details for crawlData
  const ogTitle = $('meta[property="og:title"]').attr('content') || null;
  const ogDesc = $('meta[property="og:description"]').attr('content') || null;
  const ogImage = $('meta[property="og:image"]').attr('content') || null;
  const twitterTitle = $('meta[name="twitter:title"]').attr('content') || $('meta[property="twitter:title"]').attr('content') || null;
  const twitterDesc = $('meta[name="twitter:description"]').attr('content') || $('meta[property="twitter:description"]').attr('content') || null;

  // --- Headings ---
  const h1Elements = $('h1');
  const h1Tag = h1Elements.first().text().trim() || null;
  const h1Count = h1Elements.length;
  const headings: { tag: string; text: string }[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    headings.push({ tag: $(el).prop('tagName')?.toLowerCase() || '', text: $(el).text().trim() });
  });
  const headingStructure: Record<string, number> = {};
  for (const h of headings) { headingStructure[h.tag] = (headingStructure[h.tag] || 0) + 1; }

  // Check heading hierarchy
  let headingHierarchyOk = true;
  const levels = headings.map(h => parseInt(h.tag.replace('h', '')));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) { headingHierarchyOk = false; break; }
  }

  // --- Content ---
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
  const paragraphs = $('p').filter((_, el) => $(el).text().trim().length > 20);
  const paragraphCount = paragraphs.length;
  const hasStrongTags = !!($('strong').length || $('b').length);

  // --- Images ---
  const images = $('img');
  const imagesTotal = images.length;
  let imagesWithAlt = 0;
  images.each((_, el) => { if ($(el).attr('alt')?.trim()) imagesWithAlt++; });

  // --- Links ---
  let internalLinks = 0;
  let externalLinks = 0;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const linkUrl = new URL(href, pageUrl);
      if (linkUrl.hostname === baseUrl.hostname) internalLinks++;
      else if (linkUrl.protocol.startsWith('http')) externalLinks++;
    } catch {
      if (!href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) internalLinks++;
    }
  });

  // --- Iframes ---
  const hasIframes = !!$('iframe').length;

  // ── Score Calculation (Part D) ──

  // Meta Data (25 points → normalized to 0-100)
  let metaRaw = 0;
  if (title) metaRaw += 3;
  if (titleLength >= 30 && titleLength <= 60) metaRaw += 3;
  if (metaDesc) metaRaw += 3;
  if (metaDescLength >= 120 && metaDescLength <= 160) metaRaw += 3;
  if (canonicalUrl) metaRaw += 2;
  if (language) metaRaw += 2;
  if (hasViewport) metaRaw += 2;
  if (hasFavicon) metaRaw += 1;
  if (hasOgTags) metaRaw += 2;
  if (hasCharset) metaRaw += 2;
  if (hasDoctype) metaRaw += 2;
  const metaScore = Math.round((metaRaw / 25) * 100);

  // Page Quality (30 points → 0-100)
  let qualityRaw = 0;
  if (wordCount >= 300) qualityRaw += 5;
  if (title && h1Tag && bodyText.toLowerCase().includes((title.split(/[|\-–—]/)[0] || '').trim().toLowerCase().slice(0, 20))) qualityRaw += 4;
  if (title && h1Tag && h1Tag.toLowerCase().includes((title.split(/[|\-–—]/)[0] || '').trim().toLowerCase().slice(0, 20))) qualityRaw += 3;
  if (imagesTotal === 0 || imagesWithAlt === imagesTotal) qualityRaw += 5;
  if (paragraphCount >= 3) qualityRaw += 3;
  qualityRaw += 3; // assume no placeholder
  if (hasStrongTags) qualityRaw += 2;
  qualityRaw += 2; // sentence length check (generous)
  qualityRaw += 2; // social elements (generous)
  const qualityScore = Math.round((qualityRaw / 30) * 100);

  // Page Structure (15 points → 0-100)
  let structureRaw = 0;
  if (h1Count === 1) structureRaw += 5;
  if ((headingStructure['h2'] || 0) > 0) structureRaw += 4;
  if (headingHierarchyOk) structureRaw += 3;
  if (!hasIframes) structureRaw += 3;
  const structureScore = Math.round((structureRaw / 15) * 100);

  // Link Structure (15 points → 0-100)
  let linkRaw = 0;
  if (internalLinks > 0) linkRaw += 4;
  if (externalLinks > 0) linkRaw += 3;
  linkRaw += 4; // anchor text quality (generous)
  linkRaw += 2; // no duplicate anchors (generous)
  linkRaw += 2; // reasonable link text (generous)
  const linkScore = Math.round((linkRaw / 15) * 100);

  // Server/Technical (15 points → 0-100)
  let serverRaw = 0;
  if (isHttps) serverRaw += 4;
  if (responseTime < 400) serverRaw += 3;
  if (htmlSize < 100000) serverRaw += 3;
  serverRaw += 3; // no redirects (generous)
  serverRaw += 2; // compression (generous)
  const serverScore = Math.round((serverRaw / 15) * 100);

  // Weighted overall
  const seoScore = Math.round(metaScore * 0.25 + qualityScore * 0.30 + structureScore * 0.15 + linkScore * 0.15 + serverScore * 0.15);

  // ── Build issues list ──

  const issues: { issue: string; importance: string; category: string; fixable?: string }[] = [];

  // Meta issues
  if (!title) issues.push({ issue: 'Page has no title tag', importance: 'critical', category: 'meta' });
  else if (titleLength < 30) issues.push({ issue: `Title is too short (${titleLength} chars, recommend 30-60)`, importance: 'important', category: 'meta' });
  else if (titleLength > 60) issues.push({ issue: `Title is too long (${titleLength} chars, recommend 30-60)`, importance: 'important', category: 'meta' });
  if (!metaDesc) issues.push({ issue: 'No meta description', importance: 'critical', category: 'meta', fixable: 'meta' });
  else if (metaDescLength < 120) issues.push({ issue: `Meta description too short (${metaDescLength} chars, recommend 120-160)`, importance: 'important', category: 'meta', fixable: 'meta' });
  else if (metaDescLength > 160) issues.push({ issue: `Meta description too long (${metaDescLength} chars, recommend 120-160)`, importance: 'important', category: 'meta', fixable: 'meta' });
  if (!canonicalUrl) issues.push({ issue: 'No canonical link tag', importance: 'tip', category: 'meta' });
  if (!language) issues.push({ issue: 'No lang attribute on HTML tag', importance: 'important', category: 'meta' });
  if (!hasFavicon) issues.push({ issue: 'No favicon found', importance: 'tip', category: 'meta' });
  if (!hasOgTags) issues.push({ issue: 'Missing Open Graph meta tags', importance: 'important', category: 'meta' });
  if (!hasTwitterTags) issues.push({ issue: 'Missing Twitter Card meta tags', importance: 'tip', category: 'meta' });
  if (!hasCharset) issues.push({ issue: 'No charset encoding declared', importance: 'important', category: 'meta' });
  if (!hasDoctype) issues.push({ issue: 'No HTML5 doctype declared', importance: 'important', category: 'meta' });

  // Quality issues
  if (wordCount < 300) issues.push({ issue: `Low word count (${wordCount} words, recommend 300+)`, importance: 'important', category: 'quality' });
  if (imagesTotal > 0 && imagesWithAlt < imagesTotal) issues.push({ issue: `${imagesTotal - imagesWithAlt} of ${imagesTotal} images missing alt text`, importance: 'important', category: 'quality' });
  if (!hasViewport) issues.push({ issue: 'No viewport meta tag (mobile unfriendly)', importance: 'critical', category: 'quality' });

  // Structure issues
  if (h1Count === 0) issues.push({ issue: 'No H1 heading found', importance: 'critical', category: 'structure' });
  else if (h1Count > 1) issues.push({ issue: `Multiple H1 tags found (${h1Count})`, importance: 'important', category: 'structure' });
  if (!headingHierarchyOk) issues.push({ issue: 'Heading hierarchy skips levels', importance: 'tip', category: 'structure' });

  // Link issues
  if (externalLinks === 0) issues.push({ issue: 'No external links (Google values outbound links)', importance: 'tip', category: 'links' });
  if (internalLinks < 2) issues.push({ issue: `Only ${internalLinks} internal links`, importance: 'important', category: 'links' });

  // Server issues
  if (!isHttps) issues.push({ issue: 'Page not served over HTTPS', importance: 'critical', category: 'server' });
  if (responseTime >= 400) issues.push({ issue: `Slow response time (${responseTime}ms, target <400ms)`, importance: 'important', category: 'server' });
  if (htmlSize >= 100000) issues.push({ issue: `Large HTML file (${Math.round(htmlSize / 1024)}KB, target <100KB)`, importance: 'tip', category: 'server' });

  // crawlData: store detailed check info as JSON
  const crawlData = {
    ogTitle, ogDesc, ogImage, twitterTitle, twitterDesc,
    headings, headingHierarchyOk, hasIframes, hasStrongTags,
  };

  return {
    pageTitle: title, titleLength, metaDescription: metaDesc, metaDescLength,
    metaKeywords, canonicalUrl, language,
    h1Tag, h1Count, headingStructure: JSON.stringify(headingStructure),
    imagesTotal, imagesWithAlt, internalLinks, externalLinks,
    wordCount, paragraphCount, hasViewport, hasFavicon, hasOgTags, hasTwitterTags,
    hasCharset, hasDoctype, isHttps, responseTime, htmlSize, statusCode,
    crawlData: JSON.stringify(crawlData),
    seoScore, metaScore, qualityScore, structureScore, linkScore, serverScore,
    issues: JSON.stringify(issues),
  };
}

// ── POST /api/seo/crawl ────────────────────��────────────────────
// Full site crawl: discover + analyze all pages
export async function POST(req: NextRequest) {
  try {
    const { websiteId } = await req.json();
    if (!websiteId) return NextResponse.json({ error: 'websiteId required' }, { status: 400 });

    const website = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!website || !website.url) return NextResponse.json({ error: 'Website not found or no URL' }, { status: 404 });

    const initialUrl = website.url.startsWith('http') ? website.url : `https://${website.url}`;
    const now = new Date();

    const homepageResult = await fetchPage(initialUrl);
    if (!homepageResult) return NextResponse.json({ error: `Could not fetch homepage: ${initialUrl}` }, { status: 502 });

    // Use the final redirected URL as the base (handles www redirects, etc.)
    const baseUrl = new URL(homepageResult.finalUrl);
    const homepageUrl = baseUrl.href.replace(/\/+$/, '') || baseUrl.origin;

    const discoveredUrls = new Set<string>([homepageUrl]);
    const linksFromHomepage = discoverLinks(homepageResult.html, homepageUrl, baseUrl);
    linksFromHomepage.forEach(u => discoveredUrls.add(u));

    const maxPages = 50;
    const toCrawl = Array.from(discoveredUrls).slice(0, maxPages);
    const crawledPages: any[] = [];
    let issuesFound = 0;

    for (const url of toCrawl) {
      const result = url === homepageUrl ? homepageResult : await fetchPage(url);
      if (!result) continue;

      // Use the final URL after redirects for link discovery
      const effectiveUrl = result.finalUrl || url;
      const effectiveBase = new URL(effectiveUrl);

      if (discoveredUrls.size < maxPages) {
        const moreLinks = discoverLinks(result.html, effectiveUrl, baseUrl);
        for (const link of moreLinks) {
          if (discoveredUrls.size >= maxPages) break;
          if (!discoveredUrls.has(link)) { discoveredUrls.add(link); toCrawl.push(link); }
        }
      }

      const data = analyzePage(result.html, effectiveUrl, baseUrl, result.responseTime, result.statusCode, result.htmlSize);
      if (data.seoScore < 50) issuesFound++;

      const storeUrl = effectiveUrl;
      const existing = await prisma.seoPage.findFirst({ where: { websiteId, pageUrl: storeUrl } });
      if (existing) {
        await prisma.seoPage.update({ where: { id: existing.id }, data: { ...data, lastAudited: now } });
      } else {
        await prisma.seoPage.create({ data: { websiteId, pageUrl: storeUrl, ...data, lastAudited: now } });
      }
      crawledPages.push({ pageUrl: storeUrl, ...data });
    }

    await prisma.crawlHistory.create({ data: { websiteId, pagesFound: crawledPages.length, issuesFound } });

    return NextResponse.json({
      pagesFound: crawledPages.length, issuesFound, pages: crawledPages,
      message: `Crawl complete — ${crawledPages.length} pages analyzed, ${issuesFound} issues found`,
    });
  } catch (error) {
    return NextResponse.json({ error: `Crawl error: ${String(error)}` }, { status: 500 });
  }
}
