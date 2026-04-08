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
      // Enrichment fields
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

    const trimmedName = name.trim();

    // ---- Dedupe check 1: existing Client in the CRM ----
    // If this business is already a client (in any status), skip — we don't
    // want to re-prospect someone already being worked.
    const clientOr: any[] = [];
    if (phone) clientOr.push({ phone: { equals: phone.trim() } });
    if (website && website !== 'N/A') {
      clientOr.push({
        websites: {
          some: {
            url: {
              contains: website.replace(/^https?:\/\//, '').replace(/\/$/, ''),
              mode: 'insensitive' as const,
            },
          },
        },
      });
    }

    const existingClient = await prisma.client.findFirst({
      where: clientOr.length > 0
        ? {
            AND: [
              { businessName: { equals: trimmedName, mode: 'insensitive' } },
              { OR: clientOr },
              { deletedAt: null },
            ],
          }
        : { businessName: { equals: trimmedName, mode: 'insensitive' }, deletedAt: null },
    });

    if (existingClient) {
      return NextResponse.json({ status: 'duplicate-client', skipped: true });
    }

    // Parse area into city/state
    const areaParts = area.split(',').map((s: string) => s.trim());
    const city = areaParts[0] || null;
    const state = areaParts[1] || null;

    // Lead score + quality labels
    function parseLeadScore(raw: any): number | null {
      if (raw === null || raw === undefined || raw === 'N/A' || raw === '') return null;
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (isNaN(n)) return null;
      return Math.max(0, Math.min(100, Math.round(n)));
    }
    function scoreToQuality(score: number | null): string {
      if (score === null) return 'Unknown';
      if (score >= 65) return 'None';
      if (score >= 40) return 'Basic';
      if (score >= 20) return 'Moderate';
      return 'Good';
    }
    function scoreToLabel(score: number | null): string {
      if (score === null) return 'Warm';
      if (score >= 60) return 'Hot';
      if (score >= 30) return 'Warm';
      return 'Cool';
    }
    const leadScoreValue = parseLeadScore(site_score);

    // ---- Dedupe check 2: existing Prospector entry in today's search ----
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
      id: 0, // reassigned below
      businessName: trimmedName,
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
      clientId: null,
      addedToPipeline: false,
      importedAt: new Date().toISOString(),
      source: source || 'lead-gen-auto',
      siteReason: site_reason || null,
    };

    if (existingSearch) {
      const existingResults = JSON.parse(existingSearch.results || '[]');

      // Dedupe inside this search by name
      const dupInProspector = existingResults.some(
        (r: any) => (r.businessName || '').trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (dupInProspector) {
        return NextResponse.json({ status: 'duplicate-prospect', skipped: true });
      }

      leadEntry.id = existingResults.length + 1;
      existingResults.push(leadEntry);
      await prisma.prospectorSearch.update({
        where: { id: existingSearch.id },
        data: {
          results: JSON.stringify(existingResults),
          resultsCount: existingResults.length,
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
          leadsAdded: 0,
          results: JSON.stringify([leadEntry]),
        },
      });
    }

    return NextResponse.json({ status: 'prospected' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
