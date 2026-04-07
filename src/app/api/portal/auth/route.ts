import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { v4 as uuid } from 'uuid';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXTAUTH_URL === 'http://localhost:3000' ? 'http://localhost:3000' : 'https://app.truepathstudios.com';

// POST /api/portal/auth — send magic link or verify token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // --- Send magic link ---
    if (body.action === 'send') {
      const { email } = body;
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

      const client = await prisma.client.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
        select: { id: true, contactName: true, businessName: true, email: true },
      });

      // Always return success even if no client found (don't leak info)
      if (!client) return NextResponse.json({ ok: true });

      const token = uuid();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      await prisma.clientMagicLink.create({
        data: { clientId: client.id, token, expiresAt },
      });

      const loginUrl = `${APP_URL}/portal/verify?token=${token}`;

      await resend.emails.send({
        from: 'TruePath Studios <updates@truepathstudios.com>',
        to: client.email!,
        replyTo: process.env.REPLY_TO_EMAIL || 'updates@truepathstudios.com',
        subject: 'Your login link — TruePath Studios',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${APP_URL}/images/Logo.png" alt="TruePath Studios" style="height:36px;filter:brightness(0);" />
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h2 style="margin:0 0 16px;color:#111;font-size:18px;">Log in to your portal</h2>
      <p style="color:#444;font-size:14px;line-height:1.6;">Hi ${client.contactName || 'there'},</p>
      <p style="color:#444;font-size:14px;line-height:1.6;">Click the button below to access your ${client.businessName} project portal. This link expires in 15 minutes.</p>
      <p style="margin:24px 0;text-align:center;">
        <a href="${loginUrl}" style="display:inline-block;background:#06b6d4;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Log In</a>
      </p>
      <p style="color:#999;font-size:12px;">If you didn't request this, you can ignore this email.</p>
    </div>
    <div style="text-align:center;margin-top:24px;color:#999;font-size:12px;">
      <p>TruePath Studios — Web Design & Development</p>
    </div>
  </div>
</body>
</html>`,
      });

      return NextResponse.json({ ok: true });
    }

    // --- Verify token ---
    if (body.action === 'verify') {
      const { token } = body;
      if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

      const magicLink = await prisma.clientMagicLink.findUnique({
        where: { token },
        include: { client: { select: { id: true, businessName: true, contactName: true, email: true, slug: true, deletedAt: true } } },
      });

      if (!magicLink || magicLink.usedAt || magicLink.expiresAt < new Date() || magicLink.client?.deletedAt) {
        return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 });
      }

      // Mark magic link as used
      await prisma.clientMagicLink.update({ where: { id: magicLink.id }, data: { usedAt: new Date() } });

      // Create portal session (30 days)
      const sessionToken = uuid();
      await prisma.clientPortalSession.create({
        data: {
          clientId: magicLink.clientId,
          token: sessionToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return NextResponse.json({ token: sessionToken, client: magicLink.client });
    }

    // --- Get session ---
    if (body.action === 'session') {
      const { token } = body;
      if (!token) return NextResponse.json({ error: 'No session' }, { status: 401 });

      const session = await prisma.clientPortalSession.findUnique({
        where: { token },
        include: { client: { select: { id: true, businessName: true, contactName: true, email: true, slug: true, deletedAt: true } } },
      });

      if (!session || session.expiresAt < new Date() || session.client?.deletedAt) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }

      return NextResponse.json({ client: session.client });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
