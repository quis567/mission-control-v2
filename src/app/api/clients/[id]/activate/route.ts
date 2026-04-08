import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { v4 as uuid } from 'uuid';
import { sendOnboardingEmail } from '@/lib/email';

const APP_URL = process.env.NEXTAUTH_URL === 'http://localhost:3000'
  ? 'http://localhost:3000'
  : 'https://app.truepathstudios.com';

// Onboarding checklist — created as Tasks tied to the client
const ONBOARDING_TASKS: Array<{ title: string; description?: string }> = [
  { title: 'Collect brand assets', description: 'Logo, brand colors, fonts, existing photography' },
  { title: 'Gather website content', description: 'Services, about copy, contact info, business hours' },
  { title: 'Confirm domain access', description: 'Registrar login or DNS delegation for launch' },
  { title: 'Set up GitHub repo' },
  { title: 'Set up Netlify site' },
  { title: 'Design mockups / wireframes' },
  { title: 'Send mockups to client for approval' },
  { title: 'Build website' },
  { title: 'Pre-launch QA (mobile, forms, SEO, speed)' },
  { title: 'Launch website & point DNS' },
  { title: 'Post-launch check-in with client' },
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const sendWelcome: boolean = body.sendWelcome !== false; // default true

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client || client.deletedAt) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // 1. Mark as active
    const updated = await prisma.client.update({
      where: { id },
      data: {
        status: 'active',
        statusChangedAt: new Date(),
        dateAcquired: client.dateAcquired ?? new Date(),
      },
    });

    // 2. Create onboarding checklist tasks (only if the client has none yet, to
    //    avoid duplicates on re-activation).
    const existingOnboardingTasks = await prisma.task.count({
      where: {
        clientId: id,
        title: { in: ONBOARDING_TASKS.map((t) => t.title) },
      },
    });

    let tasksCreated = 0;
    if (existingOnboardingTasks === 0) {
      await prisma.task.createMany({
        data: ONBOARDING_TASKS.map((t) => ({
          title: t.title,
          description: t.description || null,
          status: 'inbox',
          priority: 'normal',
          clientId: id,
        })),
      });
      tasksCreated = ONBOARDING_TASKS.length;
    }

    // 3. Send welcome email (optional)
    let emailSent = false;
    let emailSkippedReason: string | null = null;

    if (sendWelcome) {
      if (!client.email) {
        emailSkippedReason = 'no-email-on-file';
      } else {
        try {
          // Create a magic link with 30-day expiry so the welcome button works
          // for a reasonable onboarding window.
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

          emailSent = true;
        } catch (e) {
          emailSkippedReason = `send-failed: ${String(e)}`;
        }
      }
    }

    return NextResponse.json({
      client: updated,
      emailSent,
      emailSkippedReason,
      tasksCreated,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
