import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export async function PUT(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) return NextResponse.json({ error: 'Both current and new password required' }, { status: 400 });
  if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: token.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: token.sub }, data: { password: hashedPassword } });

  return NextResponse.json({ success: true });
}
