import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic';
import prisma from '@/lib/db';


const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;

async function triggerNetlifyDeploy(netlifySiteId: string): Promise<{ ok: boolean; url?: string }> {
  if (!NETLIFY_TOKEN || !netlifySiteId) return { ok: false };
  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}/builds`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NETLIFY_TOKEN}` },
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, url: data.deploy_url || data.admin_url };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

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
}): string {
  let result = html;

  if (meta.title) {
    if (/<title>/i.test(result)) {
      result = result.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);
    } else {
      result = result.replace(/<\/head>/i, `  <title>${meta.title}</title>\n</head>`);
    }
  }

  if (meta.description) {
    if (/<meta\s+name=["']description["']/i.test(result)) {
      result = result.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["'][^>]*>/i,
        `<meta name="description" content="${meta.description}">`);
    } else {
      result = result.replace(/<\/head>/i, `  <meta name="description" content="${meta.description}">\n</head>`);
    }
  }

  if (meta.canonicalUrl) {
    if (/<link\s+rel=["']canonical["']/i.test(result)) {
      result = result.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["'][^>]*>/i,
        `<link rel="canonical" href="${meta.canonicalUrl}">`);
    } else {
      result = result.replace(/<\/head>/i, `  <link rel="canonical" href="${meta.canonicalUrl}">\n</head>`);
    }
  }

  const ogTitle = meta.ogTitle || meta.title;
  if (ogTitle) {
    if (/<meta\s+property=["']og:title["']/i.test(result)) {
      result = result.replace(/<meta\s+property=["']og:title["']\s+content=["'][^"']*["'][^>]*>/i,
        `<meta property="og:title" content="${ogTitle}">`);
    } else {
      result = result.replace(/<\/head>/i, `  <meta property="og:title" content="${ogTitle}">\n</head>`);
    }
  }

  const ogDesc = meta.ogDescription || meta.description;
  if (ogDesc) {
    if (/<meta\s+property=["']og:description["']/i.test(result)) {
      result = result.replace(/<meta\s+property=["']og:description["']\s+content=["'][^"']*["'][^>]*>/i,
        `<meta property="og:description" content="${ogDesc}">`);
    } else {
      result = result.replace(/<\/head>/i, `  <meta property="og:description" content="${ogDesc}">\n</head>`);
    }
  }

  if (meta.ogUrl || meta.canonicalUrl) {
    if (!/<meta\s+property=["']og:url["']/i.test(result)) {
      result = result.replace(/<\/head>/i, `  <meta property="og:url" content="${meta.ogUrl || meta.canonicalUrl}">\n</head>`);
    }
  }

  if (!/<meta\s+property=["']og:type["']/i.test(result)) {
    result = result.replace(/<\/head>/i, `  <meta property="og:type" content="website">\n</head>`);
  }

  if (!/<meta\s+name=["']twitter:card["']/i.test(result)) {
    result = result.replace(/<\/head>/i, `  <meta name="twitter:card" content="summary">\n</head>`);
  }
  if (ogTitle && !/<meta\s+name=["']twitter:title["']/i.test(result)) {
    result = result.replace(/<\/head>/i, `  <meta name="twitter:title" content="${ogTitle}">\n</head>`);
  }
  if (ogDesc && !/<meta\s+name=["']twitter:description["']/i.test(result)) {
    result = result.replace(/<\/head>/i, `  <meta name="twitter:description" content="${ogDesc}">\n</head>`);
  }

  if (!/<link\s+[^>]*rel=["']icon["']/i.test(result) && !/<link\s+[^>]*rel=["']shortcut icon["']/i.test(result)) {
    result = result.replace(/<\/head>/i, `  <link rel="icon" href="/favicon.ico">\n</head>`);
  }

  return result;
}

// Enhance body content: add <strong> tags around key phrases and external authority links
function enhanceBodyContent(html: string, keyword: string, businessType: string): { html: string; addedStrong: boolean; addedExtLink: boolean } {
  let result = html;
  let addedStrong = false;
  let addedExtLink = false;

  // Add <strong> tags around the target keyword — ONLY inside <body>, never in <head>/<title>
  if (keyword) {
    const bodyStart = result.search(/<body[^>]*>/i);
    if (bodyStart !== -1) {
      const head = result.slice(0, bodyStart);
      let body = result.slice(bodyStart);

      // Only add if no <strong> exists in body already
      if (!/<strong>/i.test(body)) {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Try matching inside a <p> tag first
        const pRegex = new RegExp(`(<p[^>]*>[^<]*)(${escaped})([^<]*<\/p>)`, 'i');
        if (pRegex.test(body)) {
          body = body.replace(pRegex, `$1<strong>$2</strong>$3`);
          addedStrong = true;
        } else {
          // Try matching inside any body text (between > and <), but skip tags/attributes
          const textRegex = new RegExp(`(<(?:p|span|li|h[2-6]|div|td|dd)[^>]*>[^<]*)(${escaped})([^<]*<)`, 'i');
          if (textRegex.test(body)) {
            body = body.replace(textRegex, `$1<strong>$2</strong>$3`);
            addedStrong = true;
          }
        }
      }

      result = head + body;
    }
  }

  // Add external authority link if none exist in body
  const bodyContent = result.slice(result.search(/<body[^>]*>/i) || 0);
  const extLinkRegex = /<a\s+[^>]*href=["']https?:\/\/(?!localhost|127\.0\.0\.1)[^"']+["'][^>]*>/i;
  if (!extLinkRegex.test(bodyContent)) {
    // Pick an authority link based on business type
    const authorityLinks: Record<string, { url: string; text: string }> = {
      'hvac': { url: 'https://www.energy.gov/energysaver/heating-and-cooling', text: 'U.S. Department of Energy heating and cooling guidelines' },
      'plumbing': { url: 'https://www.epa.gov/watersense', text: 'EPA WaterSense program' },
      'electrical': { url: 'https://www.energy.gov/energysaver/electricity-and-fuel', text: 'U.S. Department of Energy' },
      'roofing': { url: 'https://www.nrca.net/', text: 'National Roofing Contractors Association' },
      'landscaping': { url: 'https://www.epa.gov/watersense/outdoor-water-use', text: 'EPA outdoor water use guidelines' },
    };

    const bt = (businessType || '').toLowerCase();
    const link = Object.entries(authorityLinks).find(([key]) => bt.includes(key))?.[1]
      || { url: 'https://www.bbb.org/', text: 'Better Business Bureau' };

    // Insert before the last </section> or before </main> or before </body>
    const insertPoints = [/<\/section>(?![\s\S]*<\/section>)/i, /<\/main>/i, /<\/body>/i];
    for (const point of insertPoints) {
      if (point.test(result)) {
        const linkHtml = `\n  <p style="margin-top: 1.5rem; font-size: 0.9rem; color: #666;">For more information, visit the <a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.text}</a>.</p>\n`;
        result = result.replace(point, `${linkHtml}$&`);
        addedExtLink = true;
        break;
      }
    }
  }

  return { html: result, addedStrong, addedExtLink };
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

    const repo = website.githubRepoUrl ? parseGitHubUrl(website.githubRepoUrl) : null;
    const canPushToGitHub = !!GITHUB_TOKEN && !!repo;

    // Detect if this is a Next.js site by checking for layout.tsx
    let isNextJs = false;
    let nextLayoutUpdated = false;
    if (canPushToGitHub && repo) {
      const layoutFile = await githubGet(`/repos/${repo.owner}/${repo.repo}/contents/src/app/layout.tsx`);
      if (layoutFile && layoutFile.sha) {
        isNextJs = true;
        // Update layout.tsx metadata to add metadataBase, canonical, and twitter config
        const layoutContent = Buffer.from(layoutFile.content, 'base64').toString('utf8');
        let updatedLayout = layoutContent;

        // Add metadataBase if missing (required for canonical URLs in Next.js)
        if (!updatedLayout.includes('metadataBase')) {
          updatedLayout = updatedLayout.replace(
            /export const metadata:\s*Metadata\s*=\s*\{/,
            `export const metadata: Metadata = {\n  metadataBase: new URL("${website.url}"),`
          );
        }

        // Add alternates.canonical if missing
        if (!updatedLayout.includes('alternates')) {
          updatedLayout = updatedLayout.replace(
            /export const metadata:\s*Metadata\s*=\s*\{[^]*?metadataBase[^,]*,/,
            `$&\n  alternates: { canonical: "./" },`
          );
        }

        // Add twitter config if missing
        if (!updatedLayout.includes('twitter')) {
          const bizName = website.client?.businessName || 'Website';
          const bizDesc = pages[0]?.metaDescription || 'Professional services you can trust.';
          if (updatedLayout.includes('openGraph')) {
            updatedLayout = updatedLayout.replace(
              /(openGraph:\s*\{[^}]*\}[^}]*\},?)/,
              `$1\n  twitter: {\n    card: "summary",\n    title: "${bizName.replace(/"/g, '\\"')}",\n    description: "${bizDesc.replace(/"/g, '\\"').substring(0, 200)}",\n  },`
            );
          }
        }

        if (updatedLayout !== layoutContent) {
          const updatedContent = Buffer.from(updatedLayout, 'utf8').toString('base64');
          const { ok } = await githubPut(`/repos/${repo.owner}/${repo.repo}/contents/src/app/layout.tsx`, {
            message: `SEO: Add metadataBase, canonical, and twitter config to layout — via Mission Control`,
            content: updatedContent,
            sha: layoutFile.sha,
          });
          nextLayoutUpdated = ok;
        }
      }
    }

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
   Word count: ${p.wordCount}
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

      // Save updates without recalculating score — the crawl has the full picture
      if (Object.keys(updates).length > 0) {
        updates.lastAudited = new Date();
        await prisma.seoPage.update({ where: { id: existing.id }, data: updates });
        for (const change of changes) {
          await prisma.seoChange.create({
            data: { seoPageId: existing.id, ...change, changedBy: 'ai-bulk' },
          });
        }
      }

      // Push to GitHub: meta tags + body enhancements (static HTML sites only)
      let pushed = false;
      if (canPushToGitHub && repo && !isNextJs) {
        try {
          let pathOnly = existing.pageUrl;
          try { pathOnly = new URL(existing.pageUrl).pathname; } catch { /* already a path */ }
          const pagePath = pathOnly === '/' ? '' : pathOnly.replace(/^\//, '').replace(/\/$/, '');
          const candidates = pagePath ? [`${pagePath}.html`, `${pagePath}/index.html`] : ['index.html'];

          for (const candidate of candidates) {
            const fileData = await githubGet(`/repos/${repo.owner}/${repo.repo}/contents/${candidate}`);
            if (fileData && fileData.sha) {
              let currentHtml = Buffer.from(fileData.content, 'base64').toString('utf8');

              // Apply meta tag changes
              currentHtml = applyAllMetaTags(currentHtml, {
                title: opt.title || existing.pageTitle || undefined,
                description: opt.description || existing.metaDescription || undefined,
                canonicalUrl: existing.pageUrl,
              });

              // Apply body enhancements: strong tags + external links
              const targetKw = opt.targetKeyword || existing.targetKeyword || '';
              const bizType = website.client?.businessType || website.client?.businessName || '';
              const enhanced = enhanceBodyContent(currentHtml, targetKw, bizType);
              currentHtml = enhanced.html;

              if (enhanced.addedStrong) changeLabels.push('strong tags');
              if (enhanced.addedExtLink) changeLabels.push('external link');

              const originalHtml = Buffer.from(fileData.content, 'base64').toString('utf8');
              if (currentHtml !== originalHtml) {
                const updatedContent = Buffer.from(currentHtml, 'utf8').toString('base64');
                const { ok } = await githubPut(`/repos/${repo.owner}/${repo.repo}/contents/${candidate}`, {
                  message: `SEO: Optimize ${pathOnly || '/'} — meta tags, strong tags, external links — via Mission Control`,
                  content: updatedContent,
                  sha: fileData.sha,
                });
                pushed = ok;
              }
              break;
            }
          }
        } catch { /* non-critical */ }
      }
      // For Next.js sites, layout update covers all pages
      if (isNextJs && nextLayoutUpdated) pushed = true;

      const hasAnyChanges = changeLabels.length > 0;
      results.push({
        pageId: existing.id,
        url: existing.pageUrl,
        changes: hasAnyChanges ? changeLabels : ['No changes needed'],
        pushed,
      });
    }

    const optimizedCount = results.filter(r => r.changes[0] !== 'No changes needed').length;
    const pushedCount = results.filter(r => r.pushed).length;

    // Trigger Netlify deploy if we pushed changes or updated layout and site has a Netlify ID
    let netlifyDeployed = false;
    if ((pushedCount > 0 || nextLayoutUpdated) && website.netlifySiteId) {
      const deploy = await triggerNetlifyDeploy(website.netlifySiteId);
      netlifyDeployed = deploy.ok;
    }

    const parts = [`Optimized ${optimizedCount} of ${pages.length} pages`];
    if (nextLayoutUpdated) parts.push('canonical + twitter tags added to layout');
    if (canPushToGitHub && !isNextJs) parts.push(`${pushedCount} pushed to GitHub`);
    if (isNextJs && canPushToGitHub) parts.push('pushed to GitHub');
    if (netlifyDeployed) parts.push('Netlify deploy triggered');
    else if ((pushedCount > 0 || nextLayoutUpdated) && !website.netlifySiteId) parts.push('no Netlify site linked');

    // Add layout-level changes to results for visibility
    const siteWideChanges: string[] = [];
    if (nextLayoutUpdated) siteWideChanges.push('canonical URLs', 'twitter cards', 'metadataBase');

    return NextResponse.json({
      success: true,
      message: parts.join(' · '),
      results,
      pushed: pushedCount,
      netlifyDeployed,
      siteWideChanges,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
