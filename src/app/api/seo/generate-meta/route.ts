import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    const { pageContent, targetKeyword, currentTitle, currentDescription } = await request.json();

    const result = await callClaude(
      'You are an SEO expert specializing in local service businesses. Respond with valid JSON only, no markdown.',
      `Generate an optimized title tag (50-60 characters) and meta description (150-160 characters) for this page.

Target keyword: "${targetKeyword || 'not specified'}"
Current title: "${currentTitle || 'none'}"
Current description: "${currentDescription || 'none'}"

Page content:
${(pageContent || '').substring(0, 3000)}

Respond in this exact JSON format:
{"title": "your optimized title here", "titleLength": 55, "description": "your optimized meta description here", "descriptionLength": 155, "reasoning": "brief explanation of choices"}`,
      1000
    );

    const parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim());
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
