import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendRequestComplete } from '@/lib/email';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.internalNotes !== undefined) data.internalNotes = body.internalNotes;
    if (body.status === 'complete') data.completedAt = new Date();

    const updated = await prisma.changeRequest.update({
      where: { id },
      data,
      include: {
        client: {
          select: { id: true, businessName: true, contactName: true, email: true, slug: true, websites: { select: { url: true }, take: 1 } },
        },
      },
    });

    // Send completion email to client when marked complete
    if (body.status === 'complete') {
      sendRequestComplete(
        { contactName: updated.client.contactName, email: updated.client.email, websiteUrl: updated.client.websites[0]?.url },
        { changeType: updated.changeType, pageLocation: updated.pageLocation }
      ).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
