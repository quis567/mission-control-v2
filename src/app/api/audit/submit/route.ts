import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// --------------- CORS ---------------
const ALLOWED_ORIGINS = [
  'https://truepathstudios.com',
  'https://www.truepathstudios.com',
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// --------------- Rate limiting (in-memory) ---------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// --------------- SSRF protection ---------------
function isSafeUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) return false;
    return true;
  } catch {
    return false;
  }
}

// --------------- Validation ---------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

// --------------- PageSpeed API ---------------
interface PageSpeedResult {
  score: number | null;
  loadTime: number | null;
  tapTargets: number | null;
  fontLegibility: number | null;
  contentWidth: number | null;
}

async function getPageSpeedScores(url: string) {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;

  async function fetchStrategy(strategy: 'mobile' | 'desktop'): Promise<PageSpeedResult> {
    const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    endpoint.searchParams.set('url', url);
    endpoint.searchParams.set('strategy', strategy);
    endpoint.searchParams.append('category', 'performance');
    if (key) endpoint.searchParams.set('key', key);

    try {
      const res = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(60000) });
      if (!res.ok) return { score: null, loadTime: null, tapTargets: null, fontLegibility: null, contentWidth: null };
      const data = await res.json();
      const audits = data?.lighthouseResult?.audits;
      const score = data?.lighthouseResult?.categories?.performance?.score;
      const fcp = audits?.['first-contentful-paint']?.numericValue;

      // Extract mobile-specific audit scores
      const tapTargetAudit = audits?.['tap-targets'];
      const fontSizeAudit = audits?.['font-size'];
      const contentWidthAudit = audits?.['content-width'];

      return {
        score: typeof score === 'number' ? Math.round(score * 100) : null,
        loadTime: typeof fcp === 'number' ? Math.round(fcp / 100) / 10 : null,
        tapTargets: tapTargetAudit?.score != null ? Math.round(tapTargetAudit.score * 100) : null,
        fontLegibility: fontSizeAudit?.score != null ? Math.round(fontSizeAudit.score * 100) : null,
        contentWidth: contentWidthAudit?.score != null ? Math.round(contentWidthAudit.score * 100) : null,
      };
    } catch {
      return { score: null, loadTime: null, tapTargets: null, fontLegibility: null, contentWidth: null };
    }
  }

  const [mobile, desktop] = await Promise.all([
    fetchStrategy('mobile'),
    fetchStrategy('desktop'),
  ]);

  return { mobile, desktop };
}

// --------------- HTML scraping (expanded) ---------------
interface ScrapedData {
  // Existing
  hasMetaTitle: boolean;
  metaTitleLength: number;
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
  mobileFriendly: boolean;
  imageAltTags: { total: number; withAlt: number };
  // Design Elements
  hasFavicon: boolean;
  fontCount: number;
  modernImageFormats: number;
  totalImages: number;
  inlineColorCount: number;
  // Messaging & Headlines
  h1Count: number;
  h1Length: number;
  h2Count: number;
  h3Count: number;
  ctaCount: number;
  bodyPreviewLength: number;
  // SEO Foundation
  hasCanonical: boolean;
  hasStructuredData: boolean;
  hasOpenGraph: boolean;
  headingHierarchyValid: boolean;
  // Conversion Elements
  formCount: number;
  hasPhoneLink: boolean;
  hasEmailLink: boolean;
  hasTrustSignals: boolean;
  socialLinkCount: number;
  // Content Structure
  textToHtmlRatio: number;
  wordCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  listCount: number;
  paragraphCount: number;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function scrapeHtml(url: string): Promise<ScrapedData | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'TruePathAuditBot/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const htmlLower = html.toLowerCase();

    // --- Meta title ---
    const metaTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaTitle = metaTitleMatch ? metaTitleMatch[1].trim() : '';

