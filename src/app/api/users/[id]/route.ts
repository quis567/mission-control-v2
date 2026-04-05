import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

async function requireAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return { authorized: false as const, status: 401, message: 'Not authenticated' };
  if (token.role !== 'admin') return { authorized: false as const, status: 403, message: 'Admin access required' };
  return { authorized: true as const, userId: token.sub! };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;
  const { name, role, password } = await req.json();

  // Prevent demoting yourself
  if (id === auth.userId && role && role !== 'admin') {
    return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 });
  }

  // Prevent demoting the last admin
  if (role === 'member') {
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === 'admin' && adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot demote the last admin' }, { status: 400 });
    }
  }

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (role) data.role = role;
  if (password) {
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    data.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;

  // Prevent self-delete
  if (id === auth.userId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

  // Prevent deleting last admin
  const target = await prisma.user.findUnique({ where: { id } });
  if (target?.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    if (adminCount <= 1) return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 });
  }

  // Delete sessions first, then user
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
