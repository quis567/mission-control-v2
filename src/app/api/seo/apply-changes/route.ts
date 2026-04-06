import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/db';

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function githubGet(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function githubPut(path: string, body: any) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json() };
}

// Base folder where client sites live locally
const CLAUDE_CODE_DIR = 'C:\\Users\\msant\\OneDrive\\Desktop\\Claude Code';

function runGitPull(dir: string): Promise<string> {
  return new Promise((resolve) => {
    exec('git pull origin main', { cwd: dir }, (err, stdout, stderr) => {
      resolve(err ? `pull failed: ${stderr}` : stdout.trim());
    });
  });
}

async function syncLocalRepo(repoUrl: string): Promise<string | null> {
  // Scan subdirectories of the Claude Code folder for a git repo matching the remote
  try {
    const entries = await fs.readdir(CLAUDE_CODE_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(CLAUDE_CODE_DIR, entry.name);
      const gitConfigPath = path.join(dir, '.git', 'config');
      try {
        const config = await fs.readFile(gitConfigPath, 'utf8');
        if (config.includes(repoUrl) || config.includes(repoUrl.replace('.git', ''))) {
          const result = await runGitPull(dir);
          return `Synced local: ${dir} — ${result}`;
        }
      } catch { /* no .git/config, skip */ }
    }
  } catch { /* can't read dir */ }
  return null;
}

