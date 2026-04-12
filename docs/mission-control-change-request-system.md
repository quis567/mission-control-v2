# Mission Control — Client Change Request System & Client Portal

## Overview

Add a client change request system to the TruePath Studios mission control app. Clients can submit website change requests through a simple form. Requests feed into the mission control dashboard with auto-generated Claude Code prompts. Includes automated email/SMS notifications and a client-facing portal.

---

## Phase 1 — Change request form & dashboard

### Client-facing request form

Each client gets a unique URL: `app.truepathstudios.com/request/[client-slug]`

The client slug auto-fills their info so they don't have to enter their name or website every time.

**Form fields:**

- **What do you need changed?** (dropdown)
  - Phone number
  - Address
  - Business hours
  - Add photo(s)
  - Remove photo(s)
  - Swap a photo
  - Change text / copy
  - Add a new blog post
  - Add a service
  - Remove a service
  - Update pricing
  - Other

- **Where on the site?** (dropdown)
  - Home page
  - About page
  - Services page
  - Contact page
  - Gallery / Portfolio
  - Blog
  - Header / Footer (sitewide)
  - Entire site
  - Not sure

- **What's the new content?** (textarea)
  - Placeholder: "Example: Change phone number from (347) 555-0000 to (347) 555-1234. It shows in the header, footer, and contact page."

- **Upload files** (optional, multiple file upload)
  - Accept: JPG, PNG, PDF, WebP
  - Max 10MB per file
  - Drag and drop or tap to upload
  - Show thumbnails of uploaded files with remove button

- **How urgent is this?** (radio buttons)
  - Normal (24-48 hours)
  - Urgent (same day)

- **Submit button**

**After submission:**
- Show a confirmation message: "Got it! We'll take care of this and let you know when it's done."
- Send the client a confirmation email (see Phase 2)
- Create a new request entry in the dashboard

**Form design:**
- Clean, minimal, mobile-first — most contractors will fill this out from their phone
- TruePath Studios branding at the top with the client's company name
- Brief intro text: "Need something updated on your website? Fill this out and we'll take care of it — most changes are done within 24 hours."
- No login required to submit — the unique URL identifies the client

---

### Mission control dashboard — requests view

Add a "Requests" section to the existing mission control dashboard.

**Request list view:**
- Table or card list of all incoming requests
- Sortable by: date, client, priority, status
- Filterable by: status, priority, client
- Each row shows:
  - Client name
  - Client website URL
  - Change type (from dropdown)
  - Page location
  - Priority (Normal / Urgent — urgent gets a red badge)
  - Submitted date/time
  - Status badge

**Status options:**
- New (default, blue badge)
- In Progress (amber badge)
- Complete (green badge)

**Request detail view (click to expand or open):**
- Full details of the request
- Any uploaded files with preview/download
- Auto-generated Claude Code prompt (see below)
- "Copy prompt" button — one click copies to clipboard
- Status dropdown to update
- "Mark Complete" button — changes status and triggers client notification
- Notes field for internal notes

---

### Auto-generated Claude Code prompts

When a request comes in, the app builds a ready-to-use prompt based on the form data. Display this prominently in the request detail view with a copy button.

**Prompt templates by change type:**

**Phone number:**
```
Update the phone number across the entire site to [new number]. Check and update it in: the header, the footer, the contact page, any CTA sections, and any structured data / schema markup. The current number should be replaced everywhere it appears.
```

**Address:**
```
Update the business address across the entire site to [new address]. Check and update it in: the header, the footer, the contact page, the Google Maps embed if there is one, and any structured data / schema markup.
```

**Business hours:**
```
Update the business hours across the site to [new hours]. Check the contact page, footer, and any structured data / schema markup.
```

**Add photo(s):**
```
On the [page] page, add the following uploaded image(s) to the appropriate section. [client's details]. Make sure images are optimized for web, use WebP format, include proper alt text, and are lazy loaded.
```

**Remove photo(s):**
```
On the [page] page, remove the following image(s): [client's details]. Remove the image file from the project as well.
```

**Swap a photo:**
```
On the [page] page, replace the existing image with the uploaded file. [client's details]. Optimize the new image for web, use WebP format, and keep the same alt text structure.
```

**Change text / copy:**
```
On the [page] page, make the following text changes: [client's details]. Keep the same styling and formatting as the existing content.
```

**Add a blog post:**
```
Create a new blog post with the following content:

[client's details]

Add proper SEO meta title and description. Add the post to the blog listing page. Use any uploaded images as the featured image or inline content images.
```

