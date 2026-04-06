import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// One-time utility to backfill slugs for existing clients
export async function POST() {
  try {
    const clients = await prisma.client.findMany({ where: { slug: null }, select: { id: true, businessName: true } });
    const results: { id: string; businessName: string; slug: string }[] = [];

    for (const c of clients) {
      let slug = c.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const existing = await prisma.client.findUnique({ where: { slug } });
      if (existing) slug = `${slug}-${Date.now().toString(36)}`;
      await prisma.client.update({ where: { id: c.id }, data: { slug } });
      results.push({ id: c.id, businessName: c.businessName, slug });
    }

    return NextResponse.json({ updated: results.length, results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
