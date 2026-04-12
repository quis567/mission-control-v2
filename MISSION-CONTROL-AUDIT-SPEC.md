# Free Website Audit Funnel — Mission Control Backend

## Full Plan Overview

TruePath Studios is adding a lead-generation funnel where small business owners submit their website for a free audit. The system spans two codebases:

- **TruePath Studios website** (vanilla HTML/CSS/JS on Netlify) → Landing page at `/free-audit` with form + instant results display
- **Mission Control V2** (this codebase) → API endpoint, CRM lead creation, notifications, and editable email draft generation

**This file covers the Mission Control side only.** The landing page is built separately and will POST form data to the API endpoint built here.

### User Flow

```
User fills out form on truepathstudios.com/free-audit
  → Form POSTs to Mission Control API: /api/audit/submit
    → API runs automated checks (PageSpeed, SSL, meta tags, mobile, alt tags)
    → Creates lead in CRM (tagged as "Audit Lead")
    → Creates notification in dashboard
    → Auto-generates editable email draft with audit findings
    → Returns instant results JSON to the landing page
```

---

## What to Build

### 1. API Endpoint: `/api/audit/submit`

**Method:** POST
**CORS:** Allow origins `https://truepathstudios.com` and `http://localhost:*` (for dev)
**Rate limiting:** Basic rate limiting — max 10 submissions per IP per hour to prevent abuse

**Request body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "businessName": "string (required)",
  "websiteUrl": "string (required)"
}
```

**What this endpoint does (in order):**

1. **Validate inputs** — check required fields, validate email format, validate/normalize URL (auto-prepend `https://` if missing)
2. **Run automated audit checks** (run in parallel where possible):
   - Hit Google PageSpeed Insights API for mobile + desktop scores (API key already configured in this project — find and reuse it)
   - Fetch the website's HTML server-side to extract: meta title, meta description, count images with/without alt tags, check for viewport meta tag
   - Check if URL uses HTTPS
   - Get page load time from PageSpeed API response
3. **Create a lead in the CRM** via Prisma:
   - Map form fields to existing lead model
   - Distinguish from cold outreach leads — use `source: "audit"` or `type: "Audit Lead"` (check existing model and pick the best approach)
   - Store audit results as JSON (could use `site_reason` field or a new field — check existing schema)
   - Set initial pipeline stage to "New" or "Audit Requested"
4. **Create a notification** in the database (see section 2)
5. **Generate a draft email** with audit findings pre-populated (see section 3)
6. **Return instant results JSON** to the caller:

```json
{
  "success": true,
  "results": {
    "pageSpeedMobile": 45,
    "pageSpeedDesktop": 72,
    "mobileFriendly": false,
    "ssl": true,
    "hasMetaTitle": true,
    "hasMetaDescription": false,
    "imageAltTags": { "total": 12, "withAlt": 3 },
    "loadTime": 4.2
  }
}
```

**Security considerations for this endpoint:**
- Sanitize the website URL before fetching it server-side — prevent SSRF by only allowing http/https protocols, block internal IPs (127.0.0.1, 10.x.x.x, 192.168.x.x, 169.254.x.x)
- Validate email format before storing
- Reject submissions where a honeypot field `website2` has a value (the landing page will include a hidden honeypot field)

---

### 2. Notification System

When a new audit submission comes in, a notification needs to appear in the Mission Control dashboard.

**UI — notification indicator in the dashboard header/nav:**
- Bell icon with unread count badge
- Dropdown or slide-out panel showing recent notifications
- Each notification shows: business name, website URL, timestamp, and a link to the audit detail page
- Mark as read/unread on click

**Database model:**

```prisma
model Notification {
  id          String   @id @default(cuid())
  type        String   // "audit_submission" for now, extensible later
  title       String   // "New Audit: Smith Plumbing"
  message     String   // "john@example.com submitted smithplumbing.com for audit"
  read        Boolean  @default(false)
  leadId      String?  // FK to the created lead
  actionUrl   String?  // Deep link to audit detail / email draft page
  createdAt   DateTime @default(now())
}
```

**Optional enhancement:** Send an email notification to Marc's own email (via Resend, already configured) so he gets an alert outside of the dashboard too. Something simple like "New audit request from Smith Plumbing — smithplumbing.com" with a link to Mission Control.

---

### 3. Auto-Generated Email Draft

This is the core sales tool. The API endpoint generates a draft email pre-populated with audit data. Marc reviews, adds personal observations, and sends.

**Database — either add to AuditSubmission or a separate model:**

