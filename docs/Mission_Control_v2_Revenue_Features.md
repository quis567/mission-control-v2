# Mission Control v2 — Revenue Features

**Claude Code Expansion Prompt**
**Automated Lead Prospecting, Proposal Generator, Client Reporting**

---

## Context

Mission Control v2 is a live CRM and business operations platform for TruePath Studios, a web design and SEO agency serving contractor and trade businesses in Central Florida.

This prompt adds three revenue-generating features that automate the sales pipeline and client retention process.

**IMPORTANT:** Build on top of what exists. Don't rebuild existing features. Match the existing liquid glass design theme with the dark navy/teal color scheme.

**Project Location:**
```
C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2
```

---

## Feature 1: Automated Lead Prospecting

### What It Does
A "Find Leads" tool built directly into Mission Control that searches for contractor and trade businesses in a target area, reviews their online presence, scores them as leads, and drops them into the client pipeline automatically.

### UI — Lead Prospector Page

Create `/prospector` page with:

**Search Panel (top section):**
- **Target area** text input (e.g., "Winter Garden, FL" or "Orlando, FL")
- **Business types** multi-select checkboxes: Roofer, Plumber, Electrician, General Contractor, HVAC, Painter, Landscaper, Pool Service, Pest Control, Pressure Washing, Flooring, Fencing, Concrete/Paving, Tree Service, Garage Door, Handyman, Cleaning, Custom (text input)
- **Number of leads** dropdown: 10, 15, 20, 25
- **"Find Leads" button** — large, teal accent, prominent

**Results Panel (below search, appears after search completes):**
- Loading state: animated progress bar with status messages ("Searching Google for roofers in Winter Garden...", "Reviewing online presence...", "Scoring leads...")
- Results table with columns:
  - Business Name
  - Trade/Service
  - Location
  - Phone (if found)
  - Website (linked, or "No Website" badge in red)
  - Google Rating (stars)
  - Lead Score (see scoring below)
  - Web Presence Grade (None / Basic / Moderate / Good / Professional)
  - Quick Summary (1 sentence about the business)
  - Actions: "Add to Pipeline" button, "View Details" expand

**Lead Detail Expand (click a row or "View Details"):**
- Full business summary (2-3 sentences)
- Online presence notes
- Services they offer
- Custom sales pitch (AI-generated based on their specific situation)
- Suggested package recommendation (based on their needs)

### Lead Scoring System

Score each lead 0-100 based on:

| Factor | Points | Criteria |
|--------|--------|----------|
| No website | +30 | Huge opportunity — they need one |
| Basic/poor website | +20 | Needs redesign or major improvements |
| Good/professional website | +5 | Harder sell, but maintenance/SEO opportunities |
| No Google Business listing | +15 | Missing basic visibility |
| Low Google rating (< 4.0) | +10 | Reputation management opportunity |
| High Google rating (4.5+) | +5 | Good reviews to showcase on a website |
| Multiple services offered | +10 | More upsell potential |
| 5+ years in business | +10 | Established, likely has budget |
| Local to Winter Garden area | +5 | Easy to serve |

Color code the score:
- 70-100: 🔥 **Hot** (red/orange badge) — high priority lead
- 40-69: 🟡 **Warm** (amber badge) — worth pursuing
- 0-39: 🔵 **Cool** (blue badge) — lower priority

### "Add to Pipeline" Flow

When the user clicks "Add to Pipeline" on a lead:
1. Create a new Client record with all gathered info (business name, contact, phone, website, city, state, business type)
2. Set status to "lead"
3. Store the AI-generated sales pitch in a ClientNote
4. Store the lead score as a tag (e.g., "Lead Score: 85")
5. Store the web presence grade as a tag
6. Redirect or show confirmation: "Added [Business Name] to pipeline as Lead"
7. Option to "Add to Pipeline" in bulk — checkbox select multiple leads and add all at once

### Technical Implementation

**API Route: `POST /api/prospector/search`**

