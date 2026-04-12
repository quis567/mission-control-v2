# Redesign Proposal Generator — Claude Code Prompt

Read the project context file: `Mission_Control_v2_Project_Context.md`

## Goal

Redesign the proposal generator to produce professional, branded PDF proposals that look like they came from a real agency — not an AI dump. The proposal should include the TruePath Studios logo, brand colors, a selected package with clear pricing, and AI-generated content tailored to the prospect's business.

---

## Brand Assets

**Logo file:** Located in the project at `images/Logo.png` (also available on the live site at `https://truepathstudios.com/Images/Logo.png`). Copy it to `public/images/Logo.png` if not already there so it's accessible in the app.

**Brand colors:**
- Primary blue: `#1A4F8A` — use for headings, accents, borders, section titles
- Dark navy: `#1A202C` — use for body text
- Light blue tint: `#E8F0F8` — use for section backgrounds, table header fills
- Accent blue: `#2563EB` — use for links, highlights
- White: `#FFFFFF` — page background
- Light gray: `#F7F8FA` — alternating table rows, subtle backgrounds
- Border gray: `#E2E8F0` — dividers, table borders

**Font:** Use a clean sans-serif — Arial, Helvetica, or Inter. Keep it professional.

---

## Step 1: Proposal Creation Flow (in the app)

When a user clicks "Create Proposal" (from the Proposals page, Client page, or Pipeline), show a creation form with these fields:

### Proposal Creation Form:

```
Create Proposal

Client:          [Select client ▾]  (auto-populated if launched from a client page)

──────────────────────────────────────────────
SELECT PACKAGE
──────────────────────────────────────────────

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Starter       │ │    Growth        │ │      Pro         │
│     $500         │ │    $1,500        │ │    $3,000        │
│   one-time       │ │   one-time       │ │   one-time       │
│                  │ │  ⭐ Most Popular │ │                  │
│ • 5-page site    │ │ • 10-page site   │ │ • Unlimited pgs  │
│ • Mobile design  │ │ • Conversion     │ │ • Premium design │
│ • Basic SEO      │ │ • Lead gen       │ │ • Multi-location │
│ • GBP setup      │ │ • Full SEO       │ │ • Google Ads     │
│   [ Select ]     │ │   [✓ Selected ]  │ │   [ Select ]     │
└─────────────────┘ └─────────────────┘ └─────────────────┘

MONTHLY ADD-ONS (optional)

☐ Website Care — $99/mo
☐ SEO Growth — $199/mo
☐ Ads Management — $500/mo

──────────────────────────────────────────────

Custom Notes:    [________________________________________________]
                 (Optional — any special details to include in the proposal)

Discount:        [___] %  (optional — applies to one-time package price)

──────────────────────────────────────────────

PROPOSAL SUMMARY

  Growth Package                    $1,500 (one-time)
  SEO Growth Add-on                   $199/mo
  
  One-time investment:  $1,500
  Monthly investment:   $199/mo

──────────────────────────────────────────────

              [ Cancel ]  [ Generate Proposal ]
```

When "Generate Proposal" is clicked:
1. Call the Anthropic API to generate the tailored content sections (see below)
2. Generate the PDF with all sections
3. Save the proposal to the database
4. Show a preview and download link

---

## Step 2: Proposal PDF Layout (White Background, Professional)

The generated PDF should be a multi-page, professionally formatted document. Here's the page-by-page layout:

### Page 1: Cover Page

```
┌──────────────────────────────────────────┐
│                                          │
│         [TruePath Studios Logo]          │
│                                          │
│                                          │
│                                          │
│                                          │
│       WEBSITE & SEO PROPOSAL             │
│       Prepared for:                      │
│       [Client Business Name]             │
│                                          │
│                                          │
│                                          │
│       Prepared by: TruePath Studios      │
│       Date: April 5, 2026               │
│       Proposal #: TP-2026-0042          │
│                                          │
│                                          │
│       ─────────────────────────          │
│       info@truepathstudios.com           │
│       truepathstudios.com                │
│                                          │
└──────────────────────────────────────────┘
```

- White background
- Logo centered at top (use the full-color logo from `public/images/Logo.png`)
- Title "WEBSITE & SEO PROPOSAL" in primary blue `#1A4F8A`, large font
- Client name in dark navy, large
- Proposal number auto-generated (TP-YYYY-NNNN format)
- Contact info at bottom
- Clean, minimal, lots of whitespace

### Page 2: Introduction / Executive Summary

