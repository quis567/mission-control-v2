import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const websiteId = req.nextUrl.searchParams.get('websiteId');
    if (!websiteId) return NextResponse.json({ error: 'websiteId required' }, { status: 400 });

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        client: { select: { businessName: true, contactName: true, email: true } },
        seoPages: { orderBy: { seoScore: 'asc' } },
      },
    });

    if (!website) return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    if (website.seoPages.length === 0) return NextResponse.json({ error: 'No SEO data — run a crawl first' }, { status: 400 });

    const pages = website.seoPages;
    const avgScore = Math.round(pages.reduce((s, p) => s + (p.seoScore || 0), 0) / pages.length);
    const platform = website.cmsPlatform || 'Unknown';

    // Collect all issues across all pages
    const allIssues: { page: string; issue: string; importance: string; category: string }[] = [];
    for (const page of pages) {
      try {
        const issues = JSON.parse(page.issues || '[]');
        let pathLabel: string;
        try { pathLabel = new URL(page.pageUrl).pathname; } catch { pathLabel = page.pageUrl; }
        for (const issue of issues) {
          allIssues.push({ page: pathLabel, ...issue });
        }
      } catch {}
    }

    // Sort by importance
    const importanceOrder: Record<string, number> = { critical: 0, important: 1, tip: 2 };
    allIssues.sort((a, b) => (importanceOrder[a.importance] ?? 3) - (importanceOrder[b.importance] ?? 3));

    // Platform-specific instructions
    const platformInstructions: Record<string, Record<string, string>> = {
      WordPress: {
        title: 'In WordPress admin → Pages → Edit page → Yoast SEO section → SEO Title',
        metaDescription: 'In WordPress admin → Pages → Edit page → Yoast SEO section → Meta Description',
        h1: 'In WordPress admin → Pages → Edit page → The main heading (H1) is usually the page title at the top of the editor',
        ogTags: 'In WordPress admin → Pages → Edit page → Yoast SEO → Social tab → Facebook/Twitter fields',
        images: 'In WordPress admin → Media Library → Click image → Alt Text field on the right',
        general: 'Install Yoast SEO or RankMath plugin if not already installed for easy meta tag management',
      },
      Wix: {
        title: 'In Wix Editor → Pages menu → Select page → SEO (Google) tab → Title Tag',
        metaDescription: 'In Wix Editor → Pages menu → Select page → SEO (Google) tab → Description',
        h1: 'In Wix Editor → Click the main heading text → Change the style to Heading 1',
        ogTags: 'In Wix Editor → Pages menu → Select page → SEO (Google) → Social Share tab',
        images: 'In Wix Editor → Click image → Settings icon → Alt Text field',
        general: 'Use the Wix SEO Wizard (Marketing & SEO → SEO Tools) for guided optimization',
      },
      Squarespace: {
        title: 'In Squarespace → Pages → Gear icon on page → SEO tab → SEO Title',
        metaDescription: 'In Squarespace → Pages → Gear icon on page → SEO tab → SEO Description',
        h1: 'In Squarespace → Edit page → Click heading block → Set format to Heading 1',
        ogTags: 'In Squarespace → Pages → Gear icon → Social Image tab',
        images: 'In Squarespace → Edit page → Click image → Design tab → Image Alt Text',
        general: 'Check Marketing → SEO for site-wide settings',
      },
      Shopify: {
        title: 'In Shopify admin → Online Store → Pages → Edit page → scroll to Search engine listing → Edit website SEO → Page title',
        metaDescription: 'In Shopify admin → Online Store → Pages → Edit page → scroll to Search engine listing → Meta description',
        h1: 'The page title in Shopify is typically the H1. Go to Online Store → Pages → Edit title',
        ogTags: 'In Shopify admin → Online Store → Preferences → Social sharing image',
        images: 'In Shopify admin → Products/Pages → Click image → Add alt text',
        general: 'Install an SEO app from the Shopify App Store for advanced optimization',
      },
    };

    const instructions = platformInstructions[platform] || {
      title: 'Edit the <title> tag in the HTML head section of the page',
      metaDescription: 'Edit the <meta name="description"> tag in the HTML head section',
      h1: 'Ensure the main heading uses an <h1> tag',
      ogTags: 'Add <meta property="og:title">, <meta property="og:description">, and <meta property="og:image"> tags',
      images: 'Add alt="" attributes to all <img> tags',
      general: 'Check your CMS documentation for SEO settings',
    };

    // Build the report data
    const report = {
      clientName: website.client?.businessName || 'Client',
      contactName: website.client?.contactName || '',
      websiteUrl: website.url,
      platform,
      generatedAt: new Date().toISOString(),
      overallScore: avgScore,
      totalPages: pages.length,
      totalIssues: allIssues.length,
      criticalIssues: allIssues.filter(i => i.importance === 'critical').length,
      importantIssues: allIssues.filter(i => i.importance === 'important').length,
      tipIssues: allIssues.filter(i => i.importance === 'tip').length,
      pages: pages.map(p => {
        let pathLabel: string;
        try { pathLabel = new URL(p.pageUrl).pathname; } catch { pathLabel = p.pageUrl; }
        let pageIssues: any[] = [];
        try { pageIssues = JSON.parse(p.issues || '[]'); } catch {}
        return {
          url: pathLabel,
          score: p.seoScore || 0,
          title: p.pageTitle || 'Missing',
          metaDescription: p.metaDescription || 'Missing',
          h1: p.h1Tag || 'Missing',
          wordCount: p.wordCount || 0,
          issues: pageIssues,
        };
      }),
      allIssues,
      instructions,
    };

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
