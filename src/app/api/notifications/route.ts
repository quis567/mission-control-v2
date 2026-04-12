import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/notifications — list recent notifications
export async function GET(req: NextRequest) {
  const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 50);

  const notifications = await prisma.notification.findMany({
    where: unreadOnly ? { read: false } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(notifications);
}

// PATCH /api/notifications — mark notifications as read
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { ids, markAllRead } = body;

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (Array.isArray(ids) && ids.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Provide ids array or markAllRead: true' }, { status: 400 });
}