```
┌──────────────────────────────────────────┐
│  [Logo small, top-left]    [Page 2]      │
│  ────────────────────────────────────    │
│                                          │
│  ABOUT TRUEPATH STUDIOS                  │
│  ──────────────────────                  │
│                                          │
│  [2-3 paragraphs about TruePath —        │
│   who we are, what we do, why we         │
│   specialize in trades & construction.   │
│   Establish credibility.]                │
│                                          │
│  UNDERSTANDING YOUR BUSINESS             │
│  ──────────────────────────              │
│                                          │
│  [AI-generated section about the         │
│   client's business, their industry,     │
│   their challenges, and what they need   │
│   from a website/SEO perspective.        │
│   Personalized to their trade.]          │
│                                          │
└──────────────────────────────────────────┘
```

- Small logo in top-left corner of every page (after the cover)
- Page number in top-right
- Section titles in primary blue `#1A4F8A` with a thin blue underline
- Body text in dark navy `#1A202C`, 11-12pt

### Page 3: Current Website Audit (if applicable)

```
┌──────────────────────────────────────────┐
│  [Logo]                        [Page 3]  │
│  ────────────────────────────────────    │
│                                          │
│  CURRENT WEBSITE ASSESSMENT              │
│  ─────────────────────────               │
│                                          │
│  [If the client has an existing website, │
│   include SEO audit findings:            │
│   - Overall SEO score                    │
│   - Key issues found                     │
│   - What's working                       │
│   - What needs improvement               │
│   Pull this from SeoPage data if the     │
│   site has been crawled in Command Center]│
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  SEO Score: 45/100                 │  │
│  │  ████████░░░░░░░░░░░░  45%        │  │
│  │                                    │  │
│  │  ✅ Has SSL certificate            │  │
│  │  ❌ Missing meta descriptions      │  │
│  │  ❌ No H1 heading found            │  │
│  │  ⚠️ Images missing alt text (3/7)  │  │
│  │  ❌ Not mobile optimized           │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [If no website exists, skip this page   │
│   or replace with "Why You Need a        │
│   Professional Website" section]         │
│                                          │
└──────────────────────────────────────────┘
```

- Include actual SEO data if the client's site has been crawled
- Visual score bar with color (green/yellow/red)
- Checkmark/X list for quick-scan issues
- If no existing site, include a section about why trades businesses need professional websites (AI-generated)

### Page 4: Our Solution / What We'll Build

```
┌──────────────────────────────────────────┐
│  [Logo]                        [Page 4]  │
│  ────────────────────────────────────    │
│                                          │
│  OUR RECOMMENDED SOLUTION                │
│  ─────────────────────────               │
│                                          │
│  [AI-generated section describing what   │
│   we'll build for this specific client.  │
│   Tailored to their trade:              │
│   - What the website will include        │
│   - How SEO will target their market     │
│   - Lead generation strategy             │
│   - Expected outcomes                    │
│   Specific to their industry and area.]  │
│                                          │
│  KEY DELIVERABLES                        │
│  ─────────────────                       │
│                                          │
│  ✓ Custom [X]-page website               │
│  ✓ Mobile-responsive design              │
│  ✓ Local SEO for [City, ST]             │
│  ✓ Google Business Profile setup         │
│  ✓ [Other package-specific items...]     │
│                                          │
└──────────────────────────────────────────┘
```

- AI content should be specific to the client's trade (plumber, roofer, HVAC, etc.)
- Mention their city/area for local SEO
- Deliverables list pulled from the selected package features

### Page 5: Investment (Pricing Page)

```
┌──────────────────────────────────────────┐
│  [Logo]                        [Page 5]  │
│  ────────────────────────────────────    │
│                                          │
│  YOUR INVESTMENT                         │
│  ─────────────                           │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  GROWTH PACKAGE                    │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │                                    │  │
│  │  ✓ Up to 10-page custom website    │  │
│  │  ✓ Advanced conversion design      │  │
│  │  ✓ Lead gen funnel + forms         │  │
│  │  ✓ Full local SEO campaign         │  │
│  │  ✓ Google Business Profile opt.    │  │
│  │  ✓ Monthly reporting + strategy    │  │
│  │  ✓ Priority support                │  │
│  │                                    │  │
│  │  One-time investment:    $1,500    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ONGOING GROWTH (OPTIONAL)               │
│  ─────────────────────────               │
│                                          │
│  ┌──────────────────┬─────────────────┐  │
│  │ Service           │ Monthly         │  │
│  ├──────────────────┼─────────────────┤  │
│  │ SEO Growth        │ $199/mo         │  │
│  │ Website Care      │ $99/mo          │  │
│  ├──────────────────┼─────────────────┤  │
│  │ Monthly Total     │ $298/mo         │  │
│  └──────────────────┴─────────────────┘  │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  TOTAL ONE-TIME:     $1,500              │
│  TOTAL MONTHLY:      $298/mo             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                          │
│  * No contracts. Month-to-month for all  │
│    ongoing services.                     │
│                                          │
└──────────────────────────────────────────┘
```