    // --- Meta description ---
    const metaDescMatch = html.match(/<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta\s[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

    // --- Viewport ---
    const hasViewport = !!html.match(/<meta\s[^>]*name=["']viewport["']/i);

    // --- Images & alt tags ---
    const imgMatches = html.match(/<img\s[^>]*>/gi) || [];
    const totalImages = imgMatches.length;
    const imagesWithAlt = imgMatches.filter(tag => /\balt=["'][^"']+["']/i.test(tag)).length;
    const modernFormats = imgMatches.filter(tag => /\.(webp|avif)/i.test(tag) || /type=["']image\/(webp|avif)["']/i.test(tag)).length;

    // --- Favicon ---
    const hasFavicon = !!(
      html.match(/<link\s[^>]*rel=["'](icon|shortcut icon|apple-touch-icon)["'][^>]*>/i)
    );

    // --- Fonts ---
    const googleFontMatches = html.match(/fonts\.googleapis\.com\/css/gi) || [];
    const fontFaceMatches = html.match(/@font-face/gi) || [];
    const fontCount = googleFontMatches.length + fontFaceMatches.length;

    // --- Inline colors ---
    const colorMatches = html.match(/(?:color|background-color|background)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/gi) || [];
    const uniqueColors = new Set(colorMatches.map(c => c.toLowerCase()));
    const inlineColorCount = uniqueColors.size;

    // --- Headings ---
    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    const h1Count = h1Matches.length;
    const h1Text = h1Matches.length > 0 ? stripHtmlTags(h1Matches[0]!) : '';
    const h2Matches = html.match(/<h2[^>]*>/gi) || [];
    const h3Matches = html.match(/<h3[^>]*>/gi) || [];

    // --- Heading hierarchy ---
    const headingOrder: number[] = [];
    const headingRegex = /<h([1-6])[^>]*>/gi;
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html)) !== null) {
      headingOrder.push(parseInt(headingMatch[1]));
    }
    let hierarchyValid = headingOrder.length > 0 && headingOrder[0] === 1;
    for (let i = 1; i < headingOrder.length && hierarchyValid; i++) {
      if (headingOrder[i] > headingOrder[i - 1] + 1) hierarchyValid = false;
    }

    // --- CTAs ---
    const ctaWords = /\b(get|start|call|contact|buy|schedule|book|sign up|free|try|learn more|request|download|subscribe|join|order|shop|register)\b/i;
    const buttonMatches = html.match(/<button[^>]*>[\s\S]*?<\/button>/gi) || [];
    const linkMatches = html.match(/<a\s[^>]*>[\s\S]*?<\/a>/gi) || [];
    let ctaCount = buttonMatches.filter(b => ctaWords.test(stripHtmlTags(b))).length;
    ctaCount += linkMatches.filter(a => {
      const text = stripHtmlTags(a);
      return ctaWords.test(text) && text.length < 60;
    }).length;

    // --- Body text preview ---
    const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
    const bodyText = bodyMatch ? stripHtmlTags(bodyMatch[0]) : '';

    // --- Canonical ---
    const hasCanonical = !!html.match(/<link\s[^>]*rel=["']canonical["'][^>]*>/i);

    // --- Structured data ---
    const hasStructuredData = !!(
      html.match(/<script\s[^>]*type=["']application\/ld\+json["'][^>]*>/i) ||
      htmlLower.includes('itemscope') ||
      htmlLower.includes('itemtype')
    );

    // --- Open Graph ---
    const hasOpenGraph = !!html.match(/<meta\s[^>]*property=["']og:/i);

    // --- Forms ---
    const formMatches = html.match(/<form[\s\S]*?<\/form>/gi) || [];
    const formCount = formMatches.filter(f => /<input/i.test(f)).length;

    // --- Phone / Email links ---
    const hasPhoneLink = !!html.match(/href=["']tel:/i);
    const hasEmailLink = !!html.match(/href=["']mailto:/i);

    // --- Trust signals ---
    const trustKeywords = /testimonial|review|rating|star|badge|certified|partner|award|accredit|trust|guarantee|bbb|yelp|google review/i;
    const hasTrustSignals = trustKeywords.test(htmlLower);

    // --- Social links ---
    const socialDomains = /facebook\.com|twitter\.com|x\.com|instagram\.com|linkedin\.com|youtube\.com|tiktok\.com|pinterest\.com/i;
    const socialLinkCount = linkMatches.filter(a => socialDomains.test(a)).length;

    // --- Content structure ---
    const textContent = bodyText;
    const words = textContent.split(/\s+/).filter(w => w.length > 0);
    const textToHtmlRatio = html.length > 0 ? (textContent.length / html.length) * 100 : 0;

    // --- Links ---
    let parsedHost = '';
    try { parsedHost = new URL(url).hostname; } catch { /* ignore */ }
    let internalLinkCount = 0;
    let externalLinkCount = 0;
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let hrefMatch;
    while ((hrefMatch = hrefRegex.exec(html)) !== null) {
      const href = hrefMatch[1];
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('tel:') || href.startsWith('mailto:')) continue;
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === parsedHost) internalLinkCount++;
        else externalLinkCount++;
      } catch {
        internalLinkCount++; // relative links
      }
    }

    // --- Lists ---
    const ulMatches = html.match(/<ul[\s>]/gi) || [];
    const olMatches = html.match(/<ol[\s>]/gi) || [];
    const listCount = ulMatches.length + olMatches.length;

    // --- Paragraphs ---
    const pMatches = html.match(/<p[\s>]/gi) || [];

    return {
      hasMetaTitle: !!metaTitle,
      metaTitleLength: metaTitle.length,
      hasMetaDescription: !!metaDescription,
      metaDescriptionLength: metaDescription.length,
      mobileFriendly: hasViewport,
      imageAltTags: { total: totalImages, withAlt: imagesWithAlt },
      hasFavicon,
      fontCount,
      modernImageFormats: modernFormats,
      totalImages,
      inlineColorCount,
      h1Count,
      h1Length: h1Text.length,
      h2Count: h2Matches.length,
      h3Count: h3Matches.length,
      ctaCount,
      bodyPreviewLength: Math.min(textContent.length, 200),
      hasCanonical,
      hasStructuredData,
      hasOpenGraph,
      headingHierarchyValid: hierarchyValid,
      formCount,
      hasPhoneLink,
      hasEmailLink,
      hasTrustSignals,
      socialLinkCount,
      textToHtmlRatio,
      wordCount: words.length,
      internalLinkCount,
      externalLinkCount,
      listCount,
      paragraphCount: pMatches.length,
    };
  } catch {
    return null;
  }
}

// --------------- Robots.txt & Sitemap check ---------------
async function fetchRobotsSitemap(url: string): Promise<{ hasRobotsTxt: boolean; hasSitemap: boolean }> {
  let origin: string;
  try { origin = new URL(url).origin; } catch { return { hasRobotsTxt: false, hasSitemap: false }; }

  const check = async (path: string): Promise<boolean> => {
    try {
      const res = await fetch(`${origin}${path}`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'TruePathAuditBot/1.0' },
        redirect: 'follow',
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const [hasRobotsTxt, hasSitemap] = await Promise.all([
    check('/robots.txt'),
    check('/sitemap.xml'),
  ]);

  return { hasRobotsTxt, hasSitemap };
}

// --------------- Scoring Engine ---------------
interface RawSignals {
  // PageSpeed
  pageSpeedMobile: number | null;
  pageSpeedDesktop: number | null;
  loadTime: number | null;
  tapTargets: number | null;
  fontLegibility: number | null;
  contentWidth: number | null;
  // SSL
  ssl: boolean;
  // Scraped data
  scraped: ScrapedData | null;
  // External checks
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
}

interface CategoryScore {
  score: number;
  checks: { name: string; score: number; maxScore: number }[];
}

interface CategoryScores {
  designElements: CategoryScore;
  messagingHeadlines: CategoryScore;
  seoFoundation: CategoryScore;
  conversionElements: CategoryScore;
  mobileExperience: CategoryScore;
  contentStructure: CategoryScore;
  overall: number;
}

function calculateScores(signals: RawSignals): CategoryScores {
  const s = signals.scraped;

  // --- Design Elements ---
  const designChecks = [
    { name: 'Favicon', score: s?.hasFavicon ? 100 : 0, maxScore: 100 },
    { name: 'Font usage', score: s ? (s.fontCount === 0 ? 80 : s.fontCount <= 2 ? 100 : s.fontCount === 3 ? 70 : 40) : 50, maxScore: 100 },
    { name: 'Modern image formats', score: s && s.totalImages > 0 ? Math.round((s.modernImageFormats / s.totalImages) * 100) : 50, maxScore: 100 },
    { name: 'Has images', score: s && s.totalImages > 0 ? 100 : 0, maxScore: 100 },
    { name: 'Image count balance', score: s ? (s.totalImages === 0 ? 0 : s.totalImages <= 20 ? 100 : s.totalImages <= 40 ? 70 : 40) : 50, maxScore: 100 },
  ];
  const designScore = Math.round(designChecks.reduce((sum, c) => sum + c.score, 0) / designChecks.length);

  // --- Messaging & Headlines ---
  const messagingChecks = [
    { name: 'H1 present & singular', score: s ? (s.h1Count === 1 ? 100 : s.h1Count > 1 ? 50 : 0) : 0, maxScore: 100 },
    { name: 'H1 length', score: s && s.h1Count > 0 ? (s.h1Length >= 10 && s.h1Length <= 70 ? 100 : s.h1Length > 70 ? 60 : 40) : 0, maxScore: 100 },
    { name: 'Subheadings (H2s)', score: s && s.h2Count > 0 ? 100 : 0, maxScore: 100 },
    { name: 'CTA buttons', score: s ? (s.ctaCount === 0 ? 0 : s.ctaCount === 1 ? 60 : s.ctaCount <= 3 ? 80 : 100) : 0, maxScore: 100 },
    { name: 'Body text substance', score: s ? (s.wordCount >= 300 ? 100 : s.wordCount >= 150 ? 70 : s.wordCount >= 50 ? 40 : 10) : 0, maxScore: 100 },
  ];
  const messagingScore = Math.round(messagingChecks.reduce((sum, c) => sum + c.score, 0) / messagingChecks.length);

  // --- SEO Foundation ---
  const seoChecks = [
    { name: 'Meta title', score: s?.hasMetaTitle ? 100 : 0, maxScore: 100 },
    { name: 'Meta title length', score: s?.hasMetaTitle ? (s.metaTitleLength >= 50 && s.metaTitleLength <= 60 ? 100 : s.metaTitleLength >= 30 && s.metaTitleLength <= 70 ? 70 : 40) : 0, maxScore: 100 },
    { name: 'Meta description', score: s?.hasMetaDescription ? 100 : 0, maxScore: 100 },
    { name: 'Meta description length', score: s?.hasMetaDescription ? (s.metaDescriptionLength >= 120 && s.metaDescriptionLength <= 160 ? 100 : s.metaDescriptionLength >= 70 && s.metaDescriptionLength <= 200 ? 70 : 40) : 0, maxScore: 100 },
    { name: 'Image alt coverage', score: s && s.imageAltTags.total > 0 ? Math.round((s.imageAltTags.withAlt / s.imageAltTags.total) * 100) : 50, maxScore: 100 },
    { name: 'Canonical tag', score: s?.hasCanonical ? 100 : 0, maxScore: 100 },
    { name: 'robots.txt', score: signals.hasRobotsTxt ? 100 : 0, maxScore: 100 },
    { name: 'sitemap.xml', score: signals.hasSitemap ? 100 : 0, maxScore: 100 },
    { name: 'Structured data', score: s?.hasStructuredData ? 100 : 0, maxScore: 100 },
    { name: 'Open Graph tags', score: s?.hasOpenGraph ? 100 : 0, maxScore: 100 },
  ];
  const seoScore = Math.round(seoChecks.reduce((sum, c) => sum + c.score, 0) / seoChecks.length);

  // --- Conversion Elements ---
  const conversionChecks = [
    { name: 'CTA count', score: s ? (s.ctaCount === 0 ? 0 : s.ctaCount === 1 ? 60 : s.ctaCount <= 3 ? 80 : 100) : 0, maxScore: 100 },
    { name: 'Contact form', score: s && s.formCount > 0 ? 100 : 0, maxScore: 100 },
    { name: 'Phone link', score: s?.hasPhoneLink ? 100 : 0, maxScore: 100 },
    { name: 'Email link', score: s?.hasEmailLink ? 100 : 0, maxScore: 100 },
    { name: 'Trust signals', score: s?.hasTrustSignals ? 100 : 0, maxScore: 100 },
    { name: 'Social media links', score: s && s.socialLinkCount > 0 ? 100 : 0, maxScore: 100 },
  ];
  const conversionScore = Math.round(conversionChecks.reduce((sum, c) => sum + c.score, 0) / conversionChecks.length);

  // --- Mobile Experience ---
  const mobileChecks = [
    { name: 'Viewport tag', score: s?.mobileFriendly ? 100 : 0, maxScore: 100 },
    { name: 'Mobile PageSpeed', score: signals.pageSpeedMobile ?? 50, maxScore: 100 },
    { name: 'Tap targets', score: signals.tapTargets ?? 70, maxScore: 100 },
    { name: 'Font legibility', score: signals.fontLegibility ?? 70, maxScore: 100 },
  ];
  const mobileScore = Math.round(mobileChecks.reduce((sum, c) => sum + c.score, 0) / mobileChecks.length);

  // --- Content Structure ---
  const contentChecks = [
    { name: 'Heading hierarchy', score: s?.headingHierarchyValid ? 100 : (s && s.h1Count > 0 ? 40 : 0), maxScore: 100 },
    { name: 'Text/HTML ratio', score: s ? (s.textToHtmlRatio >= 15 ? 100 : s.textToHtmlRatio >= 10 ? 80 : s.textToHtmlRatio >= 5 ? 50 : 20) : 0, maxScore: 100 },
    { name: 'Word count', score: s ? (s.wordCount >= 500 ? 100 : s.wordCount >= 300 ? 80 : s.wordCount >= 150 ? 50 : 20) : 0, maxScore: 100 },
    { name: 'Internal links', score: s ? (s.internalLinkCount >= 5 ? 100 : s.internalLinkCount >= 3 ? 80 : s.internalLinkCount >= 1 ? 50 : 0) : 0, maxScore: 100 },
    { name: 'Uses lists', score: s && s.listCount > 0 ? 100 : 0, maxScore: 100 },
  ];
  const contentScore = Math.round(contentChecks.reduce((sum, c) => sum + c.score, 0) / contentChecks.length);

  const overall = Math.round((designScore + messagingScore + seoScore + conversionScore + mobileScore + contentScore) / 6);

  return {
    designElements: { score: designScore, checks: designChecks },
    messagingHeadlines: { score: messagingScore, checks: messagingChecks },
    seoFoundation: { score: seoScore, checks: seoChecks },
    conversionElements: { score: conversionScore, checks: conversionChecks },
    mobileExperience: { score: mobileScore, checks: mobileChecks },
    contentStructure: { score: contentScore, checks: contentChecks },
    overall,
  };
}

// --------------- Types ---------------
interface AuditResults {
  // Legacy fields (kept for backwards compat with existing audits)
  pageSpeedMobile: number | null;
  pageSpeedDesktop: number | null;
  mobileFriendly: boolean;
  ssl: boolean;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  imageAltTags: { total: number; withAlt: number };
  loadTime: number | null;
  // New scoring system
  categoryScores: CategoryScores;
  rawSignals: RawSignals;
}

// --------------- Email draft generation ---------------
function generateEmailDraft(data: {
  name: string;
  businessName: string;
  websiteUrl: string;
  results: AuditResults;
}) {
  const { name, businessName, websiteUrl, results } = data;
  const cs = results.categoryScores;

  const subject = `Your Free Website Audit Results — ${businessName}`;

  function grade(score: number): string {
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Needs Work';
    return 'Critical';
  }

  // Build observations from category scores
  const observations: string[] = [];

  if (cs.mobileExperience.score < 60) {
    observations.push("Your mobile experience needs attention. With over 60% of web traffic coming from phones, this is likely costing you customers. Your site's mobile score came in at " + cs.mobileExperience.score + "/100.");
  } else if (cs.mobileExperience.score < 80) {
    observations.push("Your mobile experience is decent at " + cs.mobileExperience.score + "/100, but there's room to improve. Faster, smoother mobile sites keep visitors engaged and rank better on Google.");
  }

  if (cs.seoFoundation.score < 60) {
    observations.push("Your SEO foundation scored " + cs.seoFoundation.score + "/100 — this means search engines are having trouble understanding and ranking your site. Key elements like meta tags, structured data, or a sitemap may be missing.");
  }

  if (cs.conversionElements.score < 60) {
    observations.push("Your site scored " + cs.conversionElements.score + "/100 on conversion elements. This means you may be missing clear calls-to-action, contact forms, or trust signals that turn visitors into customers.");
  }

  if (cs.messagingHeadlines.score < 60) {
    observations.push("Your messaging and headlines scored " + cs.messagingHeadlines.score + "/100. Clear, compelling headlines and calls-to-action are what grab attention and keep people on your site.");
  }

  if (cs.contentStructure.score < 60) {
    observations.push("Your content structure scored " + cs.contentStructure.score + "/100. Well-organized content with proper headings and sufficient depth helps both visitors and search engines understand your business.");
  }

  if (cs.designElements.score < 60) {
    observations.push("On the design side, your site scored " + cs.designElements.score + "/100. Modern image formats, consistent fonts, and polished visuals all contribute to a professional first impression.");
  }

  if (observations.length === 0) {
    observations.push("Overall your site is in good shape technically. There may still be design and UX improvements worth exploring to stay ahead of the competition.");
  }

  const observationText = observations.join('\n\n');

  const body = `Hi ${name},

Thanks for requesting a website audit for ${businessName}. I took a detailed look at ${websiteUrl} and scored your site across 6 key areas.

OVERALL SCORE: ${cs.overall}/100

CATEGORY BREAKDOWN:
- Design Elements: ${cs.designElements.score}/100 (${grade(cs.designElements.score)})
- Messaging & Headlines: ${cs.messagingHeadlines.score}/100 (${grade(cs.messagingHeadlines.score)})
- SEO Foundation: ${cs.seoFoundation.score}/100 (${grade(cs.seoFoundation.score)})
- Conversion Elements: ${cs.conversionElements.score}/100 (${grade(cs.conversionElements.score)})
- Mobile Experience: ${cs.mobileExperience.score}/100 (${grade(cs.mobileExperience.score)})
- Content Structure: ${cs.contentStructure.score}/100 (${grade(cs.contentStructure.score)})

WHAT I FOUND:

${observationText}

FULL DESIGN REVIEW:

[PLACEHOLDER — this is where I add my personal take on the site's design, UX, and branding after reviewing it myself.]

---

These are all fixable, and I'd love to show you what your website could look like. I build premium custom websites at prices that work for small businesses — no templates, no page builders, just clean design built for your brand.

Want to see some examples? Check out my recent work:
https://truepathstudios.com/#portfolio

If you'd like to chat about what a redesign could look like for ${businessName}, I'm happy to hop on a quick call — no pressure.

Best,
Marc Santiago
TruePath Studios
truepathstudios.com`;

  return { subject, body };
}

// --------------- Main handler ---------------
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: cors }
    );
  }

  try {
    const body = await req.json();
    const { name, email, businessName, websiteUrl, website2 } = body;

    // Honeypot check
    if (website2) {
      return NextResponse.json({ success: true, results: {} }, { headers: cors });
    }

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !businessName?.trim() || !websiteUrl?.trim()) {
      return NextResponse.json(
        { error: 'All fields are required: name, email, businessName, websiteUrl' },
        { status: 400, headers: cors }
      );
    }

    // Validate email
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400, headers: cors }
      );
    }

    // Normalize and validate URL
    const url = normalizeUrl(websiteUrl);
    if (!isSafeUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid website URL' },
        { status: 400, headers: cors }
      );
    }

    const ssl = url.startsWith('https://');

    // Run PageSpeed + HTML scrape + robots/sitemap in parallel
    const [pagespeed, scraped, robotsSitemap] = await Promise.all([
      getPageSpeedScores(url),
      scrapeHtml(url),
      fetchRobotsSitemap(url),
    ]);

    // Build raw signals
    const rawSignals: RawSignals = {
      pageSpeedMobile: pagespeed.mobile.score,
      pageSpeedDesktop: pagespeed.desktop.score,
      loadTime: pagespeed.mobile.loadTime,
      tapTargets: pagespeed.mobile.tapTargets,
      fontLegibility: pagespeed.mobile.fontLegibility,
      contentWidth: pagespeed.mobile.contentWidth,
      ssl,
      scraped,
      hasRobotsTxt: robotsSitemap.hasRobotsTxt,
      hasSitemap: robotsSitemap.hasSitemap,
    };

    // Calculate category scores
    const categoryScores = calculateScores(rawSignals);

    const results: AuditResults = {
      // Legacy fields
      pageSpeedMobile: pagespeed.mobile.score,
      pageSpeedDesktop: pagespeed.desktop.score,
      mobileFriendly: scraped?.mobileFriendly ?? false,
      ssl,
      hasMetaTitle: scraped?.hasMetaTitle ?? false,
      hasMetaDescription: scraped?.hasMetaDescription ?? false,
      imageAltTags: scraped?.imageAltTags ?? { total: 0, withAlt: 0 },
      loadTime: pagespeed.mobile.loadTime,
      // New scoring
      categoryScores,
      rawSignals,
    };

    // Generate email draft
    const emailDraft = generateEmailDraft({
      name: name.trim(),
      businessName: businessName.trim(),
      websiteUrl: url,
      results,
    });

    // Create AuditSubmission
    const audit = await prisma.auditSubmission.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        businessName: businessName.trim(),
        websiteUrl: url,
        results: JSON.stringify(results),
        emailSubject: emailDraft.subject,
        emailBody: emailDraft.body,
        status: 'completed',
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        type: 'audit_submission',
        title: `New Audit: ${businessName.trim()}`,
        message: `${email.trim()} submitted ${url} for audit — Overall Score: ${categoryScores.overall}/100`,
        actionUrl: `/audits/${audit.id}`,
      },
    });

    // Send admin email notification via Resend
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const APP_URL = process.env.NEXTAUTH_URL || 'https://app.truepathstudios.com';
      await resend.emails.send({
        from: 'TruePath Studios <updates@truepathstudios.com>',
        to: process.env.ADMIN_EMAIL || 'info@truepathstudios.com',
        replyTo: process.env.REPLY_TO_EMAIL || 'info@truepathstudios.com',
        subject: `New audit: ${businessName.trim()} — Score ${categoryScores.overall}/100`,
        html: `<p><strong>${name.trim()}</strong> (${email.trim()}) submitted <strong>${url}</strong> for a free website audit.</p>
               <p>Overall Score: <strong>${categoryScores.overall}/100</strong></p>
               <p><a href="${APP_URL}/audits/${audit.id}">View in Mission Control</a></p>`,
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, results }, { headers: cors });
  } catch (error) {
    console.error('Audit submit error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500, headers: cors }
    );
  }
}