Accepts:
```json
{
  "area": "Winter Garden, FL",
  "businessTypes": ["roofer", "plumber", "electrician"],
  "count": 20
}
```

Uses the Anthropic API with **web search tool enabled** to find businesses:

```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search"
      }
    ],
    messages: [{
      role: 'user',
      content: `You are a lead generation researcher for a web design and SEO agency called TruePath Studios. 

Search for ${count} ${businessTypes.join(', ')} businesses in ${area}. 

For each business, find:
- Business name
- Type of trade/service
- Phone number
- Website URL (or note if they don't have one)
- Google rating (if available)
- Address/location
- Brief description of their business
- Services they offer
- Assessment of their current website quality (None/Basic/Moderate/Good/Professional)
- Notes about their online presence

Respond ONLY with a JSON array. No other text. Each object should have these fields:
businessName, tradeType, phone, website, googleRating, address, city, state, description, servicesOffered, websiteQuality, onlinePresenceNotes`
    }]
  })
});
```

**API Route: `POST /api/prospector/score`**

Takes the raw business data and calculates the lead score + generates a custom sales pitch:

```javascript
// Calculate score based on the scoring table above
// Then call Anthropic API to generate a custom pitch:

const pitchPrompt = `You are a sales expert for TruePath Studios, a web design and SEO agency.

Based on this business profile, write a 2-3 sentence custom sales pitch and recommend the best service package:

Business: ${business.businessName}
Type: ${business.tradeType}  
Website: ${business.website || 'No website'}
Website Quality: ${business.websiteQuality}
Google Rating: ${business.googleRating}
Years in Business: ${business.yearsInBusiness}
Online Presence: ${business.onlinePresenceNotes}

Available packages:
- Starter ($500/mo): Website + basic maintenance + basic SEO
- Growth ($1,000/mo): Website + full SEO + maintenance + Google Business
- Premium ($2,000/mo): Website + full SEO + maintenance + Google Business + content + social media

Respond ONLY with JSON:
{
  "salesPitch": "...",
  "recommendedPackage": "Starter|Growth|Premium",
  "pitchAngle": "brief explanation of why this angle works"
}`;
```

**API Route: `POST /api/prospector/add-to-pipeline`**

Accepts a lead object (or array for bulk), creates Client + ClientNote records, returns the new client IDs.

### Duplicate Detection

Before adding a lead to the pipeline, check if a client with the same business name already exists. If so, show a warning: "A client named [Business Name] already exists. Add anyway?" with options to view the existing client or skip.

### Navigation

Add "Prospector" to the sidebar between "Pipeline" and "Websites" with a Search/Magnifying Glass icon.

### Search History

Store past searches so the user can re-run them:

```prisma
model ProspectorSearch {
  id            String   @id @default(uuid())
  area          String
  businessTypes String   // JSON array
  count         Int
  resultsCount  Int
  leadsAdded    Int      @default(0)
  results       String   // JSON — full results data
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("prospector_searches")
}
```

Add a "Recent Searches" section on the prospector page showing past searches with a "Re-run" button.

---

## Feature 2: Proposal Generator

### What It Does
One-click PDF proposal generation for any client or prospect. Pulls their business info, reviews their current web presence, and generates a branded proposal with package recommendation, pricing, deliverables, and timeline.

### UI — Generate Proposal

**Access points:**
- Button on Client Detail page (Overview tab): "Generate Proposal"
- Button on Pipeline board (card hover action): "Create Proposal"
- Button on Prospector results (after adding to pipeline): "Generate Proposal"

**Proposal Configuration Modal (appears when button is clicked):**
- **Client info** — pre-filled from client record (business name, contact, trade type)
- **Package selection** — dropdown: Starter, Growth, Premium, Custom
- **Custom pricing** — override the package price if needed
- **Include sections** — checkboxes (all checked by default):
  - ✅ Cover page with logo
  - ✅ About TruePath Studios
  - ✅ Website audit summary (if they have a website)
  - ✅ What we'll build / deliverables
  - ✅ Package details and pricing
  - ✅ Timeline
  - ✅ Why choose TruePath
  - ✅ Next steps / CTA
- **Additional notes** — free text field for custom content
- **"Generate Proposal" button**

### Proposal Generation Flow

1. User clicks "Generate Proposal" and configures options
2. App calls Anthropic API to generate proposal content customized to this specific client
3. App generates a branded PDF using the content
4. PDF is stored and linked to the client record
5. User can preview, download, or email the proposal

### AI Content Generation

**API Route: `POST /api/proposals/generate`**

```javascript
const prompt = `You are a proposal writer for TruePath Studios, a web design and SEO agency specializing in contractor and trade businesses.

Generate a professional proposal for this client:

Client: ${client.businessName}
Contact: ${client.contactName}
Trade: ${client.businessType}
Location: ${client.city}, ${client.state}
Current Website: ${client.website || 'None'}
Website Quality: ${websiteQuality || 'No website'}
Package: ${selectedPackage.name} — $${selectedPackage.price}/mo

Write these sections in professional, persuasive language:

1. EXECUTIVE_SUMMARY — 2-3 paragraphs about their specific situation and how we can help. Reference their business type and location specifically.

2. WEBSITE_AUDIT — If they have a website, provide 3-4 specific observations about what could be improved. If no website, explain what they're missing out on (local SEO, credibility, lead generation). Be specific to their trade.

3. DELIVERABLES — Bulleted list of exactly what's included in their package. Be specific (e.g., "5-page responsive website" not just "website").

4. TIMELINE — Realistic project timeline with milestones (e.g., "Week 1-2: Discovery & Design, Week 3-4: Development, Week 5: Launch")

5. WHY_TRUEPATH — 3-4 compelling reasons to choose us. Focus on specialization in contractor/trade businesses, local Central Florida presence, and results.

6. NEXT_STEPS — Clear call to action. What they need to do to get started.

Respond ONLY with JSON:
{
  "executiveSummary": "...",
  "websiteAudit": "...",
  "deliverables": ["item1", "item2", ...],
  "timeline": [{"phase": "...", "duration": "...", "description": "..."}],
  "whyTruePath": ["reason1", "reason2", ...],
  "nextSteps": "..."
}`;
```

### PDF Generation

Use a PDF library (like `@react-pdf/renderer` or `jspdf` + `html2canvas`) to create a branded PDF:

**Page 1 — Cover:**
- TruePath Studios logo (large, centered)
- "Website & Digital Marketing Proposal"
- "Prepared for: [Business Name]"
- "[Contact Name]"
- Date
- Dark background with brand colors

**Page 2 — About Us:**
- Brief about TruePath Studios
- Specialization in contractor/trade businesses
- Local Central Florida presence

**Page 3 — Your Situation (Executive Summary + Audit):**
- AI-generated executive summary
- Website audit findings (if applicable)
- Screenshots or notes about current web presence

**Page 4 — What We'll Deliver:**
- Package name and description
- Detailed deliverables list
- Project timeline with milestones

**Page 5 — Investment:**
- Package pricing
- Payment terms (monthly, one-time setup fees if any)
- What's included vs. add-ons

**Page 6 — Next Steps:**
- Clear CTA
- Contact info for TruePath Studios
- Signature line (optional)

### Proposal Storage

```prisma
model Proposal {
  id          String   @id @default(uuid())
  clientId    String   @map("client_id")
  packageId   String?  @map("package_id")
  content     String   // JSON — all generated sections
  pdfUrl      String?  @map("pdf_url") // path to generated PDF
  customPrice Float?   @map("custom_price")
  status      String   @default("draft") // draft, sent, accepted, declined
  sentAt      DateTime? @map("sent_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  client      Client   @relation(fields: [clientId], references: [id])
  
  @@map("proposals")
}
```

Add relation to Client model:
```prisma
// Add to existing Client model:
  proposals   Proposal[]
```

### Proposals List on Client Detail

Add a "Proposals" tab on the client detail page showing:
- All proposals generated for this client
- Status badges (Draft, Sent, Accepted, Declined)
- Date created
- Package and price
- Download PDF button
- "Resend" button
- "Mark as Accepted/Declined" buttons

---

## Feature 3: Client Reporting

### What It Does
Automated monthly reports for each active client showing what work was done, SEO progress, and results. Generated as branded PDFs that can be downloaded or emailed.

### UI — Reports

**Reports Page (`/reports`):**
- List of all active clients with:
  - Client name
  - Package
  - Last report date
  - "Generate Report" button
  - "View Past Reports" link
- **"Generate All Reports" button** — batch generates reports for all active clients
- **Month/Year selector** — choose which month to generate reports for

**Report Preview:**
- After generating, show a preview of the report content
- "Download PDF" and "Email to Client" buttons

### Report Content (AI-Generated)

**API Route: `POST /api/reports/generate`**

Accepts `{ clientId, month, year }`

The report pulls real data from the database:

1. **SEO Changes** — query seo_changes table for this client's websites during the target month
2. **Tasks Completed** — query tasks linked to this client that were completed during the month
3. **Website Updates** — query websites table for lastUpdated changes
4. **Service Activity** — what services are active

Then sends to Anthropic API for professional formatting:

```javascript
const prompt = `You are a client success manager at TruePath Studios writing a monthly performance report.

Generate a professional, positive monthly report for this client:

Client: ${client.businessName}
Package: ${package.name} — $${package.price}/mo
Report Period: ${monthName} ${year}

Data from this month:
SEO Changes Made: ${JSON.stringify(seoChanges)}
Tasks Completed: ${JSON.stringify(completedTasks)}
Website Updates: ${JSON.stringify(websiteUpdates)}
Active Services: ${JSON.stringify(activeServices)}
Current SEO Scores: ${JSON.stringify(currentSeoScores)}

Write these sections:

1. SUMMARY — 2-3 sentence overview of what was accomplished this month. Be positive and specific.

2. SEO_PROGRESS — What SEO work was done, what improved. Reference specific pages and scores if available. If no SEO data exists, note that SEO monitoring will begin next month.

3. WEBSITE_UPDATES — Any changes made to their website this month. If none, mention that the site is stable and performing well.

4. TASKS_COMPLETED — Summary of work done (not a raw task list — translate into client-friendly language).

5. NEXT_MONTH — What we plan to focus on next month. Be specific and actionable.

6. RECOMMENDATIONS — 1-2 suggestions for additional services or improvements they could benefit from (subtle upsell opportunities).

Keep the tone professional, positive, and results-focused. The client should feel like they're getting great value.

Respond ONLY with JSON:
{
  "summary": "...",
  "seoProgress": "...",
  "websiteUpdates": "...",
  "tasksCompleted": "...",
  "nextMonth": "...",
  "recommendations": "..."
}`;
```

### Report PDF Design

**Page 1 — Cover:**
- TruePath Studios logo
- "Monthly Performance Report"
- Client business name
- Report period (e.g., "March 2026")
- Professional dark/teal design matching brand

**Page 2 — Executive Summary:**
- Month highlights
- Key metrics at a glance (SEO score, pages optimized, tasks completed)

**Page 3 — SEO Performance:**
- SEO score trend (if multiple months of data)
- Changes made this month
- Pages optimized
- Before/after comparisons (if available from seo_changes)

**Page 4 — Work Completed:**
- Tasks summary in client-friendly language
- Website updates
- Any new content created

**Page 5 — Looking Ahead:**
- Next month's plan
- Recommendations
- Contact info

### Report Storage

```prisma
model Report {
  id        String   @id @default(uuid())
  clientId  String   @map("client_id")
  month     Int
  year      Int
  content   String   // JSON — all generated sections
  pdfUrl    String?  @map("pdf_url")
  sentAt    DateTime? @map("sent_at")
  createdAt DateTime @default(now()) @map("created_at")
  
  client    Client   @relation(fields: [clientId], references: [id])
  
  @@map("reports")
}
```

Add relation to Client model:
```prisma
// Add to existing Client model:
  reports     Report[]
```

### Reports on Client Detail

Add a "Reports" tab on the client detail page showing:
- All past reports for this client
- Month/year, status (generated, sent)
- Download PDF button
- "Send to Client" button (future: email integration)

### Navigation

Add "Reports" to the sidebar after "Revenue" with a FileText/Document icon.

---

## Updated Navigation Order

After all features are added, the sidebar should be:

1. **Dashboard** (LayoutDashboard icon)
2. **Tasks** (CheckSquare icon)
3. **Pipeline** (Columns icon) — client kanban board
4. **Prospector** (Search icon) — lead finder
5. **Clients** (Users icon) — client list
6. **Websites** (Globe icon)
7. **SEO** (BarChart icon)
8. **Proposals** (FileText icon) — if you want a standalone proposals list page
9. **Reports** (FileBarChart icon)
10. **Revenue** (DollarSign icon)
11. **Agents** (Bot icon)

---

## Database Migrations

After adding all new models (ProspectorSearch, Package, Proposal, Report), run:

```bash
npx prisma generate
npx prisma db push
```

Seed the default packages (Starter, Growth, Premium) in the seed script.

---

## Feature 4: Netlify Integration

### What It Does
Connects to the user's Netlify account and auto-populates website data for all client sites. No more manually typing hosting info, SSL status, or last updated dates.

### Setup

The user has one Netlify account with ~4 client sites. They deploy by dragging local files into Netlify (no GitHub integration yet).

**Environment Variable:**
Add to `.env.local` and `.env.example`:
```env
NETLIFY_ACCESS_TOKEN=your-netlify-personal-access-token
```

The user gets this from: Netlify → User Settings → Applications → Personal Access Tokens → New Access Token

### API: Fetch All Netlify Sites

**`GET /api/integrations/netlify/sites`**

```javascript
const response = await fetch('https://api.netlify.com/api/v1/sites', {
  headers: {
    'Authorization': `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}`
  }
});
```

