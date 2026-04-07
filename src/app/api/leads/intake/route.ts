import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyAuth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  // Validate API key
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response;

  try {
    const body = await req.json();
    const {
      name,
      type,
      phone,
      email,
      website,
      address,
      area,
      site_score,
      site_reason,
      source,
      // New enrichment fields
      owner_name,
      google_review_count,
      has_facebook,
      has_instagram,
      last_website_update,
      mobile_friendly,
      has_online_booking,
    } = body;

    if (!name || !type || !area) {
      return NextResponse.json(
        { error: 'name, type, and area are required' },
        { status: 400 }
      );
    }

    // Duplicate check: match name AND (phone OR website)
    const normalizedName = name.trim().toLowerCase();
    const conditions: any[] = [
      { businessName: { equals: name.trim(), mode: 'insensitive' as const } },
    ];

    const orConditions: any[] = [];
    if (phone) orConditions.push({ phone: { equals: phone.trim() } });
    if (website && website !== 'N/A') orConditions.push({ websites: { some: { url: { contains: website.replace(/^https?:\/\//, '').replace(/\/$/, ''), mode: 'insensitive' as const } } } });

    let isDuplicate = false;

    if (orConditions.length > 0) {
      // Check name + (phone or website)
      const existing = await prisma.client.findFirst({
        where: {
          AND: [
            { businessName: { equals: name.trim(), mode: 'insensitive' } },
            { OR: orConditions },
          ],
        },
      });
      isDuplicate = !!existing;
    } else {
      // No phone or website — just check name
      const existing = await prisma.client.findFirst({
        where: { businessName: { equals: name.trim(), mode: 'insensitive' } },
      });
      isDuplicate = !!existing;
    }

    if (isDuplicate) {
      return NextResponse.json({ status: 'duplicate', skipped: true });
    }

    // Parse area into city/state
    const areaParts = area.split(',').map((s: string) => s.trim());
    const city = areaParts[0] || null;
    const state = areaParts[1] || null;

    // The incoming site_score is treated as a direct 0-100 lead score
    // Higher = better prospect (Basic website = 70, Good website = 30)
    function parseLeadScore(raw: any): number | null {
      if (raw === null || raw === undefined || raw === 'N/A' || raw === '') return null;
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (isNaN(n)) return null;
      // Clamp to 0-100
      return Math.max(0, Math.min(100, Math.round(n)));
    }
    const leadScoreValue = parseLeadScore(site_score);

    // Derive a quality label from the score
    function scoreToQuality(score: number | null): string {
      if (score === null) return 'Unknown';
      if (score >= 65) return 'None';        // Basic / no website (Hot lead)
      if (score >= 40) return 'Basic';       // Moderate quality
      if (score >= 20) return 'Moderate';    // Decent
      return 'Good';                          // Professional (Cool lead)
    }

    function scoreToLabel(score: number | null): string {
      if (score === null) return 'Warm';
      if (score >= 60) return 'Hot';
      if (score >= 30) return 'Warm';
      return 'Cool';
    }

    // Build tags
    const tags: string[] = [];
    if (leadScoreValue !== null) tags.push(`Lead Score: ${leadScoreValue}`);
    if (source) tags.push(`Source: ${source}`);

    // Create client
    const client = await prisma.client.create({
      data: {
        businessName: name.trim(),
        businessType: type,
        contactName: owner_name || null,
        phone: phone || null,
        email: email || null,
        city,
        state,
        status: 'lead',
        tags: tags.length > 0 ? JSON.stringify(tags) : null,
        ownerName: owner_name || null,
        googleReviewCount: typeof google_review_count === 'number' ? google_review_count : null,
        hasFacebook: typeof has_facebook === 'boolean' ? has_facebook : null,
        hasInstagram: typeof has_instagram === 'boolean' ? has_instagram : null,
        lastWebsiteUpdate: last_website_update || null,
        mobileFriendly: typeof mobile_friendly === 'boolean' ? mobile_friendly : null,
        hasOnlineBooking: typeof has_online_booking === 'boolean' ? has_online_booking : null,
      },
    });

    // Add site audit note
    if (site_reason) {
      await prisma.clientNote.create({
        data: {
          clientId: client.id,
          content: `🌐 Website Audit (Auto):\nLead Score: ${leadScoreValue ?? 'N/A'}/100\n${site_reason}\n\nAddress: ${address || 'N/A'}\nSource: ${source || 'lead-gen-auto'}`,
        },
      });
    }

    // Create website record if URL provided
    if (website && website !== 'N/A' && website !== 'None') {
      const url = website.startsWith('http') ? website : `https://${website}`;
      await prisma.website.create({
        data: {
          clientId: client.id,
          url,
          status: 'live',
        },
      });
    }

    // Also store in ProspectorSearch so it appears on the Prospector page.
    // We append to today's "lead-gen-auto" search for the area, or create a new one.
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingSearch = await prisma.prospectorSearch.findFirst({
        where: {
          area,
          businessTypes: { contains: 'lead-gen-auto' },
          createdAt: { gte: today },
        },
        orderBy: { createdAt: 'desc' },
      });

      const leadEntry: any = {
        id: 0, // will be reassigned
        businessName: name.trim(),
        tradeType: type,
        contactName: owner_name || null,
        email: email || null,
        phone: phone || null,
        website: website || 'N/A',
        ownerName: owner_name || null,
        googleReviewCount: typeof google_review_count === 'number' ? google_review_count : null,
        hasFacebook: typeof has_facebook === 'boolean' ? has_facebook : null,
        hasInstagram: typeof has_instagram === 'boolean' ? has_instagram : null,
        lastWebsiteUpdate: last_website_update || null,
        mobileFriendly: typeof mobile_friendly === 'boolean' ? mobile_friendly : null,
        hasOnlineBooking: typeof has_online_booking === 'boolean' ? has_online_booking : null,
        googleRating: 0,
        address: address || '',
        city: city || '',
        state: state || '',
        description: site_reason || '',
        servicesOffered: '',
        yearsInBusiness: 0,
        websiteQuality: scoreToQuality(leadScoreValue),
        onlinePresenceNotes: site_reason || '',
        leadScore: leadScoreValue ?? 50,
        scoreLabel: scoreToLabel(leadScoreValue),
        salesPitch: '',
        recommendedPackage: 'Starter',
        pitchAngle: '',
        clientId: client.id,
        addedToPipeline: true,
        importedAt: new Date().toISOString(),
      };

      if (existingSearch) {
        const existingResults = JSON.parse(existingSearch.results || '[]');
        leadEntry.id = existingResults.length + 1;
        existingResults.push(leadEntry);
        await prisma.prospectorSearch.update({
          where: { id: existingSearch.id },
          data: {
            results: JSON.stringify(existingResults),
            resultsCount: existingResults.length,
            leadsAdded: { increment: 1 },
          },
        });
      } else {
        leadEntry.id = 1;
        await prisma.prospectorSearch.create({
          data: {
            area,
            businessTypes: JSON.stringify(['lead-gen-auto', type]),
            count: 1,
            resultsCount: 1,
            leadsAdded: 1,
            results: JSON.stringify([leadEntry]),
          },
        });
      }
    } catch (e) {
      // Non-critical — lead is still in CRM, just not in Prospector view
      console.error('Failed to record in ProspectorSearch:', e);
    }

    return NextResponse.json({ status: 'created', id: client.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
