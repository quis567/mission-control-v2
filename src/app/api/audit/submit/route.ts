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
  // Allow localhost for dev
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
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
    // Block internal/private IPs
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
async function getPageSpeedScores(url: string) {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;

  async function fetchStrategy(strategy: 'mobile' | 'desktop') {
    const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    endpoint.searchParams.set('url', url);
    endpoint.searchParams.set('strategy', strategy);
    endpoint.searchParams.append('category', 'performance');
    if (key) endpoint.searchParams.set('key', key);

    try {
      const res = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(60000) });
      if (!res.ok) return { score: null, loadTime: null };
      const data = await res.json();
      const score = data?.lighthouseResult?.categories?.performance?.score;
      const fcp = data?.lighthouseResult?.audits?.['first-contentful-paint']?.numericValue;
      return {
        score: typeof score === 'number' ? Math.round(score * 100) : null,
        loadTime: typeof fcp === 'number' ? Math.round(fcp / 100) / 10 : null, // seconds, 1 decimal
      };
    } catch {
      return { score: null, loadTime: null };
    }
  }

  const [mobile, desktop] = await Promise.all([
    fetchStrategy('mobile'),
    fetchStrategy('desktop'),
  ]);

  return { mobile, desktop };
}

// --------------- HTML scraping ---------------
async function scrapeHtml(url: string) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'TruePathAuditBot/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();

    const metaTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaTitle = metaTitleMatch ? metaTitleMatch[1].trim() : null;

    const metaDescMatch = html.match(/<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta\s[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : null;

    const viewportMatch = html.match(/<meta\s[^>]*name=["']viewport["']/i);
    const hasViewport = !!viewportMatch;

    // Count images and alt tags
    const imgMatches = html.match(/<img\s[^>]*>/gi) || [];
    const totalImages = imgMatches.length;
    const imagesWithAlt = imgMatches.filter(tag => /\balt=["'][^"']+["']/i.test(tag)).length;

    return {
      hasMetaTitle: !!metaTitle,
      hasMetaDescription: !!metaDescription,
      mobileFriendly: hasViewport,
      imageAltTags: { total: totalImages, withAlt: imagesWithAlt },
    };
  } catch {
    return null;
  }
}

// --------------- Email draft generation ---------------
function generateEmailDraft(data: {
  name: string;
  businessName: string;
  websiteUrl: string;
  results: AuditResults;
}) {
  const { name, businessName, websiteUrl, results } = data;

  const subject = `Your Free Website Audit Results — ${businessName}`;

  // Auto-generated observations
  const observations: string[] = [];

  if (results.pageSpeedMobile !== null) {
    if (results.pageSpeedMobile < 50) {
      observations.push("Your site is loading slowly on mobile devices, which is how most of your customers are finding you. Google also uses mobile speed as a ranking factor, so this is likely hurting your search visibility.");
    } else if (results.pageSpeedMobile < 80) {
      observations.push("Your mobile speed is decent but there's room for improvement. Faster sites keep visitors engaged longer and rank better on Google.");
    } else {
      observations.push("Your mobile speed is solid — that's better than most small business sites I audit.");
    }
  }

  if (results.mobileFriendly === false) {
    observations.push("Your website isn't fully optimized for mobile devices. With over 60% of web traffic coming from phones, this means a lot of potential customers are having a poor experience on your site.");
  }

  if (results.ssl === false) {
    observations.push("Your site isn't using HTTPS, which means browsers show a 'Not Secure' warning to visitors. This can scare off potential customers and hurts your Google ranking.");
  }

  if (results.hasMetaTitle === false) {
    observations.push("Your site is missing a title tag, which is one of the most basic SEO elements. This is what shows up as the clickable headline in Google search results.");
  }

  if (results.hasMetaDescription === false) {
    observations.push("Your site is missing a meta description — that's the short blurb that shows up under your title in Google search results. Without it, Google pulls random text from your page, which usually doesn't make a great first impression.");
  }

  if (results.imageAltTags && results.imageAltTags.total > 0) {
    const coverage = results.imageAltTags.withAlt / results.imageAltTags.total;
    if (coverage < 0.5) {
      observations.push("Most of your images are missing alt text. This hurts both accessibility and SEO — search engines can't 'see' images, they rely on alt text to understand what's on the page.");
    }
  }

  const observationText = observations.length > 0
    ? observations.join('\n\n')
    : "Overall your site is in decent shape technically. There may still be design and UX improvements worth exploring.";

  const body = `Hi ${name},

Thanks for requesting a website audit for ${businessName}. I took a look at ${websiteUrl} and put together some findings for you.

QUICK SCORES:
- Mobile Performance: ${results.pageSpeedMobile ?? 'N/A'}/100
- Desktop Performance: ${results.pageSpeedDesktop ?? 'N/A'}/100
- Mobile Friendly: ${results.mobileFriendly ? 'Yes' : 'No'}
- SSL Secure: ${results.ssl ? 'Yes' : 'No'}
- Page Load Time: ${results.loadTime ?? 'N/A'}s

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

// --------------- Types ---------------
interface AuditResults {
  pageSpeedMobile: number | null;
  pageSpeedDesktop: number | null;
  mobileFriendly: boolean;
  ssl: boolean;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  imageAltTags: { total: number; withAlt: number };
  loadTime: number | null;
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
      // Silently accept but do nothing — looks successful to bots
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

    // Check SSL from URL protocol
    const ssl = url.startsWith('https://');

    // Run PageSpeed + HTML scrape in parallel
    const [pagespeed, scraped] = await Promise.all([
      getPageSpeedScores(url),
      scrapeHtml(url),
    ]);

    const results: AuditResults = {
      pageSpeedMobile: pagespeed.mobile.score,
      pageSpeedDesktop: pagespeed.desktop.score,
      mobileFriendly: scraped?.mobileFriendly ?? false,
      ssl,
      hasMetaTitle: scraped?.hasMetaTitle ?? false,
      hasMetaDescription: scraped?.hasMetaDescription ?? false,
      imageAltTags: scraped?.imageAltTags ?? { total: 0, withAlt: 0 },
      loadTime: pagespeed.mobile.loadTime,
    };

    // Generate email draft
    const emailDraft = generateEmailDraft({
      name: name.trim(),
      businessName: businessName.trim(),
      websiteUrl: url,
      results,
    });

    // Create CRM lead (Client with status 'lead', tagged as Audit Lead)
    const existingTags = '["Audit Lead"]';
    const client = await prisma.client.create({
      data: {
        businessName: businessName.trim(),
        contactName: name.trim(),
        email: email.trim(),
        status: 'lead',
        tags: existingTags,
      },
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
        leadId: client.id,
        status: 'completed',
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        type: 'audit_submission',
        title: `New Audit: ${businessName.trim()}`,
        message: `${email.trim()} submitted ${url} for audit`,
        leadId: client.id,
        actionUrl: `/audits/${audit.id}`,
      },
    });

    // Send admin email notification via Resend (optional enhancement from spec)
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const APP_URL = process.env.NEXTAUTH_URL || 'https://app.truepathstudios.com';
      await resend.emails.send({
        from: 'TruePath Studios <updates@truepathstudios.com>',
        to: process.env.ADMIN_EMAIL || 'info@truepathstudios.com',
        replyTo: process.env.REPLY_TO_EMAIL || 'info@truepathstudios.com',
        subject: `New audit request from ${businessName.trim()} — ${url}`,
        html: `<p><strong>${name.trim()}</strong> (${email.trim()}) submitted <strong>${url}</strong> for a free website audit.</p>
               <p><a href="${APP_URL}/audits/${audit.id}">View in Mission Control</a></p>`,
      });
    } catch {
      // Non-blocking — admin notification is nice-to-have
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
