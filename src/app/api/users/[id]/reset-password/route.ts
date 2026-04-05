import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const { id } = await params;
  const { newPassword } = await req.json();
  if (!newPassword || newPassword.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id }, data: { password: hashedPassword } });

  return NextResponse.json({ success: true });
}
