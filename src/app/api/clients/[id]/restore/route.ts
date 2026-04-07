import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// POST /api/clients/[id]/restore — un-soft-delete a client and reclaim its slug
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, businessName: true, slug: true, deletedAt: true },
    });

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    if (!client.deletedAt) return NextResponse.json({ error: 'Client is not deleted' }, { status: 400 });

    // Try to give it back its original slug. If something else has taken it, generate a new one.
    let restoredSlug = generateSlug(client.businessName);
    const conflict = await prisma.client.findUnique({ where: { slug: restoredSlug } });
    if (conflict) restoredSlug = `${restoredSlug}-${Date.now().toString(36)}`;

    const restored = await prisma.client.update({
      where: { id },
      data: { deletedAt: null, slug: restoredSlug },
    });

    return NextResponse.json(restored);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
