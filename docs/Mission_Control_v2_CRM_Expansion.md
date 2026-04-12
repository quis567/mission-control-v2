# Mission Control v2 — CRM & Client Management Expansion

**Claude Code Expansion Prompt**
**Add to existing Mission Control v2 build**

---

## Context

Mission Control v2 is already built as a task orchestration platform with AI agents. Now expand it into a **full CRM and client management system** for TruePath Studios.

TruePath Studios is a web design and SEO agency that builds websites for contractor and trade businesses. The CRM needs to manage clients, their websites, and the ongoing services we provide — especially SEO.

**IMPORTANT:** Do not rebuild what already exists. Add these features alongside the existing task board, agent system, and dashboard. Integrate where it makes sense (e.g., creating a task from a client's page).

**PREREQUISITE:** The app has been upgraded from SQLite to **PostgreSQL (Supabase) with Prisma ORM**, has **NextAuth.js authentication**, and is **deployed on Vercel**. All new API routes must use the Prisma client from `lib/db.ts`. Do not use raw SQL or SQLite.

**Design:** Continue using the same **liquid glass** theme already in the app. All new pages and components must match the existing glassmorphism aesthetic.

---

## Project Location

Same project — build directly into:

```
C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2
```

---

## New Features Overview

1. **Client Management (CRM core)** — Add, edit, view clients and their details
2. **Website Manager** — Track every client website we've built with status, hosting, domain info
3. **SEO Dashboard** — View and manage on-site SEO for each client's website with AI-powered analysis
4. **Service Tracker** — Track active services per client (web design, SEO, maintenance, etc.)
5. **Client Portal Links** — Quick access to each client's key accounts and logins
6. **Revenue Tracking** — Monthly revenue per client, total MRR, and pipeline value

---

## 1. Client Management

### Client Profile Page

Each client should have a full profile page showing:

- **Business name, contact name, email, phone**
- **Business type / trade** (e.g., Roofer, Plumber, General Contractor)
- **Location** (city, state)
- **Status:** Lead → Prospect → Active Client → Paused → Churned
- **Date acquired**
- **Monthly revenue** (what they pay us)
- **Notes** (free-text, timestamped notes log)
- **Tags** (custom labels like "SEO client", "web only", "VIP", "needs follow-up")

### Client List View

- Searchable and filterable table/grid of all clients
- Filter by: status, business type, tags, services
- Sort by: name, revenue, date acquired, last activity
- Quick-action buttons: view profile, create task, send email

### Client Detail Page Sections (tabbed or scrollable)

- **Overview** — Key info, status, revenue, quick stats
- **Websites** — All websites we manage for this client
- **SEO** — SEO dashboard for their site(s)
- **Services** — Active services and billing
- **Tasks** — Tasks linked to this client (pulls from existing task system)
- **Notes & Activity** — Timeline of all interactions and notes
- **Links & Logins** — Saved links to their hosting, domain registrar, Google Business, analytics, etc.

---

## 2. Website Manager

Each client can have one or more websites we've built/manage.

### Website Record Fields

- **URL** (primary domain)
- **Status:** In Development → Staging → Live → Maintenance → Archived
- **Hosting provider** (e.g., Hostinger, GoDaddy, Vercel, Netlify)
- **Domain registrar**
- **Domain expiration date** (with alert when < 30 days)
- **SSL status** (valid / expiring / expired)
- **CMS / platform** (WordPress, custom, Webflow, etc.)
- **Launch date**
- **Last updated** (when we last made changes)
- **Google Analytics connected** (yes/no + property ID)
- **Google Search Console connected** (yes/no)
- **Monthly maintenance plan** (yes/no + details)
- **Notes**

### Website List View

- Grid/card view of all websites across all clients
- Visual status indicators (green = live, yellow = development, red = issues)
- Quick filters: by client, status, platform, hosting provider
- Click to open full website detail page

---

## 3. SEO Dashboard (AI-Powered)

This is the flagship feature. For each client website, provide a comprehensive SEO management panel.

### On-Site SEO Audit View

Display a page-by-page SEO breakdown showing:

- **Page URL / slug**
- **Page title** (with character count — flag if too long/short)
- **Meta description** (with character count — flag if too long/short/missing)
- **H1 tag** (flag if missing or multiple H1s)
- **H2-H6 structure** (heading hierarchy)
- **Image alt tags** (count of images with/without alt text)
- **Internal links count**
- **External links count**
- **Word count**
- **Target keyword** (user-defined per page)
- **Keyword density** (percentage of target keyword usage)
- **SEO score** (calculated 0-100 based on all factors above)

### SEO Score Calculation

Calculate a score per page based on:
- Title tag present and 50-60 chars → +15 points
- Meta description present and 150-160 chars → +15 points
- Single H1 tag present → +10 points
- Proper heading hierarchy (H1 > H2 > H3) → +10 points
- Target keyword in title → +10 points
- Target keyword in meta description → +5 points
- Target keyword in H1 → +5 points
- All images have alt text → +10 points
- Word count > 300 → +10 points
- At least 1 internal link → +5 points
- At least 1 external link → +5 points

Color code the score: 80-100 green, 50-79 amber, 0-49 red.

### AI SEO Tools

Add buttons/actions that use the Anthropic API to help with SEO:

**"Generate Meta Tags" button per page:**
- Sends the page content and target keyword to Claude API
- Returns optimized title tag and meta description
- User can approve and save, or edit before saving

**"Suggest Keywords" button per page:**
- Analyzes the page content via Claude API
- Returns 5-10 recommended target keywords with estimated relevance
- User can select and assign as the target keyword

**"Rewrite Content for SEO" button:**
- Sends current page content + target keyword to Claude API
- Returns SEO-optimized version of the content
- Shows a diff/comparison view so user can see changes
- User can approve, edit, or reject

**"Full Site Audit" button:**
- Analyzes all pages at once
- Returns a prioritized list of SEO issues to fix
- Groups issues by severity: critical, important, minor
- Each issue links to the specific page

**"Competitor Analysis" (input a competitor URL):**
- Uses web search tool via Claude API to analyze a competitor's site
- Returns comparison of their SEO strategy vs. client's site
- Suggests gaps and opportunities

### AI API Integration for SEO Tools

Use the Anthropic API (same pattern as existing agent system):

```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are an SEO expert. Analyze this page content and generate an optimized title tag (50-60 chars) and meta description (150-160 chars) targeting the keyword "${keyword}".\n\nPage content:\n${pageContent}`
    }]
  })
});
```

### Manual SEO Updates

Users should also be able to manually edit any SEO field:
- Click on any title tag, meta description, or heading → inline edit
- Save changes to the database
- Track change history (what was changed, when, old value vs new value)

### SEO Data Input

Two ways to get page data into the system:

**Option A — Manual entry:**
- User adds pages manually with URL, title, meta description, etc.
- Good for getting started quickly

**Option B — URL crawler (stretch goal):**
- User enters a website URL
- App fetches the homepage and follows internal links
- Extracts SEO data from each page automatically
- Populates the SEO dashboard
- Can be re-run to check for changes

Start with Option A. Build Option B as a follow-up if time allows.

---

## 4. Service Tracker

Track what services each client is paying for.

### Service Types

- Website Design (one-time)
- Website Redesign (one-time)
- Monthly SEO
- Monthly Maintenance
- Google Business Profile Management
- Content Creation (blog posts, etc.)
- Social Media Management
- Paid Ads Management (Google Ads, Facebook Ads)
- Hosting
- Domain Management
- Custom (user-defined)

### Service Record Fields

- **Service type**
- **Status:** Active / Paused / Cancelled / Completed
- **Billing type:** One-time / Monthly / Quarterly / Annual
- **Price**
- **Start date**
- **Next billing date** (for recurring)
- **Notes**

### Service Views

- Per-client: see all services for a specific client
- Global: see all active services across all clients
- Revenue view: total MRR (monthly recurring revenue), total one-time revenue, projected annual revenue

---

## 5. Client Portal Links

A quick-access section on each client profile for storing important links and credentials.

### Link Categories

- Hosting panel (cPanel, Hostinger, etc.)
- Domain registrar
- Google Analytics
- Google Search Console
- Google Business Profile
- Social media accounts
- CMS admin login (WordPress wp-admin, etc.)
- Email/marketing platform
- Any custom links

### Fields per Link

- **Label** (e.g., "WordPress Admin")
- **URL**
- **Username** (optional, stored)
- **Password** (optional, stored — display masked with reveal toggle)
- **Notes**

**Security note:** For this v1, simple storage is fine. No encryption needed yet — this is a local app. Add a note in the UI: "Stored locally. Do not use on shared or public machines."

---

## 6. Revenue Dashboard

Add a revenue section to the main dashboard:

- **Total MRR** (sum of all active monthly services)
- **Total clients** (count by status)
- **Revenue by service type** (bar chart)
- **Revenue trend** (line chart — last 6 months)
- **Top clients by revenue** (ranked list)
- **Upcoming renewals** (services billing in next 30 days)
- **Churn risk** (clients with paused services or no activity in 60+ days)

---

## Database Schema Additions

Add these models to the existing Prisma schema (`prisma/schema.prisma`). The app uses **PostgreSQL via Supabase** with **Prisma** as the ORM. All new API routes must use the Prisma client from `lib/db.ts`.

```prisma
// Add these to prisma/schema.prisma alongside existing models

