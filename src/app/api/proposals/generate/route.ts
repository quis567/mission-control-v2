import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { callClaude } from '@/lib/anthropic';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { clientId, packageName, packagePrice, addons, discount, customNotes } = await req.json();
    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        websites: { include: { seoPages: { select: { seoScore: true, issues: true, pageUrl: true } } } },
      },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const website = client.websites?.[0];
    const seoPages = website?.seoPages || [];
    const avgScore = seoPages.length > 0 ? Math.round(seoPages.reduce((s, p) => s + (p.seoScore || 0), 0) / seoPages.length) : null;

    // Collect issues
    let issuesList = '';
    for (const page of seoPages.slice(0, 3)) {
      try {
        const issues = JSON.parse(page.issues || '[]');
        for (const issue of issues.slice(0, 5)) {
          issuesList += `- ${issue.issue} (${issue.importance})\n`;
        }
      } catch {}
    }

    // Calculate totals
    const parsedAddons: { name: string; price: number }[] = addons || [];
    const discountAmount = discount ? (packagePrice || 0) * (discount / 100) : 0;
    const totalOneTime = (packagePrice || 0) - discountAmount;
    const totalMonthly = parsedAddons.reduce((s, a) => s + a.price, 0);

    // Generate proposal number
    const count = await prisma.proposal.count();
    const proposalNumber = `TP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const prompt = `Generate proposal content for this client:

Business Name: ${client.businessName}
Business Type: ${client.businessType || 'Contractor'}
Contact: ${client.contactName || 'Business Owner'}
Location: ${client.city || ''}, ${client.state || 'FL'}
Package: ${packageName || 'Custom'} — $${packagePrice || 0}
Monthly Add-ons: ${parsedAddons.map(a => `${a.name} ($${a.price}/mo)`).join(', ') || 'None'}
Current Website: ${website?.url || 'No website'}
SEO Score: ${avgScore !== null ? `${avgScore}/100` : 'Not audited'}
${issuesList ? `SEO Issues Found:\n${issuesList}` : ''}
${customNotes ? `Custom Notes: ${customNotes}` : ''}

Generate these sections in JSON format:
{
  "executiveSummary": "2-3 paragraphs understanding their business and what they need. Reference their trade and location specifically.",
  "currentAssessment": "Assessment of their current online presence. Use the SEO data if provided. If no website, explain what they're missing.",
  "solution": "3-4 paragraphs about what we'll build and why it works for their specific business.",
  "keyBenefits": ["benefit 1 specific to their trade", "benefit 2", "benefit 3", "benefit 4"],
  "timeline": "Brief project timeline description"
}`;

    const response = await callClaude(
      'You are a proposal writer for TruePath Studios, a web design and SEO agency specializing in trades and construction businesses. Write professional, persuasive content specific to each client. No generic filler. Respond only with valid JSON.',
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
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const proposal = await prisma.proposal.create({
      data: {
        proposalNumber,
        clientId,
        packageName: packageName || 'Custom',
        packagePrice: packagePrice || 0,
        addons: JSON.stringify(parsedAddons),
        discount: discount || null,
        totalOneTime,
        totalMonthly,
        content: JSON.stringify(content),
        status: 'draft',
        validUntil,
      },
    });

    return NextResponse.json({
      id: proposal.id,
      proposalNumber,
      content,
      packageName: packageName || 'Custom',
      packagePrice: packagePrice || 0,
      addons: parsedAddons,
      totalOneTime,
      totalMonthly,
      clientName: client.businessName,
      contactName: client.contactName,
      validUntil: validUntil.toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