- Package name and features in a highlighted box with light blue background `#E8F0F8`
- Feature checklist with checkmarks
- Monthly add-ons in a clean table
- Bold totals at the bottom
- "No contracts" note — matches your website messaging
- If a discount was applied, show original price with strikethrough and discounted price

### Page 6: Process / Timeline

```
┌──────────────────────────────────────────┐
│  [Logo]                        [Page 6]  │
│  ────────────────────────────────────    │
│                                          │
│  OUR PROCESS                             │
│  ───────────                             │
│                                          │
│  WEEK 1-2: STRATEGY & DESIGN            │
│  We learn your business, target market,  │
│  and goals. Design concepts delivered.   │
│                                          │
│  WEEK 2-3: BUILD & DEVELOP              │
│  Custom website built with conversion-   │
│  first layouts and your brand.           │
│                                          │
│  WEEK 3-4: OPTIMIZE & LAUNCH            │
│  SEO, speed tuning, testing. Go live     │
│  and start generating leads.             │
│                                          │
│  ONGOING: GROW & IMPROVE                │
│  Monthly reporting, SEO refinement,      │
│  and continuous improvement.             │
│                                          │
└──────────────────────────────────────────┘
```

- Simple 4-step timeline matching the process on your website
- Each step has a timeframe and brief description
- Use blue accent dots or numbers for each step

### Page 7: Why TruePath / Social Proof

```
┌──────────────────────────────────────────┐
│  [Logo]                        [Page 7]  │
│  ────────────────────────────────────    │
│                                          │
│  WHY TRUEPATH STUDIOS                    │
│  ─────────────────────                   │
│                                          │
│  ✓ We specialize in trades &             │
│    construction — we know your market    │
│  ✓ No contracts — we keep you because    │
│    we deliver results                    │
│  ✓ Conversion-focused design that        │
│    generates leads, not just looks       │
│  ✓ Real reporting so you always know     │
│    what's working                        │
│                                          │
│  CLIENT RESULTS                          │
│  ──────────────                          │
│                                          │
│  "Before TruePath, my website was        │
│   basically invisible. Now I'm getting   │
│   5 to 10 leads a week."                 │
│   — Mike R., Roofing Contractor          │
│                                          │
│  "I launched and within a month I had    │
│   to hire another crew to keep up."      │
│   — Jenny T., Landscaping               │
│                                          │
└──────────────────────────────────────────┘
```

- Differentiators pulled from your website
- Include 2-3 testimonials from your site
- Keep it concise — this is the trust-building page

### Page 8: Next Steps / CTA

```
┌──────────────────────────────────────────┐
│  [Logo]                        [Page 8]  │
│  ────────────────────────────────────    │
│                                          │
│  READY TO GET STARTED?                   │
│  ──────────────────────                  │
│                                          │
│  Here's what happens next:               │
│                                          │
│  1. Reply to this proposal or call us    │
│  2. We'll schedule a kickoff call        │
│  3. Work begins within 48 hours          │
│                                          │
│  This proposal is valid for 30 days      │
│  from the date above.                    │
│                                          │
│                                          │
│  ─────────────────────────────────────   │
│                                          │
│  TruePath Studios                        │
│  info@truepathstudios.com                │
│  truepathstudios.com                     │
│  (555) 000-0000                          │
│                                          │
│  Thank you for considering               │
│  TruePath Studios.                       │
│                                          │
└──────────────────────────────────────────┘
```

- Clear next steps
- Expiration date (30 days from creation)
- Full contact info
- Professional closing

---

## Step 3: AI Content Generation

When generating the proposal, call the Anthropic API to create the personalized sections. Use one API call with a system prompt:

### System prompt for proposal generation:

```
You are a proposal writer for TruePath Studios, a web design and SEO agency that specializes in websites for trades and construction businesses (roofers, plumbers, electricians, HVAC, landscapers, etc.) in Central Florida.

Write professional, persuasive proposal content that is:
- Specific to the client's trade/industry
- References their location for local SEO
- Confident but not pushy
- Focused on results and lead generation, not just "a nice website"
- Written in a warm, professional tone

Do NOT use generic filler. Every sentence should be relevant to this specific client.
```

### User prompt:

