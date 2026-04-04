import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { websiteId, githubRepoUrl } = await req.json();
    if (!websiteId || !githubRepoUrl) {
      return NextResponse.json({ error: 'websiteId and githubRepoUrl required' }, { status: 400 });
    }

    await prisma.website.update({
      where: { id: websiteId },
      data: { githubRepoUrl },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
