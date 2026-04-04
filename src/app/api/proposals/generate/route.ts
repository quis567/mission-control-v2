import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { callClaude } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  try {
    const { clientId, packageId, customPrice, notes } = await req.json();
    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { websites: { take: 1 }, package: true },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    let pkg = null;
    if (packageId) {
      pkg = await prisma.package.findUnique({ where: { id: packageId } });
    } else if (client.packageId) {
      pkg = client.package;
    }

    const pkgName = pkg?.name || 'Custom';
    const pkgPrice = customPrice || pkg?.price || 0;
    const website = client.websites?.[0];

    const prompt = `You are a proposal writer for TruePath Studios, a web design and SEO agency specializing in contractor and trade businesses in Central Florida.

Generate a professional proposal for this client:

Client: ${client.businessName}
Contact: ${client.contactName || 'Business Owner'}
Trade: ${client.businessType || 'Contractor'}
Location: ${client.city || ''}, ${client.state || 'FL'}
Current Website: ${website?.url || 'None'}
Package: ${pkgName} — $${pkgPrice}/mo
${notes ? `Additional Notes: ${notes}` : ''}

Write these sections in professional, persuasive language:

1. EXECUTIVE_SUMMARY — 2-3 paragraphs about their specific situation and how we can help. Reference their business type and location specifically.

2. WEBSITE_AUDIT — If they have a website, provide 3-4 specific observations about what could be improved. If no website, explain what they're missing out on (local SEO, credibility, lead generation). Be specific to their trade.

3. DELIVERABLES — Bulleted list of exactly what's included in their package. Be specific (e.g., "5-page responsive website" not just "website").

4. TIMELINE — Realistic project timeline with milestones.

5. WHY_TRUEPATH — 3-4 compelling reasons to choose us. Focus on specialization in contractor/trade businesses, local Central Florida presence, and results.

6. NEXT_STEPS — Clear call to action. What they need to do to get started.

Respond ONLY with JSON:
{
  "executiveSummary": "...",
  "websiteAudit": "...",
  "deliverables": ["item1", "item2"],
  "timeline": [{"phase": "...", "duration": "...", "description": "..."}],
  "whyTruePath": ["reason1", "reason2"],
  "nextSteps": "..."
}`;

    const response = await callClaude(
      'You are a professional proposal writer. Respond only with valid JSON.',
      prompt,
      4096
    );

    let content;
    try {
      const match = response.match(/\{[\s\S]*\}/);
      content = match ? JSON.parse(match[0]) : { executiveSummary: response };
    } catch {
      content = { executiveSummary: response };
    }

    // Save proposal
    const proposal = await prisma.proposal.create({
      data: {
        clientId,
        packageId: packageId || client.packageId || null,
        content: JSON.stringify(content),
        customPrice: customPrice ? parseFloat(customPrice) : null,
        status: 'draft',
      },
    });

    return NextResponse.json({
      id: proposal.id,
      content,
      packageName: pkgName,
      packagePrice: pkgPrice,
      clientName: client.businessName,
      contactName: client.contactName,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
