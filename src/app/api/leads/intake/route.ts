import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyAuth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  // Validate API key
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response;

  try {
    const body = await req.json();
    const { name, type, phone, email, website, address, area, site_score, site_reason, source } = body;

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

    // Build tags
    const tags: string[] = [];
    if (site_score && site_score !== 'N/A') tags.push(`Site Score: ${site_score}`);
    if (source) tags.push(`Source: ${source}`);

    // Create client
    const client = await prisma.client.create({
      data: {
        businessName: name.trim(),
        businessType: type,
        phone: phone || null,
        email: email || null,
        city,
        state,
        status: 'lead',
        tags: tags.length > 0 ? JSON.stringify(tags) : null,
      },
    });

    // Add site audit note
    if (site_reason) {
      await prisma.clientNote.create({
        data: {
          clientId: client.id,
          content: `🌐 Website Audit (Auto):\nScore: ${site_score || 'N/A'}/10\n${site_reason}\n\nAddress: ${address || 'N/A'}\nSource: ${source || 'lead-gen-auto'}`,
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

    return NextResponse.json({ status: 'created', id: client.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
