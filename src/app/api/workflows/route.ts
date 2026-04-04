import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const workflows = await prisma.workflowTemplate.findMany();

    const mapped = workflows.map(w => ({
      ...w,
      workspace_id: w.workspaceId,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
