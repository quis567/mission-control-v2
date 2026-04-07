import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Fetch recent automated lead-gen imports (from MCP server / Cowork runs)
export async function GET() {
  try {
    const searches = await prisma.prospectorSearch.findMany({
      where: {
        businessTypes: { contains: 'lead-gen-auto' },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const imports = searches.map((s) => ({
      id: s.id,
      area: s.area,
      createdAt: s.createdAt,
      leadsCount: s.resultsCount,
      leads: JSON.parse(s.results || '[]'),
    }));

    return NextResponse.json({ imports });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
