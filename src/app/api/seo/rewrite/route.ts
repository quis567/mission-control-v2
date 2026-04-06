import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    const { pageContent, targetKeyword, pageUrl } = await request.json();

    const result = await callClaude(
      'You are an SEO copywriter specializing in local service businesses. You rewrite content to improve SEO while maintaining readability and natural tone. Respond with valid JSON only, no markdown.',
      `Rewrite this page content to optimize for SEO, targeting the keyword "${targetKeyword || 'not specified'}".

Page URL: ${pageUrl || ''}

Guidelines:
- Include the target keyword naturally 2-4 times
- Use the keyword in the first 100 words
- Add relevant H2 and H3 headings with keyword variations
- Keep the tone professional but approachable
- Maintain the same general meaning and information
- Aim for 300+ words
- Include a clear call to action
- Also generate an optimized title tag (50-60 chars) and meta description (150-160 chars)

Original content:
${(pageContent || '').substring(0, 5000)}

Respond in this exact JSON format:
{"title": "optimized page title", "metaDescription": "optimized meta description", "rewrittenContent": "the full rewritten content with headings marked as ## H2 and ### H3", "changes": ["list of key changes made"], "wordCount": 350, "keywordCount": 3}`,
      4096
    );

    const parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim());
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