model Client {
  id              String    @id @default(uuid())
  businessName    String    @map("business_name")
  contactName     String?   @map("contact_name")
  email           String?
  phone           String?
  businessType    String?   @map("business_type")   // Roofer, Plumber, General Contractor, etc.
  city            String?
  state           String?
  status          String?   // lead, prospect, active, paused, churned
  monthlyRevenue  Float?    @map("monthly_revenue")
  dateAcquired    DateTime? @map("date_acquired")
  tags            String?   // JSON array: ["SEO client", "VIP"]
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  notes           ClientNote[]
  websites        Website[]
  services        Service[]
  links           ClientLink[]
  tasks           Task[]

  @@map("clients")
}

model ClientNote {
  id        String   @id @default(uuid())
  clientId  String   @map("client_id")
  content   String
  createdAt DateTime @default(now()) @map("created_at")

  client    Client   @relation(fields: [clientId], references: [id])

  @@map("client_notes")
}

model Website {
  id                 String    @id @default(uuid())
  clientId           String    @map("client_id")
  url                String
  status             String?   // development, staging, live, maintenance, archived
  hostingProvider    String?   @map("hosting_provider")
  domainRegistrar    String?   @map("domain_registrar")
  domainExpiration   DateTime? @map("domain_expiration")
  sslStatus          String?   @map("ssl_status")  // valid, expiring, expired
  cmsPlatform        String?   @map("cms_platform")
  launchDate         DateTime? @map("launch_date")
  lastUpdated        DateTime? @map("last_updated")
  gaConnected        Boolean?  @default(false) @map("ga_connected")
  gaPropertyId       String?   @map("ga_property_id")
  gscConnected       Boolean?  @default(false) @map("gsc_connected")
  maintenancePlan    Boolean?  @default(false) @map("maintenance_plan")
  maintenanceDetails String?   @map("maintenance_details")
  notes              String?
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  client             Client    @relation(fields: [clientId], references: [id])
  seoPages           SeoPage[]

  @@map("websites")
}

