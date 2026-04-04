import { NextRequest } from 'next/server';
import prisma from '@/lib/db';

export const maxDuration = 300; // 5 minutes max for Vercel Functions

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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function generatePitch(lead: any): Promise<{ salesPitch: string; recommendedPackage: string; pitchAngle: string }> {
  try {
    const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `You are a sales expert for TruePath Studios, a web design and SEO agency for contractors.

Write a 2-sentence sales pitch for this business and recommend a package.

Business: ${lead.businessName} (${lead.tradeType})
Website: ${lead.website || 'None'}
Website Quality: ${lead.websiteQuality}
Google Rating: ${lead.googleRating || 'N/A'}
Location: ${lead.city}, ${lead.state}

Packages: Starter $500/mo (website+maintenance+basic SEO), Growth $1000/mo (+full SEO+Google Business), Premium $2000/mo (+content+social media)

Respond ONLY with JSON: {"salesPitch":"...","recommendedPackage":"Starter|Growth|Premium","pitchAngle":"..."}`,
        }],
      }),
    }, 30000); // 30s timeout per pitch

    if (!res.ok) return { salesPitch: '', recommendedPackage: 'Starter', pitchAngle: '' };

    const data = await res.json();
    const text = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch { /* timeout or parse error */ }
  return { salesPitch: '', recommendedPackage: 'Starter', pitchAngle: '' };
}

export async function POST(req: NextRequest) {
  const { area, businessTypes, count } = await req.json();
  if (!area || !businessTypes?.length) {
    return new Response(JSON.stringify({ error: 'area and businessTypes required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const typesStr = businessTypes.join(', ');
  const searchCount = Math.min(count || 15, 25);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send('status', { message: `Searching for ${typesStr} in ${area}...` });

        // Step 1: Find businesses
        const searchRes = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
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
              content: `You are a lead generation researcher for a web design and SEO agency called TruePath Studios.

Search for ${searchCount} ${typesStr} businesses in ${area}.

For each business, find:
- Business name
- Type of trade/service
- Contact name (owner/manager if findable, otherwise null)
- Email address (if findable on their website or listings, otherwise null)
- Phone number
- Website URL (or "N/A" if none)
- Google rating (number, or 0)
- Address
- City and state
- Brief description (1-2 sentences)
- Services they offer (comma-separated)
- Years in business (estimate, or 0)
- Website quality: None, Basic, Moderate, Good, or Professional
- Online presence notes (1 sentence)

Respond ONLY with a JSON array. No markdown, no code fences. Each object must have these exact fields:
businessName, tradeType, contactName, email, phone, website, googleRating, address, city, state, description, servicesOffered, yearsInBusiness, websiteQuality, onlinePresenceNotes`,
            }],
          }),
        }, 120000); // 120s timeout for search

        if (!searchRes.ok) {
          send('error', { message: 'Search API failed. Click Retry to try again.' });
          controller.close();
          return;
        }

        const searchData = await searchRes.json();
        const textContent = searchData.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || '';

        let leads: any[] = [];
        try {
          const jsonMatch = textContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) leads = JSON.parse(jsonMatch[0]);
        } catch {
          send('error', { message: 'Failed to parse search results. Click Retry.' });
          controller.close();
          return;
        }

        send('status', { message: `Found ${leads.length} businesses. Scoring and generating pitches...` });

        // Step 2: Score each lead and generate pitches one at a time
        const allResults: any[] = [];
        for (let i = 0; i < leads.length; i++) {
          const lead = leads[i];
          const leadScore = calculateLeadScore(lead);

          send('status', { message: `Generating pitch for ${lead.businessName} (${i + 1}/${leads.length})...` });

          const pitch = await generatePitch(lead);

          const result = {
            ...lead,
            leadScore,
            scoreLabel: scoreLabel(leadScore),
            ...pitch,
            id: i + 1,
          };

          allResults.push(result);
          send('lead', result);
        }

        // Save search to history
        try {
          await prisma.prospectorSearch.create({
            data: {
              area,
              businessTypes: JSON.stringify(businessTypes),
              count: searchCount,
              resultsCount: allResults.length,
              results: JSON.stringify(allResults),
            },
          });
        } catch { /* non-critical */ }

        send('done', { total: allResults.length });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          send('error', { message: 'Search timed out after 60 seconds. Click Retry to try again.' });
        } else {
          send('error', { message: `Error: ${String(err)}. Click Retry.` });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
