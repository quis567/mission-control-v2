import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { v4 as uuid } from 'uuid';
import { sendOnboardingEmail } from '@/lib/email';

const APP_URL = process.env.NEXTAUTH_URL === 'http://localhost:3000'
  ? 'http://localhost:3000'
  : 'https://app.truepathstudios.com';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client || client.deletedAt) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    if (!client.email) {
      return NextResponse.json({ error: 'No email on file' }, { status: 400 });
    }

    const token = uuid();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.clientMagicLink.create({
      data: { clientId: id, token, expiresAt },
    });

    const loginUrl = `${APP_URL}/portal/verify?token=${token}`;

    await sendOnboardingEmail(
      {
        contactName: client.contactName,
        businessName: client.businessName,
        email: client.email,
      },
      loginUrl
    );

    await prisma.client.update({
      where: { id },
      data: { onboardingEmailSentAt: new Date() },
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
