import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import prisma from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = 'TruePath Studios <updates@truepathstudios.com>';
const REPLY_TO = process.env.REPLY_TO_EMAIL || 'info@truepathstudios.com';

// POST /api/audit/[id]/send — send the audit email to the lead
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const audit = await prisma.auditSubmission.findUnique({ where: { id } });

  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!audit.emailSubject || !audit.emailBody) {
    return NextResponse.json({ error: 'Email draft is empty' }, { status: 400 });
  }

  // Convert plain text body to simple HTML
  const htmlBody = audit.emailBody
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#06b6d4;">$1</a>');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <p style="color:#444;font-size:14px;line-height:1.8;">${htmlBody}</p>
    </div>
    <div style="text-align:center;margin-top:24px;color:#999;font-size:12px;">
      <p>TruePath Studios — Web Design & Development</p>
    </div>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: audit.email,
    replyTo: REPLY_TO,
    subject: audit.emailSubject,
    html,
  });

  await prisma.auditSubmission.update({
    where: { id },
    data: { status: 'emailed', sentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
