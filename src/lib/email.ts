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

// Email 4: Welcome / onboarding (to client)
export async function sendOnboardingEmail(client: {
  contactName: string | null;
  businessName: string;
  email: string | null;
}, loginUrl: string) {
  if (!client.email) return;

  const html = emailWrapper(`
    <h2 style="margin:0 0 16px;color:#111;font-size:20px;">Welcome to TruePath Studios</h2>
    <p style="color:#444;margin:0 0 16px;font-size:14px;line-height:1.6;">
      Hi ${client.contactName || 'there'},
    </p>
    <p style="color:#444;margin:0 0 16px;font-size:14px;line-height:1.6;">
      Thanks for choosing TruePath Studios to handle ${client.businessName}'s website. We're excited to get started. This email has everything you need to know about working with us.
    </p>

    <h3 style="margin:28px 0 10px;color:#111;font-size:15px;">Your client portal</h3>
    <p style="color:#444;margin:0 0 16px;font-size:14px;line-height:1.6;">
      You have your own portal where you can view your site, track its health, see SEO reports, and request edits any time. Click the button below to log in — no password needed.
    </p>
    <p style="margin:20px 0;text-align:center;">
      <a href="${loginUrl}" style="display:inline-block;background:#06b6d4;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Open My Portal</a>
    </p>
    <p style="color:#777;margin:0 0 20px;font-size:12px;line-height:1.6;text-align:center;">
      This login link is active for 30 days. After that, you can request a new one from the login page any time.
    </p>

    <h3 style="margin:28px 0 10px;color:#111;font-size:15px;">How to submit website edits</h3>
    <p style="color:#444;margin:0 0 12px;font-size:14px;line-height:1.6;">
      Any time you want something changed on your site — new photos, updated hours, a fresh promo, a typo fix — head to your portal and submit a request:
    </p>
    <ol style="color:#444;margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.8;">
      <li>Log in to your portal (button above)</li>
      <li>Click the <strong>Requests</strong> tab</li>
      <li>Hit <strong>Submit New Request</strong> and tell us what to change and where</li>
    </ol>
    <p style="color:#444;margin:0 0 16px;font-size:14px;line-height:1.6;">
      You'll get an email confirmation as soon as we receive it, and another when it's live. Most edits are completed within <strong>24–48 hours</strong>. Urgent changes are handled same day.
    </p>

    <h3 style="margin:28px 0 10px;color:#111;font-size:15px;">What happens next</h3>
    <p style="color:#444;margin:0 0 16px;font-size:14px;line-height:1.6;">
      Now that you're onboarded, we'll be in touch shortly to collect anything we need to get your site built or updated — logos, photos, copy, brand colors, that kind of thing. If you have any of that ready to share, feel free to reply to this email with it attached.
    </p>

    <h3 style="margin:28px 0 10px;color:#111;font-size:15px;">Questions?</h3>
    <p style="color:#444;margin:0 0 20px;font-size:14px;line-height:1.6;">
      Just reply to this email. It goes straight to us and we'll get back to you fast.
    </p>

    <p style="color:#444;margin:24px 0 0;font-size:14px;">
      Welcome aboard,<br/>
      <strong>TruePath Studios</strong>
    </p>
  `);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: client.email,
    replyTo: REPLY_TO,
    subject: `Welcome to TruePath Studios — here's how everything works`,
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