function applyHtmlChanges(html: string, changes: Record<string, string>): string {
  let result = html;

  if (changes.title) {
    result = result.replace(/<title>[^<]*<\/title>/i, `<title>${changes.title}</title>`);
    if (!/<title>/i.test(result)) {
      result = result.replace(/<\/head>/i, `  <title>${changes.title}</title>\n</head>`);
    }
  }

  if (changes.metaDescription) {
    if (/<meta\s+name=["']description["']/i.test(result)) {
      result = result.replace(
        /<meta\s+name=["']description["']\s+content=["'][^"']*["'][^>]*>/i,
        `<meta name="description" content="${changes.metaDescription}">`
      );
    } else {
      result = result.replace(/<\/head>/i, `  <meta name="description" content="${changes.metaDescription}">\n</head>`);
    }
  }

  if (changes.metaKeywords) {
    if (/<meta\s+name=["']keywords["']/i.test(result)) {
      result = result.replace(
        /<meta\s+name=["']keywords["']\s+content=["'][^"']*["'][^>]*>/i,
        `<meta name="keywords" content="${changes.metaKeywords}">`
      );
    } else {
      result = result.replace(/<\/head>/i, `  <meta name="keywords" content="${changes.metaKeywords}">\n</head>`);
    }
  }

  if (changes.ogTitle) {
    if (/<meta\s+property=["']og:title["']/i.test(result)) {
      result = result.replace(
        /<meta\s+property=["']og:title["']\s+content=["'][^"']*["'][^>]*>/i,
        `<meta property="og:title" content="${changes.ogTitle}">`
      );
    } else {
      result = result.replace(/<\/head>/i, `  <meta property="og:title" content="${changes.ogTitle}">\n</head>`);
    }
  }

  if (changes.ogDescription) {
    if (/<meta\s+property=["']og:description["']/i.test(result)) {
      result = result.replace(
        /<meta\s+property=["']og:description["']\s+content=["'][^"']*["'][^>]*>/i,
        `<meta property="og:description" content="${changes.ogDescription}">`
      );
    } else {
      result = result.replace(/<\/head>/i, `  <meta property="og:description" content="${changes.ogDescription}">\n</head>`);
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    if (!GITHUB_TOKEN) return NextResponse.json({ error: 'GITHUB_ACCESS_TOKEN not configured' }, { status: 500 });

    const { websiteId, pageUrl, changes } = await req.json();
    if (!websiteId || !pageUrl || !changes) return NextResponse.json({ error: 'websiteId, pageUrl, and changes required' }, { status: 400 });

    const website = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!website) return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    if (!website.githubRepoUrl) {
      return NextResponse.json({
        error: 'No GitHub repository linked to this website. Go to Website Settings → Link GitHub Repo.',
        needsGithub: true,
      }, { status: 400 });
    }

    const repo = parseGitHubUrl(website.githubRepoUrl);
    if (!repo) return NextResponse.json({ error: 'Invalid GitHub repo URL' }, { status: 400 });

    // Map page URL to file path — handle both full URLs and paths
    let pathOnly = pageUrl;
    try { pathOnly = new URL(pageUrl).pathname; } catch { /* already a path */ }
    const pagePath = pathOnly === '/' ? '' : pathOnly.replace(/^\//, '').replace(/\/$/, '');
    const candidates = pagePath
      ? [`${pagePath}.html`, `${pagePath}/index.html`]
      : ['index.html'];

    let fileData: any = null;
    let filePath = '';
    for (const candidate of candidates) {
      const data = await githubGet(`/repos/${repo.owner}/${repo.repo}/contents/${candidate}`);
      if (data && data.sha) { fileData = data; filePath = candidate; break; }
    }

    if (!fileData) {
      return NextResponse.json({ error: `Could not find HTML file for ${pageUrl} in ${repo.owner}/${repo.repo}. Tried: ${candidates.join(', ')}` }, { status: 404 });
    }

    // Decode, apply changes, re-encode
    const currentHtml = Buffer.from(fileData.content, 'base64').toString('utf8');
    const updatedHtml = applyHtmlChanges(currentHtml, changes);

    if (currentHtml === updatedHtml) {
      return NextResponse.json({ error: 'No changes detected in HTML' }, { status: 400 });
    }

    const updatedContent = Buffer.from(updatedHtml, 'utf8').toString('base64');
    const changedFields = Object.keys(changes).filter(k => changes[k]);
    const commitMessage = `SEO: Update ${changedFields.join(', ')} for ${pageUrl} — via Command Center`;

    const { ok, data } = await githubPut(`/repos/${repo.owner}/${repo.repo}/contents/${filePath}`, {
      message: commitMessage,
      content: updatedContent,
      sha: fileData.sha,
    });

    if (!ok) {
      return NextResponse.json({ error: `GitHub API error: ${data.message || 'Unknown error'}` }, { status: 500 });
    }

    // Update SeoPage record
    const seoPage = await prisma.seoPage.findFirst({ where: { websiteId, pageUrl } });
    if (seoPage) {
      const updateData: any = {};
      if (changes.title) { updateData.pageTitle = changes.title; updateData.titleLength = changes.title.length; }
      if (changes.metaDescription) { updateData.metaDescription = changes.metaDescription; updateData.metaDescLength = changes.metaDescription.length; }
      if (changes.metaKeywords) updateData.metaKeywords = changes.metaKeywords;
      await prisma.seoPage.update({ where: { id: seoPage.id }, data: updateData });
    }

    // Sync local repo if it exists on this machine
    let localSync: string | null = null;
    try {
      localSync = await syncLocalRepo(`quis567/${repo.repo}`);
    } catch { /* non-critical */ }

    // Trigger Netlify deploy if site has a Netlify ID
    let netlifyDeployed = false;
    const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
    if (NETLIFY_TOKEN && website.netlifySiteId) {
      try {
        const netlifyRes = await fetch(`https://api.netlify.com/api/v1/sites/${website.netlifySiteId}/builds`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${NETLIFY_TOKEN}` },
        });
        netlifyDeployed = netlifyRes.ok;
      } catch { /* non-critical */ }
    }

    return NextResponse.json({
      success: true,
      commitUrl: data.commit?.html_url || `https://github.com/${repo.owner}/${repo.repo}`,
      localSync,
      message: `Changes applied to ${filePath} and committed to GitHub.${localSync ? ' Local files synced.' : ''}${netlifyDeployed ? ' Netlify deploy triggered — live in ~60s.' : ''}`,
    });
  } catch (error) {
    return NextResponse.json({ error: `Apply changes error: ${String(error)}` }, { status: 500 });
  }
}
