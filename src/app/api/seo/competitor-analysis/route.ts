import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { callClaude } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  try {
    const { clientWebsiteId, competitorUrl } = await req.json();

    if (!clientWebsiteId || !competitorUrl) {
      return NextResponse.json({ error: 'clientWebsiteId and competitorUrl required' }, { status: 400 });
    }

    const website = await prisma.website.findUnique({
      where: { id: clientWebsiteId },
      include: {
        client: { select: { businessName: true, businessType: true } },
        seoPages: { select: { pageUrl: true, pageTitle: true, metaDescription: true, targetKeyword: true, seoScore: true } },
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const clientPages = website.seoPages.map(p =>
      `- ${p.pageUrl}: title="${p.pageTitle || 'N/A'}", keyword="${p.targetKeyword || 'N/A'}", score=${p.seoScore || 0}`
    ).join('\n');

    const systemPrompt = `You are an SEO competitive analysis expert. Analyze the competitor's website and compare it with the client's website. Provide actionable insights.

Return your analysis as JSON with this structure:
{
  "competitorStrengths": ["strength 1", "strength 2", ...],
  "clientStrengths": ["strength 1", "strength 2", ...],
  "gaps": ["gap 1", "gap 2", ...],
  "opportunities": ["opportunity 1", "opportunity 2", ...],
  "keywordSuggestions": ["keyword 1", "keyword 2", ...],
  "contentIdeas": ["idea 1", "idea 2", ...],
  "summary": "Brief overall analysis"
}`;

    const userMessage = `Analyze this competitor for SEO comparison:

CLIENT WEBSITE: ${website.url}
CLIENT BUSINESS: ${website.client?.businessName} (${website.client?.businessType || 'unknown type'})
CLIENT SEO PAGES:
${clientPages || 'No pages tracked yet'}

COMPETITOR URL: ${competitorUrl}

Based on the competitor URL and the client's current SEO data, provide a comprehensive competitive analysis. Consider what keywords the competitor might be targeting, content strategies they may be using, and where the client has gaps or opportunities.`;

    const response = await callClaude(systemPrompt, userMessage);

    let analysis;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: response };
    } catch {
      analysis = { summary: response };
    }

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
