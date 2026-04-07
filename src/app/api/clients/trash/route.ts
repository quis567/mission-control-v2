import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/clients/trash — list soft-deleted clients (within 7 days)
export async function GET() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const clients = await prisma.client.findMany({
      where: { deletedAt: { not: null, gte: sevenDaysAgo } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        contactName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        businessType: true,
        status: true,
        deletedAt: true,
        _count: { select: { websites: true, services: true, tasks: true, notes: true } },
      },
    });

    const now = Date.now();
    const enriched = clients.map(c => {
      const deletedMs = c.deletedAt ? c.deletedAt.getTime() : now;
      const purgeAt = new Date(deletedMs + 7 * 24 * 60 * 60 * 1000);
      const hoursLeft = Math.max(0, Math.round((purgeAt.getTime() - now) / (1000 * 60 * 60)));
      return { ...c, purgeAt: purgeAt.toISOString(), hoursLeft };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
