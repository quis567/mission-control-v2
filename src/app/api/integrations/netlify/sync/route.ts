import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  const token = process.env.NETLIFY_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'NETLIFY_ACCESS_TOKEN not configured' }, { status: 400 });

  try {
    const { websiteId, netlifySiteId } = await req.json();

    if (websiteId && netlifySiteId) {
      // Link a specific Netlify site to a website
      await prisma.website.update({
        where: { id: websiteId },
        data: { netlifySiteId },
      });
    }

    // Sync all linked websites
    const linkedWebsites = await prisma.website.findMany({
      where: { netlifySiteId: { not: null } },
    });

    let synced = 0;
    for (const website of linkedWebsites) {
      try {
        const res = await fetch(`https://api.netlify.com/api/v1/sites/${website.netlifySiteId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;

        const site = await res.json();
        const deployState = site.published_deploy?.state;
        const status = deployState === 'ready' ? 'live' : deployState === 'building' ? 'development' : deployState === 'error' ? 'maintenance' : website.status;

        await prisma.website.update({
          where: { id: website.id },
          data: {
            status,
            hostingProvider: 'Netlify',
            sslStatus: site.ssl?.state || null,
            lastUpdated: site.published_deploy?.created_at ? new Date(site.published_deploy.created_at) : undefined,
            domainExpiration: site.ssl?.expires_at ? new Date(site.ssl.expires_at) : undefined,
            ...(site.screenshot_url ? { screenshotUrl: site.screenshot_url, screenshotUpdatedAt: new Date() } : {}),
          },
        });
        synced++;
      } catch { /* skip individual failures */ }
    }

    // Also populate Thum.io screenshots for non-Netlify sites that lack one
    const unscreenshotted = await prisma.website.findMany({
      where: { netlifySiteId: null, screenshotUrl: null, url: { not: '' } },
    });
    for (const site of unscreenshotted) {
      const fullUrl = site.url.startsWith('http') ? site.url : `https://${site.url}`;
      await prisma.website.update({
        where: { id: site.id },
        data: { screenshotUrl: `https://image.thum.io/get/${fullUrl}`, screenshotUpdatedAt: new Date() },
      });
    }

    return NextResponse.json({ synced, total: linkedWebsites.length, thumbnails: unscreenshotted.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
