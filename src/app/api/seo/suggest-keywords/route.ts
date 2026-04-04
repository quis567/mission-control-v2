import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    const { pageContent, pageUrl, businessType, location } = await request.json();

    const result = await callClaude(
      'You are an SEO expert specializing in local service businesses. Respond with valid JSON only, no markdown.',
      `Analyze this page and suggest 5-10 target keywords. Consider the business type and location for local SEO.

Page URL: ${pageUrl || 'not specified'}
Business type: ${businessType || 'not specified'}
Location: ${location || 'not specified'}

Page content:
${(pageContent || '').substring(0, 3000)}

Respond in this exact JSON format:
{"keywords": [{"keyword": "example keyword", "relevance": "high", "searchIntent": "commercial", "reasoning": "brief explanation"}]}

Relevance should be: high, medium, or low.
Search intent should be: commercial, informational, navigational, or transactional.`,
      1500
    );

    const parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim());
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
