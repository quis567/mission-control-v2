import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// DELETE — remove an auto-import session and the clients it created
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // Get the search to extract client IDs from its results JSON
    const search = await prisma.prospectorSearch.findUnique({ where: { id } });
    if (!search) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }

    const results = JSON.parse(search.results || '[]') as Array<{ clientId?: string }>;
    const clientIds = results.map((r) => r.clientId).filter(Boolean) as string[];

    // Delete the clients (cascade will handle related notes, websites, etc.)
    if (clientIds.length > 0) {
      await prisma.client.deleteMany({
        where: { id: { in: clientIds } },
      });
    }

    // Delete the search record itself
    await prisma.prospectorSearch.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedClients: clientIds.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