**Add a service:**
```
Add a new service to the [page] page: [client's details]. Match the styling and layout of the existing services. Update the navigation if services are listed in menus.
```

**Remove a service:**
```
Remove the following service from the [page] page: [client's details]. Update the navigation if the service was listed in menus.
```

**Update pricing:**
```
On the [page] page, update the pricing as follows: [client's details]. Make sure any pricing shown elsewhere on the site is also updated for consistency.
```

**Other:**
```
The client has requested the following change on the [page] page:

[client's details]

Review and implement the requested changes. Keep the existing design style and formatting consistent.
```

**For all prompts:**
- Replace bracketed values with actual form data
- If the client selected "Entire site" or "Header / Footer (sitewide)" for location, adjust the prompt to say "across the entire site" instead of "on the [page] page"
- If files were uploaded, append: "Uploaded files are attached to this request."
- If priority is Urgent, prepend: "URGENT REQUEST — "

---

## Phase 2 — Automated email notifications

### Email setup

Use a transactional email service. Options in order of recommendation:

1. **Resend** (resend.com) — simple API, generous free tier (100 emails/day), great developer experience, works perfectly with Next.js
2. **SendGrid** — more established, free tier covers 100 emails/day
3. **Postmark** — excellent deliverability, slightly more expensive

Set up with the TruePath Studios domain so emails come from something like updates@truepathstudios.com or noreply@truepathstudios.com.

### Email triggers and templates

**Email 1 — Request confirmation (to client, immediately on submission)**

Subject: "We got your request — [change type]"

Body:
```
Hi [client name],

We received your website change request:

What: [change type]
Where: [page location]
Details: [their message, truncated to 200 chars]
Priority: [Normal / Urgent]

We'll take care of this and let you know when it's done. Most changes are completed within [24-48 hours / same day based on priority].

Thanks,
TruePath Studios
```

**Email 2 — Request complete (to client, when marked complete)**

Subject: "Your website has been updated"

Body:
```
Hi [client name],

The change you requested has been made and is live on your site:

What was changed: [change type]
Where: [page location]

Take a look and let us know if anything needs adjusting: [client website URL]

Thanks,
TruePath Studios
```

**Email 3 — New request alert (to you/admin, immediately on submission)**

Subject: "[Urgent] New request from [client name] — [change type]" (include Urgent prefix only if urgent)

Body:
```
New change request from [client name]:

Website: [client URL]
What: [change type]
Where: [page location]  
Priority: [Normal / Urgent]
Details: [full message]

View in Mission Control: [link to request in dashboard]
```

**Email 4 — Weekly digest (to you/admin, every Monday morning)**

Subject: "Weekly request summary — [date range]"

Body:
```
Here's your weekly summary:

New requests: [count]
Completed: [count]
Still open: [count]

Open requests:
- [client name] — [change type] — [date submitted] — [priority]
- [client name] — [change type] — [date submitted] — [priority]
```

### Email design:
- Clean, minimal, mobile-friendly
- TruePath Studios logo at the top
- No heavy HTML — keep it simple and professional
- Footer with company info and contact details

---

## Phase 3 — SMS / text notifications (optional)

### SMS setup

Use **Twilio** for SMS. It's the most reliable option and has a simple API. Cost is about $0.0079 per text sent in the US.

Alternative: **Vonage (Nexmo)** — similar pricing, slightly simpler setup.

### SMS triggers

Only send texts for high-priority moments — don't spam clients with texts for everything.

**Text 1 — Request received (to client, only for urgent requests)**
```
TruePath Studios: Got your urgent request. We're on it and will update you when it's done today.
```

**Text 2 — Request complete (to client, always)**
```
TruePath Studios: Your website update is live! Take a look: [client website URL]. Reply if anything needs tweaking.
```

**Text 3 — New urgent request (to you/admin)**
```
URGENT request from [client name]: [change type] on [page]. View: [dashboard link]
```

### SMS implementation notes:
- Store client phone numbers in the client database
- Get explicit opt-in from clients for text notifications during onboarding
- Include opt-out instructions in first text: "Reply STOP to unsubscribe"
- Keep all texts under 160 characters when possible

---

## Phase 4 — Client portal / login

### Overview

Give each client a login to view their own project details, request history, and site status. Keep it simple — this is a view-only dashboard for the client, not a full admin panel.

### Authentication

Use **NextAuth.js** (now called Auth.js) for authentication. Simplest setup:

- **Magic link login** (recommended) — client enters their email, gets a login link, clicks it, they're in. No passwords to remember. Uses the same email service from Phase 2.
- **Alternative:** Google OAuth if most of your clients use Gmail

