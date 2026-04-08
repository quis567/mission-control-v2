import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Public webhook — client websites POST form submissions here.
// URL: /api/leads/webhook/<leadWebhookKey>
// Body (JSON or form-encoded): { name, email, phone, subject, message, source, pageUrl, ...extras }
export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!key) return NextResponse.json({ error: 'missing key' }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { leadWebhookKey: key, deletedAt: null },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: 'invalid key' }, { status: 404 });

  // Accept JSON or form-encoded.
  const contentType = request.headers.get('content-type') || '';
  let payload: Record<string, unknown> = {};
  try {
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const form = await request.formData();
      form.forEach((v, k) => { payload[k] = typeof v === 'string' ? v : String(v); });
    }
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const str = (k: string) => {
    const v = payload[k];
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, 2000) : null;
  };

  // Pull known fields; stash everything else in meta.
  const known = ['name', 'email', 'phone', 'subject', 'message', 'source', 'pageUrl', 'page_url'];
  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!known.includes(k)) extras[k] = v;
  }

  const submission = await prisma.leadSubmission.create({
    data: {
      clientId: client.id,
      name: str('name'),
      email: str('email'),
      phone: str('phone'),
      subject: str('subject'),
      message: str('message'),
      source: str('source') || 'webhook',
      pageUrl: str('pageUrl') || str('page_url'),
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent')?.slice(0, 500) || null,
      meta: Object.keys(extras).length ? JSON.stringify(extras) : null,
    },
  });

  return NextResponse.json(
    { ok: true, id: submission.id },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    },
  });
}
