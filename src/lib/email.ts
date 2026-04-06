import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = 'TruePath Studios <updates@truepathstudios.com>';
const REPLY_TO = process.env.REPLY_TO_EMAIL || 'updates@truepathstudios.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'updates@truepathstudios.com';
const APP_URL = process.env.NEXTAUTH_URL || 'https://app.truepathstudios.com';

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${APP_URL}/images/Logo.png" alt="TruePath Studios" style="height:36px;filter:brightness(0);" />
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;color:#999;font-size:12px;">
      <p>TruePath Studios — Web Design & Development</p>
    </div>
  </div>
</body>
</html>`;
}

// Email 1: Request confirmation (to client)
export async function sendRequestConfirmation(client: {
  contactName: string | null;
  email: string | null;
}, request: {
  changeType: string;
  pageLocation: string;
  details: string;
  priority: string;
}) {
  if (!client.email) return;

  const truncatedDetails = request.details.length > 200
    ? request.details.substring(0, 200) + '...'
    : request.details;

  const timeframe = request.priority === 'urgent' ? 'same day' : '24–48 hours';

  const html = emailWrapper(`
    <h2 style="margin:0 0 16px;color:#111;font-size:18px;">We got your request</h2>
    <p style="color:#444;margin:0 0 20px;font-size:14px;line-height:1.6;">
      Hi ${client.contactName || 'there'},
    </p>
    <p style="color:#444;margin:0 0 20px;font-size:14px;line-height:1.6;">
      We received your website change request:
    </p>
    <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 20px;">
      <table style="width:100%;font-size:14px;color:#444;">
        <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#111;width:80px;">What</td><td style="padding:4px 0;">${request.changeType}</td></tr>
        <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#111;">Where</td><td style="padding:4px 0;">${request.pageLocation}</td></tr>
        <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#111;">Details</td><td style="padding:4px 0;">${truncatedDetails}</td></tr>
        <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#111;">Priority</td><td style="padding:4px 0;">${request.priority === 'urgent' ? '🔴 Urgent' : 'Normal'}</td></tr>
      </table>
    </div>
    <p style="color:#444;margin:0;font-size:14px;line-height:1.6;">
      We'll take care of this and let you know when it's done. Most changes are completed within <strong>${timeframe}</strong>.
    </p>
    <p style="color:#444;margin:20px 0 0;font-size:14px;">Thanks,<br/>TruePath Studios</p>
  `);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: client.email,
    replyTo: REPLY_TO,
    subject: `We got your request — ${request.changeType}`,
    html,
  });
}

// Email 2: Request complete (to client)
export async function sendRequestComplete(client: {
  contactName: string | null;
  email: string | null;
  websiteUrl?: string | null;
}, request: {
  changeType: string;
  pageLocation: string;
}) {
  if (!client.email) return;

  const html = emailWrapper(`
    <h2 style="margin:0 0 16px;color:#111;font-size:18px;">Your website has been updated</h2>
    <p style="color:#444;margin:0 0 20px;font-size:14px;line-height:1.6;">
      Hi ${client.contactName || 'there'},
    </p>
    <p style="color:#444;margin:0 0 20px;font-size:14px;line-height:1.6;">
      The change you requested has been made and is live on your site:
    </p>
    <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 20px;">
      <table style="width:100%;font-size:14px;color:#444;">
        <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#111;width:100px;">What changed</td><td style="padding:4px 0;">${request.changeType}</td></tr>
        <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#111;">Where</td><td style="padding:4px 0;">${request.pageLocation}</td></tr>
      </table>
    </div>
    ${client.websiteUrl ? `
    <p style="margin:0 0 20px;">
      <a href="${client.websiteUrl}" style="display:inline-block;background:#06b6d4;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">View your site</a>
    </p>` : ''}
    <p style="color:#444;margin:0;font-size:14px;line-height:1.6;">
      Take a look and let us know if anything needs adjusting.
    </p>
    <p style="color:#444;margin:20px 0 0;font-size:14px;">Thanks,<br/>TruePath Studios</p>
  `);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: client.email,
    replyTo: REPLY_TO,
    subject: 'Your website has been updated',
    html,
  });
}

// Email 3: New request alert (to admin)
export async function sendAdminNewRequest(client: {
  businessName: string;
  websiteUrl?: string | null;
}, request: {
  id: string;
  changeType: string;
  pageLocation: string;
  details: string;
  priority: string;
}) {
  const urgentPrefix = request.priority === 'urgent' ? '[Urgent] ' : '';

  const html = emailWrapper(`
    <h2 style="margin:0 0 16px;color:#111;font-size:18px;">${urgentPrefix}New request from ${client.businessName}</h2>
    <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 20px;">
      <table style="width:100%;font-size:14px;color:#444;">
        ${client.websiteUrl ? `<tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#111;width:80px;">Website</td><td style="padding:4px 0;"><a href="${client.websiteUrl}" style="color:#06b6d4;">${client.websiteUrl}</a></td></tr>` : ''}
        <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#111;">What</td><td style="padding:4px 0;">${request.changeType}</td></tr>
        <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#111;">Where</td><td style="padding:4px 0;">${request.pageLocation}</td></tr>
        <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#111;">Priority</td><td style="padding:4px 0;">${request.priority === 'urgent' ? '🔴 Urgent' : 'Normal'}</td></tr>
      </table>
    </div>
    <p style="color:#444;margin:0 0 20px;font-size:14px;line-height:1.6;"><strong>Details:</strong><br/>${request.details}</p>
    <p style="margin:0;">
      <a href="${APP_URL}/requests" style="display:inline-block;background:#06b6d4;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">View in Mission Control</a>
    </p>
  `);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_EMAIL,
    replyTo: REPLY_TO,
    subject: `${urgentPrefix}New request from ${client.businessName} — ${request.changeType}`,
    html,
  });
}
