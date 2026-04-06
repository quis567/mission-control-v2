import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic';
import prisma from '@/lib/db';
import { calculateSeoScore } from '@/lib/seo';

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function githubGet(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) return null;
  return res.json();
}

async function githubPut(path: string, body: any) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: 'PUT',
    headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json() };
}

function applyAllMetaTags(html: string, meta: {
  title?: string; description?: string; canonicalUrl?: string;
  ogTitle?: string; ogDescription?: string; ogUrl?: string;
  favicon?: string;
}): string {
  let result = html;

  // Title
  if (meta.title) {
    if (/<title>/i.test(result)) {
      result = result.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);
    } else {
      result = result.replace(/<\/head>/i, `  <title>${meta.title}</title>\n</head>`);
    }
  }

  // Meta description
  if (meta.description) {
    if (/<meta\s+name=["']description["']/i.test(result)) {
      result = result.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["'][^>]*>/i,
        `<meta name="description" content="${meta.description}">`);
    } else {
      result = result.replace(/<\/head>/i, `  <meta name="description" content="${meta.description}">\n</head>`);
    }
  }

  // Canonical
  if (meta.canonicalUrl) {
    if (/<link\s+rel=["']canonical["']/i.test(result)) {
      result = result.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["'][^>]*>/i,
        `<link rel="canonical" href="${meta.canonicalUrl}">`);
    } else {
      result = result.replace(/<\/head>/i, `  <link rel="canonical" href="${meta.canonicalUrl}">\n</head>`);
    }
  }

  // OG title
  const ogTitle = meta.ogTitle || meta.title;
  if (ogTitle) {
    if (/<meta\s+property=["']og:title["']/i.test(result)) {
      result = result.replace(/<meta\s+property=["']og:title["']\s+content=["'][^"']*["'][^>]*>/i,
        `<meta property="og:title" content="${ogTitle}">`);
    } else {
      result = result.replace(/<\/head>/i, `  <meta property="og:title" content="${ogTitle}">\n</head>`);
    }
  }

  // OG description
  const ogDesc = meta.ogDescription || meta.description;
  if (ogDesc) {
    if (/<meta\s+property=["']og:description["']/i.test(result)) {
      result = result.replace(/<meta\s+property=["']og:description["']\s+content=["'][^"']*["'][^>]*>/i,
        `<meta property="og:description" content="${ogDesc}">`);
    } else {
      result = result.replace(/<\/head>/i, `  <meta property="og:description" content="${ogDesc}">\n</head>`);
    }
  }

  // OG URL
  if (meta.ogUrl || meta.canonicalUrl) {
    const url = meta.ogUrl || meta.canonicalUrl;
    if (!/<meta\s+property=["']og:url["']/i.test(result)) {
      result = result.replace(/<\/head>/i, `  <meta property="og:url" content="${url}">\n</head>`);
    }
  }

  // OG type (if missing)
  if (!/<meta\s+property=["']og:type["']/i.test(result)) {
    result = result.replace(/<\/head>/i, `  <meta property="og:type" content="website">\n</head>`);
  }

  // Twitter card tags (if missing)
  if (!/<meta\s+name=["']twitter:card["']/i.test(result)) {
    result = result.replace(/<\/head>/i, `  <meta name="twitter:card" content="summary">\n</head>`);
  }
  if (ogTitle && !/<meta\s+name=["']twitter:title["']/i.test(result)) {
    result = result.replace(/<\/head>/i, `  <meta name="twitter:title" content="${ogTitle}">\n</head>`);
  }
  if (ogDesc && !/<meta\s+name=["']twitter:description["']/i.test(result)) {
    result = result.replace(/<\/head>/i, `  <meta name="twitter:description" content="${ogDesc}">\n</head>`);
  }

  // Favicon (if missing)
  if (!/<link\s+[^>]*rel=["']icon["']/i.test(result) && !/<link\s+[^>]*rel=["']shortcut icon["']/i.test(result)) {
    result = result.replace(/<\/head>/i, `  <link rel="icon" href="/favicon.ico">\n</head>`);
  }

  return result;
}

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

    // Check GitHub config
    const repo = website.githubRepoUrl ? parseGitHubUrl(website.githubRepoUrl) : null;
    const canPushToGitHub = !!GITHUB_TOKEN && !!repo;

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
- An optimized title tag (50-60 chars STRICTLY — this is critical for SEO scoring)
- An optimized meta description (120-160 chars STRICTLY)
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

    // Apply all optimizations
    const results: { pageId: string; url: string; changes: string[]; pushed: boolean }[] = [];

    for (const opt of parsed.pages) {
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
        results.push({ pageId: existing.id, url: existing.pageUrl, changes: ['No changes needed'], pushed: false });
        continue;
      }

      // Recalculate score
      const merged = { ...existing, ...updates };
      updates.seoScore = calculateSeoScore(merged);
      updates.lastAudited = new Date();

      await prisma.seoPage.update({ where: { id: existing.id }, data: updates });

      for (const change of changes) {
        await prisma.seoChange.create({
          data: { seoPageId: existing.id, ...change, changedBy: 'ai-bulk' },
        });
      }

      // Push to GitHub if configured
      let pushed = false;
      if (canPushToGitHub && repo) {
        try {
          let pathOnly = existing.pageUrl;
          try { pathOnly = new URL(existing.pageUrl).pathname; } catch { /* already a path */ }
          const pagePath = pathOnly === '/' ? '' : pathOnly.replace(/^\//, '').replace(/\/$/, '');
          const candidates = pagePath ? [`${pagePath}.html`, `${pagePath}/index.html`] : ['index.html'];

          for (const candidate of candidates) {
            const fileData = await githubGet(`/repos/${repo.owner}/${repo.repo}/contents/${candidate}`);
            if (fileData && fileData.sha) {
              const currentHtml = Buffer.from(fileData.content, 'base64').toString('utf8');
              const updatedHtml = applyAllMetaTags(currentHtml, {
                title: opt.title || existing.pageTitle || undefined,
                description: opt.description || existing.metaDescription || undefined,
                canonicalUrl: existing.pageUrl,
              });

              if (updatedHtml !== currentHtml) {
                const updatedContent = Buffer.from(updatedHtml, 'utf8').toString('base64');
                const { ok } = await githubPut(`/repos/${repo.owner}/${repo.repo}/contents/${candidate}`, {
                  message: `SEO: Optimize meta tags for ${pathOnly || '/'} — via Mission Control`,
                  content: updatedContent,
                  sha: fileData.sha,
                });
                pushed = ok;
              }
              break;
            }
          }
        } catch { /* non-critical — DB was still updated */ }
      }

      results.push({ pageId: existing.id, url: existing.pageUrl, changes: changeLabels, pushed });
    }

    const optimizedCount = results.filter(r => r.changes[0] !== 'No changes needed').length;
    const pushedCount = results.filter(r => r.pushed).length;

    return NextResponse.json({
      success: true,
      message: `Optimized ${optimizedCount} of ${pages.length} pages${canPushToGitHub ? ` · ${pushedCount} pushed to GitHub (auto-deploys in ~60s)` : ' · saved to DB only (no GitHub repo linked)'}`,
      results,
      pushed: pushedCount,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