Each client account is linked to their company record in your database.

### Client portal pages

**Client dashboard (home after login):**

- Welcome message: "Hi [client name]"
- Their website URL (clickable, opens in new tab)
- Quick stats:
  - Site status: Live / Maintenance / Building
  - Last updated: [date of most recent change]
  - Open requests: [count]
  - Total requests completed: [count]
- "Submit a new request" button (links to their request form)
- Recent activity feed showing their last 5-10 request statuses

**Request history page:**

- List of all their past requests
- Each shows: change type, date submitted, status, date completed
- Can click to expand and see full details
- Filter by status: All, Open, Complete

**Site details page:**

- Their website URL
- Hosting info (where it's deployed)
- Plan they're on (Starter / Growth / Pro)
- Monthly services (Website Care / SEO Growth / Ads Management)
- Next billing date if applicable
- Tech stack summary (e.g., "Next.js, hosted on Netlify")
- Domain registrar / expiration date if you manage their domain

**Documents page (optional, nice to have):**

- A place to share files with the client
- Brand assets (logo files, brand colors, fonts)
- Monthly SEO or analytics reports (PDF uploads)
- Contracts or agreements
- Organized by date or category

### Client portal design:
- Clean, minimal, matches TruePath Studios branding
- Mobile responsive — clients will check this from their phone
- Sidebar navigation on desktop, bottom tabs on mobile
- Same design system as the admin mission control but with a simplified view
- Client only sees their own data — never other clients

### Database structure

You'll need a database for the client portal. Use **Supabase** (free tier is generous) or **Planetscale** for MySQL. Supabase is recommended because it includes auth, storage, and a Postgres database all in one.

**Core tables:**

- **clients** — id, company_name, contact_name, email, phone, website_url, slug, plan, monthly_services, site_status, hosting_provider, domain_registrar, domain_expiry, created_at
- **requests** — id, client_id, change_type, page_location, details, priority, status, files, generated_prompt, internal_notes, submitted_at, completed_at
- **activity_log** — id, client_id, request_id, action (submitted, in_progress, completed), timestamp
- **documents** — id, client_id, title, file_url, category, uploaded_at

### Row-level security:
- Clients can only read their own data
- Admin (you) can read and write all data
- Request form submissions create rows without requiring auth (public insert, but scoped to client via slug)

---

## Phase 5 — Polish and onboarding flow

### Client onboarding

When you add a new client to mission control:

1. Create their client record with company name, contact info, website URL
2. System auto-generates their unique request form URL
3. System sends a welcome email:

Subject: "Your TruePath Studios portal is ready"

Body:
```
Hi [client name],

Your website is live and we're here to keep it running smoothly.

Here's what you need to know:

Request a change anytime: [unique request form URL]
Bookmark this link — anytime you need something updated on your site, just fill out the quick form and we'll handle it.

Log into your portal: [portal login URL]
View your site details, request history, and documents.

Our response time: Most changes are done within 24-48 hours. Urgent requests are handled same-day.

Questions? Just reply to this email or call us at [phone].

Thanks,
TruePath Studios
```

4. Optionally send an onboarding text:
```
TruePath Studios: Your website portal is ready! Bookmark this link to request changes anytime: [request form URL]
```

### Admin notifications preferences

In mission control settings, let the admin configure:
- Email notifications on/off for new requests
- Email notifications on/off for urgent requests only
- SMS notifications on/off for urgent requests
- Weekly digest on/off
- Notification email address
- Notification phone number

---

## Implementation order

1. **Start with Phase 1** — get the request form and dashboard working first. This is the core value.
2. **Add Phase 2** — email notifications make it feel professional and keep clients in the loop.
3. **Phase 4 next** — client portal adds a premium feel to your service. Set up the database here since you'll need it.
4. **Phase 3 last** — SMS is nice to have but not essential. Add it once everything else is solid.
5. **Phase 5** — polish and automate the onboarding once the system is proven.

---

## Important notes

- Keep the client-facing experience dead simple. Contractors don't want to learn software — they want to text you and have it done. This system should feel that easy.
- The request form must work perfectly on mobile. Test it on a phone before launching.
- Don't over-notify. Clients should get a confirmation when they submit and a notification when it's done. That's it. No marketing emails, no weekly check-ins, no "how are we doing" surveys.
- The auto-generated prompts are starting points. You'll refine the templates over time as you see what works best with Claude Code.
- Store uploaded files in Supabase Storage or a similar service — don't save them locally.
