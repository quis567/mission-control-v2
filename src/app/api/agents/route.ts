import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Map to snake_case for frontend compatibility
    const mapped = agents.map(a => ({
      ...a,
      soul_md: a.soulMd,
      workspace_id: a.workspaceId,
      created_at: a.createdAt.toISOString(),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
