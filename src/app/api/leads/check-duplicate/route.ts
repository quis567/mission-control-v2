import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyAuth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response;

  try {
    const { name, phone, website } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const orConditions: any[] = [];
    if (phone) orConditions.push({ phone: { equals: phone.trim() } });
    if (website && website !== 'N/A') {
      orConditions.push({
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

    let existing = null;

    if (orConditions.length > 0) {
      existing = await prisma.client.findFirst({
        where: {
          AND: [
            { businessName: { equals: name.trim(), mode: 'insensitive' } },
            { OR: orConditions },
          ],
        },
        select: { id: true, businessName: true, status: true },
      });
    } else {
      existing = await prisma.client.findFirst({
        where: { businessName: { equals: name.trim(), mode: 'insensitive' } },
        select: { id: true, businessName: true, status: true },
      });
    }

    return NextResponse.json({
      exists: !!existing,
      ...(existing ? { clientId: existing.id, status: existing.status } : {}),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