model SeoPage {
  id               String    @id @default(uuid())
  websiteId        String    @map("website_id")
  pageUrl          String    @map("page_url")
  pageTitle        String?   @map("page_title")
  titleLength      Int?      @map("title_length")
  metaDescription  String?   @map("meta_description")
  metaDescLength   Int?      @map("meta_desc_length")
  h1Tag            String?   @map("h1_tag")
  h1Count          Int?      @map("h1_count")
  headingStructure String?   @map("heading_structure")  // JSON: {"h2": 3, "h3": 5}
  imagesTotal      Int?      @map("images_total")
  imagesWithAlt    Int?      @map("images_with_alt")
  internalLinks    Int?      @map("internal_links")
  externalLinks    Int?      @map("external_links")
  wordCount        Int?      @map("word_count")
  targetKeyword    String?   @map("target_keyword")
  keywordDensity   Float?    @map("keyword_density")
  seoScore         Int?      @map("seo_score")  // 0-100 calculated
  lastAudited      DateTime? @map("last_audited")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  website          Website   @relation(fields: [websiteId], references: [id])
  changes          SeoChange[]

  @@map("seo_pages")
}

model SeoChange {
  id           String   @id @default(uuid())
  seoPageId    String   @map("seo_page_id")
  fieldChanged String?  @map("field_changed")  // title, meta_description, h1, etc.
  oldValue     String?  @map("old_value")
  newValue     String?  @map("new_value")
  changedBy    String?  @map("changed_by")  // "user" or "ai"
  createdAt    DateTime @default(now()) @map("created_at")

  seoPage      SeoPage  @relation(fields: [seoPageId], references: [id])

  @@map("seo_changes")
}

model Service {
  id              String    @id @default(uuid())
  clientId        String    @map("client_id")
  serviceType     String    @map("service_type")
  status          String?   // active, paused, cancelled, completed
  billingType     String?   @map("billing_type")  // one-time, monthly, quarterly, annual
  price           Float?
  startDate       DateTime? @map("start_date")
  nextBillingDate DateTime? @map("next_billing_date")
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  client          Client    @relation(fields: [clientId], references: [id])

  @@map("services")
}

