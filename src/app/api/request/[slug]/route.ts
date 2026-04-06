import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generatePrompt } from '@/lib/generatePrompt';
import { sendRequestConfirmation, sendAdminNewRequest } from '@/lib/email';

// Public endpoint — no auth required
// GET: fetch client info by slug for form pre-fill
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const client = await prisma.client.findUnique({
      where: { slug },
      select: { id: true, businessName: true, contactName: true, email: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: submit a change request
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const client = await prisma.client.findUnique({
      where: { slug },
      select: { id: true, businessName: true, contactName: true, email: true, websites: { select: { url: true }, take: 1 } },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await request.json();
    const { changeType, pageLocation, details, priority, files } = body;

    if (!changeType || !pageLocation || !details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const hasFiles = files && JSON.parse(files || '[]').length > 0;
    const generatedPrompt = generatePrompt(changeType, pageLocation, details, priority || 'normal', hasFiles);

    const changeRequest = await prisma.changeRequest.create({
      data: {
        clientId: client.id,
        changeType,
        pageLocation,
        details,
        priority: priority || 'normal',
        files: files || null,
        generatedPrompt,
      },
    });

    // Send emails (don't block the response)
    const emailData = { changeType, pageLocation, details, priority: priority || 'normal' };
    Promise.all([
      sendRequestConfirmation(client, emailData).catch(() => {}),
      sendAdminNewRequest(
        { businessName: client.businessName, websiteUrl: client.websites[0]?.url },
        { id: changeRequest.id, ...emailData }
      ).catch(() => {}),
    ]);

    return NextResponse.json(changeRequest, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
