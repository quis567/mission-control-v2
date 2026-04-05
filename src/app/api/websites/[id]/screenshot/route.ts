import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const website = await prisma.website.findUnique({ where: { id } });
    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    let screenshotUrl: string | null = null;

    // Try Netlify screenshot first
    if (website.netlifySiteId) {
      const token = process.env.NETLIFY_ACCESS_TOKEN;
      if (token) {
        const res = await fetch(`https://api.netlify.com/api/v1/sites/${website.netlifySiteId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const site = await res.json();
          if (site.screenshot_url) {
            screenshotUrl = site.screenshot_url;
          }
        }
      }
    }

    // Fallback to Thum.io for external sites
    if (!screenshotUrl && website.url) {
      const fullUrl = website.url.startsWith('http') ? website.url : `https://${website.url}`;
      screenshotUrl = `https://image.thum.io/get/${fullUrl}?t=${Date.now()}`;
    }

    if (screenshotUrl) {
      const updated = await prisma.website.update({
        where: { id },
        data: { screenshotUrl, screenshotUpdatedAt: new Date() },
      });
      return NextResponse.json({ screenshotUrl: updated.screenshotUrl, screenshotUpdatedAt: updated.screenshotUpdatedAt });
    }

    return NextResponse.json({ error: 'Could not generate screenshot' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