model ClientLink {
  id        String   @id @default(uuid())
  clientId  String   @map("client_id")
  category  String?  // hosting, domain, analytics, cms, social, custom
  label     String
  url       String?
  username  String?
  password  String?
  notes     String?
  createdAt DateTime @default(now()) @map("created_at")

  client    Client   @relation(fields: [clientId], references: [id])

  @@map("client_links")
}
```

### Link Tasks to Clients

Update the existing `Task` model to add a client relationship:

```prisma
// Add to existing Task model:
  clientId  String?  @map("client_id")
  client    Client?  @relation(fields: [clientId], references: [id])
```

### After Adding Models

Run these commands to update the database:

```bash
npx prisma generate
npx prisma db push
```

---

## New File Structure (add to existing)

```
src/
├── app/
│   ├── clients/
│   │   ├── page.tsx                    # Client list view
│   │   └── [id]/
│   │       ├── page.tsx                # Client detail/profile page
│   │       ├── websites/page.tsx       # Websites tab
│   │       ├── seo/page.tsx            # SEO dashboard tab
│   │       ├── services/page.tsx       # Services tab
│   │       └── links/page.tsx          # Portal links tab
│   ├── websites/
│   │   └── page.tsx                    # All websites grid view
│   ├── seo/
│   │   └── [websiteId]/page.tsx        # Full SEO audit page per website
│   ├── revenue/
│   │   └── page.tsx                    # Revenue dashboard
│   └── api/
│       ├── clients/
│       │   ├── route.ts                # CRUD
│       │   └── [id]/
│       │       ├── notes/route.ts
│       │       ├── services/route.ts
│       │       └── links/route.ts
│       ├── websites/
│       │   ├── route.ts                # CRUD
│       │   └── [id]/
│       │       └── seo/route.ts        # SEO pages CRUD
│       ├── seo/
│       │   ├── audit/route.ts          # AI-powered SEO audit
│       │   ├── generate-meta/route.ts  # AI meta tag generation
│       │   ├── suggest-keywords/route.ts
│       │   └── rewrite/route.ts        # AI content rewrite
│       └── revenue/route.ts            # Revenue calculations
├── lib/
│   ├── seo.ts                          # SEO score calculation logic
│   └── anthropic.ts                    # Anthropic API client for SEO tools
└── components/
    ├── ClientCard.tsx
    ├── ClientTable.tsx
    ├── WebsiteCard.tsx
    ├── SEOPageRow.tsx
    ├── SEOScoreBadge.tsx
    ├── ServiceCard.tsx
    ├── RevenueChart.tsx
    └── LinkCard.tsx
```

---

## Navigation Update

Update the app sidebar/nav to include:

- **Dashboard** (existing — add revenue widgets)
- **Tasks** (existing task board)
- **Clients** (new — client list)
- **Websites** (new — all websites grid)
- **SEO** (new — quick access to SEO tools)
- **Revenue** (new — revenue dashboard)
- **Agents** (existing agent roster)

---

## Integration with Existing Task System

Link the CRM to the existing task/agent system:

- **"Create Task" button on client profile** — pre-fills the task with client context
- **Tasks can be tagged with a client_id** — add a `client_id` column to the existing `tasks` table
- **Client activity timeline** should show tasks completed for that client
- **SEO audit can auto-create tasks** — e.g., "Fix missing meta descriptions on 5 pages" gets created as a task assigned to the Builder agent

The `clientId` field on the Task model (added in the schema above) enables this. Use Prisma relations to query tasks by client.

---

## Implementation Order

1. **Database:** Add new Prisma models to schema, run `npx prisma generate` and `npx prisma db push`
2. **Client CRUD:** API routes + client list page + client detail page
3. **Website Manager:** API routes + website cards + website detail page
4. **Service Tracker:** API routes + service management per client
5. **Client Links:** Portal links storage and display
6. **SEO Dashboard:** Page data entry + SEO score calculation + display
7. **AI SEO Tools:** Anthropic API integration for meta generation, keyword suggestions, content rewrites
8. **Revenue Dashboard:** Revenue calculations + charts
9. **Navigation:** Update sidebar with new sections
10. **Task Integration:** Link clients to tasks, add "create task" from client pages

---

**START HERE:** Add the new database tables, then build client CRUD and the client list/detail pages. Get a client profile fully working before moving to websites and SEO.
