import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { callClaude } from '@/lib/anthropic';

export const maxDuration = 60;

// POST — generate blog post / content ideas for this client based on their
// business type and service area, using Claude.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, deletedAt: null },
    select: { businessName: true, businessType: true, city: true, state: true },
  });
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const niche = client.businessType || 'local service business';
  const location = [client.city, client.state].filter(Boolean).join(', ') || 'the local area';

  const prompt = `I run a ${niche} called "${client.businessName}" in ${location}.

Suggest 8 blog post topics that would rank well in local search and bring in real customers. For each post, include:
- A compelling title
- The target keyword or search phrase
- A one-sentence explanation of why a local customer would search for this
- Estimated search intent (informational, commercial, or transactional)

Focus on topics that:
- Match what local customers actually type into Google
- Have clear commercial intent where possible
- Are easy for a small business to write in 500-800 words
- Include location-specific angles where it makes sense

Respond ONLY with valid JSON in this exact shape:
{
  "suggestions": [
    {
      "title": "...",
      "keyword": "...",
      "rationale": "...",
      "intent": "informational" | "commercial" | "transactional"
    }
  ]
}`;

  try {
    const response = await callClaude(
      'You are a local SEO strategist. Respond only with valid JSON, no markdown, no commentary.',
      prompt,
      3000,
    );

    let parsed: { suggestions?: unknown[] } = {};
    try {
      const match = response.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      /* fall through */
    }

    return NextResponse.json({
      businessName: client.businessName,
      niche,
      location,
      suggestions: parsed.suggestions || [],
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