```prisma
model AuditSubmission {
  id              String   @id @default(cuid())
  name            String
  email           String
  businessName    String
  websiteUrl      String
  results         Json?    // Full audit results JSON
  emailSubject    String?  // Draft email subject
  emailBody       String?  // Draft email body (editable)
  leadId          String?  // FK to CRM lead
  status          String   @default("pending") // pending, completed, emailed
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**UI — audit detail page with email editor:**

- Accessible from notification link and from the lead detail view in the CRM
- Top section: summary of instant audit scores (the same data returned to the landing page)
- Below that: full email editor
  - Pre-populated subject line and body (see template below)
  - Rich text or markdown editing — at minimum a textarea that preserves formatting
  - Marc can fully rewrite any section before sending
  - "Send Email" button → sends via Resend to the lead's email address
  - "Save Draft" button → saves edits without sending
  - After sending: update `status` to "emailed" and record the sent timestamp

**Email template to auto-generate:**

```
Subject: Your Free Website Audit Results — [businessName]

Hi [name],

Thanks for requesting a website audit for [businessName]. I took a look at [websiteUrl] and put together some findings for you.

QUICK SCORES:
- Mobile Performance: [pageSpeedMobile]/100
- Desktop Performance: [pageSpeedDesktop]/100
- Mobile Friendly: [Yes/No]
- SSL Secure: [Yes/No]
- Page Load Time: [loadTime]s

WHAT I FOUND:

[AUTO-GENERATED OBSERVATIONS — see logic below]

FULL DESIGN REVIEW:

[PLACEHOLDER — this is where I add my personal take on the site's design, UX, and branding after reviewing it myself.]

---

These are all fixable, and I'd love to show you what your website could look like. I build premium custom websites at prices that work for small businesses — no templates, no page builders, just clean design built for your brand.

Want to see some examples? Check out my recent work:
https://truepathstudios.com/#portfolio

If you'd like to chat about what a redesign could look like for [businessName], I'm happy to hop on a quick call — no pressure.

Best,
Marc Santiago
TruePath Studios
truepathstudios.com
```

**Auto-generated observation logic for the "WHAT I FOUND" section:**

Generate plain-text paragraphs based on the audit scores:

- PageSpeed Mobile < 50: "Your site is loading slowly on mobile devices, which is how most of your customers are finding you. Google also uses mobile speed as a ranking factor, so this is likely hurting your search visibility."
- PageSpeed Mobile 50-79: "Your mobile speed is decent but there's room for improvement. Faster sites keep visitors engaged longer and rank better on Google."
- PageSpeed Mobile >= 80: "Your mobile speed is solid — that's better than most small business sites I audit."
- Not mobile friendly: "Your website isn't fully optimized for mobile devices. With over 60% of web traffic coming from phones, this means a lot of potential customers are having a poor experience on your site."
- No SSL (http): "Your site isn't using HTTPS, which means browsers show a 'Not Secure' warning to visitors. This can scare off potential customers and hurts your Google ranking."
- No meta title: "Your site is missing a title tag, which is one of the most basic SEO elements. This is what shows up as the clickable headline in Google search results."
- No meta description: "Your site is missing a meta description — that's the short blurb that shows up under your title in Google search results. Without it, Google pulls random text from your page, which usually doesn't make a great first impression."
- Low alt tag coverage (< 50% of images): "Most of your images are missing alt text. This hurts both accessibility and SEO — search engines can't 'see' images, they rely on alt text to understand what's on the page."

---

### 4. Wiring It Into Existing Systems

**CRM integration:** The new audit lead should appear in the existing CRM pipeline board alongside cold outreach leads, but be visually distinguishable (different tag, badge, or color). Check the existing lead model and pipeline stages — adapt rather than rebuild.

**PageSpeed API:** Already configured in this project. Find where the API key is stored and the existing integration code. Reuse it rather than writing a new one.

**Resend:** Already configured for email sending. Reuse the existing setup for sending audit result emails.

**Prisma/Supabase:** Add new models and run `npx prisma migrate dev` to update the schema.

---

### 5. Build Order

1. Add `AuditSubmission` and `Notification` models to Prisma schema → run migration
2. Build `/api/audit/submit` endpoint — input validation, PageSpeed API call, HTML scraping, lead creation, notification creation, email draft generation, JSON response
3. Test the endpoint with curl or Postman
4. Build the notification bell component in the dashboard header
5. Build the audit detail page with email editor and send functionality
6. Deploy to Vercel and test the CORS headers from truepathstudios.com
