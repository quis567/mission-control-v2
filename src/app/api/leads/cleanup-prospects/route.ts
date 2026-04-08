import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * Cleanup endpoint: finds Clients that were auto-created by the old
 * /api/leads/intake behavior (which incorrectly inserted scraped leads
 * into the Clients table) and moves them back into ProspectorSearch.
 *
 * Identification: clients with status='lead' that have a ClientNote
 * starting with the auto-audit marker "🌐 Website Audit (Auto)".
 *
 * Pass ?dryRun=1 to preview without mutating.
 */
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dryRun') === '1';

    // Find candidate clients: status=lead, not deleted, have the auto-audit note
    const candidates = await prisma.client.findMany({
      where: {
        status: 'lead',
        deletedAt: null,
        notes: {
          some: { content: { startsWith: '🌐 Website Audit (Auto)' } },
        },
      },
      include: {
        notes: { where: { content: { startsWith: '🌐 Website Audit (Auto)' } } },
        websites: true,
      },
    });

    const summary = {
      found: candidates.length,
      movedToProspector: 0,
      softDeleted: 0,
      searchesCreated: 0,
      searchesUpdated: 0,
      dryRun,
      samples: candidates.slice(0, 5).map((c) => ({
        id: c.id,
        name: c.businessName,
        city: c.city,
        state: c.state,
      })),
    };

    if (dryRun || candidates.length === 0) {
      return NextResponse.json(summary);
    }

    // Group candidates by area (city, state) so we can attach them to one
    // per-area "lead-gen-auto" ProspectorSearch each.
    const byArea = new Map<string, typeof candidates>();
    for (const c of candidates) {
      const area = [c.city, c.state].filter(Boolean).join(', ') || 'Unknown';
      const arr = byArea.get(area) ?? [];
      arr.push(c);
      byArea.set(area, arr);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const [area, group] of byArea.entries()) {
      // Find or create today's lead-gen-auto search for this area
      let search = await prisma.prospectorSearch.findFirst({
        where: {
          area,
          businessTypes: { contains: 'lead-gen-auto' },
          createdAt: { gte: today },
        },
        orderBy: { createdAt: 'desc' },
      });

      let results: any[] = [];
      if (search) {
        results = JSON.parse(search.results || '[]');
      }

      // Set of existing names in this search (lowercased) to avoid duplicates
      const existingNames = new Set(
        results.map((r: any) => (r.businessName || '').trim().toLowerCase())
      );

      let added = 0;
      for (const c of group) {
        const nameKey = c.businessName.trim().toLowerCase();
        if (existingNames.has(nameKey)) continue;
        existingNames.add(nameKey);

        // Parse the audit note for lead score + reason if present
        const noteContent = c.notes[0]?.content || '';
        const scoreMatch = noteContent.match(/Lead Score:\s*(\d+)\/100/);
        const leadScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;
        const reasonMatch = noteContent.match(/Lead Score:.*\n([\s\S]*?)(?:\n\nAddress:|$)/);
        const siteReason = reasonMatch ? reasonMatch[1].trim() : '';

        const primaryWebsite = c.websites[0]?.url || 'N/A';

        results.push({
          id: results.length + 1,
          businessName: c.businessName,
          tradeType: c.businessType || '',
          contactName: c.contactName || null,
          email: c.email || null,
          phone: c.phone || null,
          website: primaryWebsite,
          ownerName: c.ownerName || null,
          googleReviewCount: c.googleReviewCount ?? null,
          hasFacebook: c.hasFacebook ?? null,
          hasInstagram: c.hasInstagram ?? null,
          lastWebsiteUpdate: c.lastWebsiteUpdate ?? null,
          mobileFriendly: c.mobileFriendly ?? null,
          hasOnlineBooking: c.hasOnlineBooking ?? null,
          googleRating: 0,
          address: '',
          city: c.city || '',
          state: c.state || '',
          description: siteReason,
          servicesOffered: '',
          yearsInBusiness: 0,
          websiteQuality: leadScore >= 65 ? 'None' : leadScore >= 40 ? 'Basic' : leadScore >= 20 ? 'Moderate' : 'Good',
          onlinePresenceNotes: siteReason,
          leadScore,
          scoreLabel: leadScore >= 60 ? 'Hot' : leadScore >= 30 ? 'Warm' : 'Cool',
          salesPitch: '',
          recommendedPackage: 'Starter',
          pitchAngle: '',
          clientId: null,
          addedToPipeline: false,
          importedAt: new Date().toISOString(),
          source: 'lead-gen-auto',
          siteReason,
          migratedFromClientId: c.id,
        });
        added++;
      }

      if (added === 0) continue;

      if (search) {
        await prisma.prospectorSearch.update({
          where: { id: search.id },
          data: {
            results: JSON.stringify(results),
            resultsCount: results.length,
          },
        });
        summary.searchesUpdated++;
      } else {
        await prisma.prospectorSearch.create({
          data: {
            area,
            businessTypes: JSON.stringify(['lead-gen-auto']),
            count: added,
            resultsCount: added,
            leadsAdded: 0,
            results: JSON.stringify(results),
          },
        });
        summary.searchesCreated++;
      }
      summary.movedToProspector += added;
    }

    // Soft-delete the candidate clients so they leave the pipeline
    const ids = candidates.map((c) => c.id);
    const del = await prisma.client.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });
    summary.softDeleted = del.count;

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