Returns for each site:
- `id` — Netlify site ID
- `name` — site name
- `url` — live URL
- `ssl_url` — HTTPS URL
- `custom_domain` — custom domain if set
- `published_deploy.created_at` — last deploy date
- `published_deploy.state` — deploy status (ready, error, building)
- `ssl.state` — SSL certificate status
- `ssl.expires_at` — SSL expiration date
- `created_at` — when the site was created
- `updated_at` — last update

### API: Fetch Single Site Details

**`GET /api/integrations/netlify/sites/[siteId]`**

Gets detailed info including deploy history.

### API: Fetch Deploy History

**`GET /api/integrations/netlify/sites/[siteId]/deploys`**

```javascript
const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=10`, {
  headers: {
    'Authorization': `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}`
  }
});
```

Returns last 10 deploys with status, date, deploy time, and error messages if any.

### Link Netlify Sites to Clients

On the **Website record** in the client detail page, add:
- **"Link Netlify Site" button** — opens a dropdown listing all sites from the Netlify account
- User selects which Netlify site corresponds to this client's website
- Save the `netlify_site_id` on the Website record

Add to the Website model:
```prisma
// Add to existing Website model:
  netlifySiteId  String?  @map("netlify_site_id")
  githubRepoUrl  String?  @map("github_repo_url")