```
Generate proposal content for the following client:

Business Name: [client.businessName]
Business Type: [client.businessType]
Contact: [client.contactName]
Location: [client.city], [client.state]
Package: [selected package name and price]
Monthly Add-ons: [selected add-ons]
Custom Notes: [any notes from the form]
Current Website: [URL if exists, "No website" if not]
SEO Score: [score if crawled, "Not audited" if not]
SEO Issues: [list of issues if crawled]

Generate the following sections in JSON format:
{
  "executiveSummary": "2-3 paragraphs about understanding their business and what they need",
  "currentAssessment": "Assessment of their current online presence (use SEO data if provided)",
  "solution": "3-4 paragraphs about what we'll build and why it will work for their specific business",
  "keyBenefits": ["benefit 1 specific to their trade", "benefit 2", "benefit 3", "benefit 4"],
  "timeline": "Brief description of the project timeline"
}
```

---

## Step 4: PDF Generation

Use a PDF library to generate the document. Options:
- **PDFKit** (Node.js) — good for server-side generation
- **jsPDF** — works in browser
- **Puppeteer / Playwright** — render HTML to PDF (best quality but heavy)
- **React-PDF** (@react-pdf/renderer) — React components to PDF

**Recommended: Build an HTML template and convert to PDF using Puppeteer or a similar tool.** This gives the most control over layout and allows using CSS for styling.

### HTML-to-PDF approach:

1. Create an HTML template with all the proposal pages
2. Style it with CSS (white background, brand colors, proper fonts)
3. Convert to PDF server-side

If Puppeteer is too heavy for Vercel, use `@react-pdf/renderer` or build the HTML and use a lighter PDF library.

### Logo in the PDF:

The logo file needs to be accessible during PDF generation:
- Read the logo from `public/images/Logo.png`
- Convert to Base64 for embedding in the PDF
- Use it on the cover page (large, centered) and as a small watermark on subsequent pages

---

## Step 5: Proposal Management in the App

### Proposals Page (`/proposals`):

Show a list of all generated proposals:

```
Proposals
5 total · 2 sent · 1 accepted · 2 draft
                                              [ + Create Proposal ]

┌──────────────────────────────────────────────────────────┐
│  TP-2026-0042 · RevitaLine Health         [sent]         │
│  Growth Package · $1,500 + $199/mo                       │
│  Created: Apr 4, 2026                                    │
│                                                          │
│  [ View PDF ]  [ Download ]  [ Send to Client ]          │
└──────────────────────────────────────────────────────────┘
```

### Proposal Statuses:
- **Draft** — generated but not sent
- **Sent** — shared with the client
- **Accepted** — client agreed (trigger: move client to "Active" in pipeline)
- **Declined** — client said no
- **Expired** — past 30 days with no response

### Proposal Record in Database:

```prisma
model Proposal {
  id              String   @id @default(uuid())
  proposalNumber  String   @unique  // TP-2026-0042 format
  clientId        String
  packageName     String
  packagePrice    Float
  addons          Json?    // Array of { name, price }
  discount        Float?   // Percentage discount
  totalOneTime    Float
  totalMonthly    Float
  content         Json     // AI-generated content sections
  status          String   @default("draft")  // draft, sent, accepted, declined, expired
  validUntil      DateTime
  pdfUrl          String?  // Path to generated PDF
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  client          Client   @relation(fields: [clientId], references: [id])
}
```

---

## Step 6: PDF Styling Details

### General:
- Page size: US Letter (8.5 x 11 inches)
- Margins: 1 inch on all sides
- Background: white `#FFFFFF`
- Body font: Arial or Helvetica, 11pt, color `#1A202C`
- Line height: 1.5

### Headings:
- Section titles: 16pt, bold, color `#1A4F8A`, with a thin blue underline (1px, `#1A4F8A`)
- Sub-headings: 13pt, bold, color `#1A4F8A`

### Tables:
- Header row: background `#1A4F8A`, text white, bold
- Alternating rows: white and `#F7F8FA`
- Border: 1px `#E2E8F0`
- Cell padding: 8px

### Package Box:
- Background: `#E8F0F8`
- Border: 1px `#1A4F8A`
- Border-radius: 8px
- Package name in `#1A4F8A`, bold, 14pt
- Price in `#1A4F8A`, bold, 20pt

### Checkmarks:
- Use ✓ in color `#10B981` (green) for features/deliverables
- Use ✗ in color `#EF4444` (red) for issues found
- Use ⚠ in color `#F59E0B` (amber) for warnings

### Footer on every page (except cover):
- Thin line: `#E2E8F0`
- Left: "TruePath Studios — Confidential"
- Right: "Page X of Y"
- Font: 9pt, color `#94A3B8`

---

## After making changes:

1. Test creating a proposal for an existing client
2. Verify the AI content is specific to the client's trade and location
3. Verify the logo appears correctly on cover and subsequent pages
4. Verify package pricing displays correctly
5. Verify monthly add-ons appear in the pricing table
6. Test with a discount applied
7. Test PDF download
8. Verify proposal saves to database with correct status
9. Deploy: `vercel --prod` or `git push`
