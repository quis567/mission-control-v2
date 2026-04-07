import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { leads } = await req.json();
    if (!leads?.length) {
      return NextResponse.json({ error: 'leads array required' }, { status: 400 });
    }

    const results = [];

    for (const lead of leads) {
      // Check for duplicate
      const existing = await prisma.client.findFirst({
        where: { businessName: { equals: lead.businessName, mode: 'insensitive' }, deletedAt: null },
      });

      if (existing) {
        results.push({ businessName: lead.businessName, status: 'duplicate', clientId: existing.id });
        continue;
      }

      // Create client
      const tags = [
        `Lead Score: ${lead.leadScore || 0}`,
        `Web Presence: ${lead.websiteQuality || 'Unknown'}`,
      ];

      const client = await prisma.client.create({
        data: {
          businessName: lead.businessName,
          contactName: lead.contactName || null,
          phone: lead.phone || null,
          email: lead.email || null,
          businessType: lead.tradeType || null,
          city: lead.city || null,
          state: lead.state || null,
          status: 'lead',
          tags: JSON.stringify(tags),
        },
      });

      // Add sales pitch as note
      if (lead.salesPitch) {
        await prisma.clientNote.create({
          data: {
            clientId: client.id,
            content: `🎯 AI Sales Pitch:\n${lead.salesPitch}\n\nRecommended Package: ${lead.recommendedPackage || 'Starter'}\nAngle: ${lead.pitchAngle || ''}\n\nOnline Presence: ${lead.onlinePresenceNotes || ''}\nWebsite: ${lead.website || 'None'}\nGoogle Rating: ${lead.googleRating || 'N/A'}`,
          },
        });
      }

      // If they have a website, create a website record
      if (lead.website && lead.website !== 'N/A' && lead.website.startsWith('http')) {
        await prisma.website.create({
          data: {
            clientId: client.id,
            url: lead.website,
            status: 'live',
          },
        });
      }

      results.push({ businessName: lead.businessName, status: 'added', clientId: client.id });
    }

    // Update search leadsAdded count
    const addedCount = results.filter(r => r.status === 'added').length;
    if (addedCount > 0) {
      const latestSearch = await prisma.prospectorSearch.findFirst({ orderBy: { createdAt: 'desc' } });
      if (latestSearch) {
        await prisma.prospectorSearch.update({
          where: { id: latestSearch.id },
          data: { leadsAdded: { increment: addedCount } },
        });
      }
    }

    return NextResponse.json({ results, added: addedCount, duplicates: results.filter(r => r.status === 'duplicate').length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
