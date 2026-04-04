import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

function calculateLeadScore(lead: any): number {
  let score = 0;
  const wq = (lead.websiteQuality || '').toLowerCase();
  if (wq === 'none' || !lead.website || lead.website === 'N/A') score += 30;
  else if (wq === 'basic' || wq === 'poor') score += 20;
  else if (wq === 'good' || wq === 'professional') score += 5;

  if (!lead.googleBusinessListing) score += 15;
  const rating = parseFloat(lead.googleRating) || 0;
  if (rating > 0 && rating < 4.0) score += 10;
  else if (rating >= 4.5) score += 5;

  const services = lead.servicesOffered || '';
  if (typeof services === 'string' && services.split(',').length >= 3) score += 10;
  if (Array.isArray(services) && services.length >= 3) score += 10;

  score += 10; // assume established
  score += 5;  // local area bonus
  return Math.min(score, 100);
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'Hot';
  if (score >= 40) return 'Warm';
  return 'Cool';
}

export async function POST(req: NextRequest) {
  try {
    const { area, businessTypes, count } = await req.json();
    if (!area || !businessTypes?.length) {
      return NextResponse.json({ error: 'area and businessTypes required' }, { status: 400 });
    }

    const typesStr = businessTypes.join(', ');
    const searchCount = Math.min(count || 15, 25);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `You are a lead generation researcher for a web design and SEO agency called TruePath Studios that serves contractor and trade businesses.

Search for ${searchCount} ${typesStr} businesses in ${area}.

For each business, find:
- Business name
- Type of trade/service
- Phone number
- Website URL (or note "N/A" if they don't have one)
- Google rating (number, or 0 if not found)
- Address/location
- City and state
- Brief description (1-2 sentences)
- Services they offer (comma-separated)
- Assessment of their current website quality: None, Basic, Moderate, Good, or Professional
- Notes about their online presence (1 sentence)

Respond ONLY with a JSON array. No markdown, no code fences, just the raw JSON array. Each object must have these exact fields:
businessName, tradeType, phone, website, googleRating, address, city, state, description, servicesOffered, websiteQuality, onlinePresenceNotes`,
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 500 });
    }

    const data = await response.json();

    // Extract text from response content blocks
    const textContent = data.content
      ?.filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('') || '';

    let leads: any[] = [];
    try {
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) leads = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: 'Failed to parse lead data', raw: textContent }, { status: 500 });
    }

    // Score each lead and generate pitches
    const scoredLeads = leads.map((lead: any) => {
      const leadScore = calculateLeadScore(lead);
      return {
        ...lead,
        leadScore,
        scoreLabel: scoreLabel(leadScore),
      };
    });

    // Generate sales pitches in batch
    const pitchResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are a sales expert for TruePath Studios, a web design and SEO agency specializing in contractor/trade businesses.

For each business below, write a 2-sentence custom sales pitch and recommend a package (Starter $500/mo, Growth $1000/mo, or Premium $2000/mo).

Businesses:
${scoredLeads.map((l: any, i: number) => `${i + 1}. ${l.businessName} (${l.tradeType}) - Website: ${l.website || 'None'} - Quality: ${l.websiteQuality} - Rating: ${l.googleRating}`).join('\n')}

Respond ONLY with a JSON array where each object has: salesPitch, recommendedPackage, pitchAngle. Match the order of businesses above.`,
        }],
      }),
    });

    let pitches: any[] = [];
    if (pitchResponse.ok) {
      const pitchData = await pitchResponse.json();
      const pitchText = pitchData.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || '';
      try {
        const match = pitchText.match(/\[[\s\S]*\]/);
        if (match) pitches = JSON.parse(match[0]);
      } catch { /* */ }
    }

    const results = scoredLeads.map((lead: any, i: number) => ({
      ...lead,
      salesPitch: pitches[i]?.salesPitch || '',
      recommendedPackage: pitches[i]?.recommendedPackage || 'Starter',
      pitchAngle: pitches[i]?.pitchAngle || '',
    }));

    // Sort by score descending
    results.sort((a: any, b: any) => b.leadScore - a.leadScore);

    // Save search to history
    await prisma.prospectorSearch.create({
      data: {
        area,
        businessTypes: JSON.stringify(businessTypes),
        count: searchCount,
        resultsCount: results.length,
        results: JSON.stringify(results),
      },
    });

    return NextResponse.json({ leads: results, total: results.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