```

### Auto-Sync Data

Once a Netlify site is linked, auto-populate these Website fields from Netlify data:
- `status` → map from deploy state (ready = "live", building = "development", error = "maintenance")
- `sslStatus` → from ssl.state and ssl.expires_at
- `lastUpdated` → from published_deploy.created_at
- `hostingProvider` → "Netlify"
- `domainExpiration` → from SSL expiry (Netlify manages SSL with Let's Encrypt)

### Netlify Status on Website Cards

On the `/websites` page and client detail Websites tab, show:
- Green dot + "Live" if last deploy was successful
- Yellow dot + "Building" if a deploy is in progress
- Red dot + "Failed" if last deploy had errors
- Last deploy date and time
- Deploy count

### Auto-Refresh

Add a "Sync with Netlify" button on the websites page that refreshes all linked sites with latest Netlify data. Also auto-sync on page load (but cache for 5 minutes to avoid rate limits).

---

## Feature 5: GitHub Integration

### What It Does
Links client website repos on GitHub to track code changes, last commit dates, and repo status.

### Setup

**Environment Variable:**
```env
GITHUB_ACCESS_TOKEN=your-github-personal-access-token
```

The user gets this from: GitHub → Settings → Developer Settings → Personal Access Tokens → Generate New Token (classic) → select `repo` scope.

### API: Fetch User Repos

**`GET /api/integrations/github/repos`**

```javascript
const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
  headers: {
    'Authorization': `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  }
});
```

### API: Fetch Recent Commits

**`GET /api/integrations/github/repos/[owner]/[repo]/commits`**

Returns last 10 commits with date, message, and author.

### Link GitHub Repos to Client Websites

On the Website record, add:
- **"Link GitHub Repo" button** — dropdown of repos from the GitHub account
- User selects which repo belongs to this client's website
- Save the `github_repo_url` on the Website record

### Show on Website Cards

When a GitHub repo is linked, show:
- Last commit date
- Last commit message (truncated)
- Link to the repo (opens in new tab)
- Total commits count

### Future Use

This sets the groundwork for the Claude Code → GitHub → Netlify auto-deploy flow. Once repos are linked, a future feature can:
1. Claude Code pushes website changes to the linked GitHub repo
2. If Netlify is connected to that repo, it auto-deploys
3. Mission Control shows the deploy status in real time

We won't build the auto-deploy flow in this prompt — just the data integration.

---

## Feature 6: SEO Auto-Crawler

### What It Does
Instead of manually entering page SEO data, the crawler visits a client's live website, follows internal links, and extracts all SEO data automatically. Populates the SEO dashboard with real data from the actual site.

### How It Works

1. User clicks "Crawl Site" on a website's SEO dashboard
2. App sends the website URL to the Anthropic API with web search enabled
3. Claude visits the site, extracts SEO data from each page
4. Results are saved to the SeoPage records in the database
5. SEO scores are calculated automatically
6. User can re-crawl anytime to check for changes

### API: Crawl Website

**`POST /api/seo/crawl`**

Accepts: `{ websiteId }`

Gets the website URL from the database, then calls Claude:

```javascript
const prompt = `You are an SEO auditor. Visit this website and analyze every page you can find by following internal links.

Website URL: ${website.url}

For each page you find, extract:
- pageUrl (full URL)
- pageTitle (the <title> tag content)
- titleLength (character count of title)
- metaDescription (the meta description content)
- metaDescLength (character count)
- h1Tag (the H1 text, or null if missing)
- h1Count (how many H1 tags on the page)
- headingStructure (JSON object counting H2, H3, H4, H5, H6 tags)
- imagesTotal (total number of <img> tags)
- imagesWithAlt (number of images that have alt text)
- internalLinks (number of links pointing to same domain)
- externalLinks (number of links pointing to other domains)
- wordCount (approximate word count of visible body text)

Analyze up to 20 pages maximum. Start with the homepage, then follow internal navigation links.

Respond ONLY with a JSON array of page objects. No other text.`;

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search"
      }
    ],
    messages: [{ role: 'user', content: prompt }]
  })
});
```

### After Crawl

1. Parse the JSON array of pages
2. For each page:
   - Check if a SeoPage record already exists for that URL
   - If yes: update the existing record, log changes in SeoChange table
   - If no: create a new SeoPage record
3. Calculate SEO score for each page using the existing scoring formula
4. Set `lastAudited` to current timestamp
5. Return the results

### Crawl UI

On the SEO dashboard (`/seo/[websiteId]`):

**"Crawl Site" button (prominent, top right):**
- Shows loading state with progress: "Crawling homepage...", "Found 12 pages...", "Extracting SEO data..."
- After completion: "Crawl complete — 15 pages analyzed, 4 issues found"
- Auto-refreshes the page data table

**Last Crawled indicator:**
- Show "Last crawled: March 15, 2026 at 2:30 PM" or "Never crawled"
- If last crawl was > 30 days ago, show amber warning: "SEO data may be outdated — consider re-crawling"

**Crawl History:**
- Store crawl timestamps and page counts
- Show a small history section: "Crawl history: Mar 15 (15 pages), Feb 12 (14 pages), Jan 8 (12 pages)"

### Crawl Storage

```prisma
model CrawlHistory {
  id          String   @id @default(uuid())
  websiteId   String   @map("website_id")
  pagesFound  Int      @map("pages_found")
  issuesFound Int      @default(0) @map("issues_found")
  crawledAt   DateTime @default(now()) @map("crawled_at")
  
  website     Website  @relation(fields: [websiteId], references: [id])
  
  @@map("crawl_history")
}
```

Add relation to Website model:
```prisma
// Add to existing Website model:
  crawlHistory  CrawlHistory[]
```

### Auto-Crawl for Netlify-Linked Sites

When a Netlify site shows a new deploy was completed (detected during sync), automatically trigger a re-crawl of that site's SEO data. This keeps SEO data fresh whenever the site is updated.

---

## Updated Database Migrations

All new models to add:
- `ProspectorSearch` (lead prospecting history)
- `Package` (service packages)
- `Proposal` (generated proposals)
- `Report` (monthly client reports)
- `CrawlHistory` (SEO crawl tracking)

Updates to existing models:
- `Client` → add `packageId`, relations to Proposal and Report
- `Website` → add `netlifySiteId`, `githubRepoUrl`, relation to CrawlHistory

After adding all models:
```bash
npx prisma generate
npx prisma db push
```

---

## Updated Environment Variables

Add to `.env.local` and `.env.example`:
```env
# Netlify (for site monitoring and data sync)
NETLIFY_ACCESS_TOKEN=your-netlify-personal-access-token

# GitHub (for repo tracking and code change monitoring)  
GITHUB_ACCESS_TOKEN=your-github-personal-access-token
```

The user will need to generate these tokens before the integrations work. Show a friendly setup message in the UI if the tokens are missing: "Connect your Netlify account to auto-sync website data. [Setup Instructions]"

---

## Updated Navigation Order

1. **Dashboard** (LayoutDashboard icon)
2. **Tasks** (CheckSquare icon)
3. **Pipeline** (Columns icon)
4. **Prospector** (Search icon)
5. **Clients** (Users icon)
6. **Websites** (Globe icon) — now shows Netlify/GitHub status
7. **SEO** (BarChart icon) — now with auto-crawler
8. **Proposals** (FileText icon)
9. **Reports** (FileBarChart icon)
10. **Revenue** (DollarSign icon)
11. **Agents** (Bot icon)

---

## Implementation Order

1. **Database** — Add all new models (ProspectorSearch, Package, Proposal, Report, CrawlHistory). Update Website and Client models. Push to Supabase. Seed packages.
2. **Prospector** — Search API with web search, scoring, results page, add-to-pipeline flow
3. **Proposal Generator** — AI content generation, PDF creation, storage, client detail integration
4. **Client Reporting** — Data aggregation, AI report writing, PDF creation, reports page
5. **Netlify Integration** — API connection, site linking, auto-sync, status display on website cards
6. **GitHub Integration** — API connection, repo linking, commit tracking
7. **SEO Auto-Crawler** — Crawl API, auto-populate SEO data, crawl history, auto-crawl on deploy
8. **Navigation** — Update sidebar with all new items
9. **Testing** — Test each feature end-to-end with real data
10. **Deploy** — `vercel --prod`

---

**START HERE:** Add all new database models and seed packages. Then build the Prospector — it's the highest-impact feature and will immediately generate pipeline activity.
