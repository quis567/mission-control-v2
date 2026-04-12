# Redesign Clients Page — Claude Code Prompt

Read the project context file: `Mission_Control_v2_Project_Context.md`

## Problem

The Clients page currently shows basic cards with just the client name, contact, business type, location, and counts (sites, services, tasks). It's missing critical business information like revenue, package tier, SEO health, and last activity. There's no way to tell which clients need attention or which are most valuable.

---

## Page Header Redesign

Replace the current simple header with a revenue-aware summary:

```
Clients
3 total · 2 active · 1 lead · $2,500/mo MRR
                                              [ + Add Client ]
```

Show:
- Total client count
- Count by status (active, lead, prospect, etc.)
- Total MRR from all active clients (sum of monthly service/package revenue)

---

## Client Card Redesign

Each card should show much more useful information at a glance:

### Card Layout:

```
┌──────────────────────────────────────────────────────────┐
│  RevitaLine Health                          [active] ●🟢 │
│  Michael Santiago                                        │
│  Health and Wellness · Farmingdale, NY                   │
│                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│  │ 💰 $1,000  │ │ 📊 SEO: 71%│ │ 🌐 1 site  │            │
│  │ Growth pkg │ │ 5 issues   │ │ Wix        │            │
│  └────────────┘ └────────────┘ └────────────┘            │
│                                                          │
│  Last activity: SEO crawl — 2 days ago                   │
│                                                          │
│  [ View Profile ]  [ SEO Dashboard ]  [ Create Task ]    │
└──────────────────────────────────────────────────────────┘
```

### Card Elements:

**Header row:**
- Client/business name (bold, large)
- Status badge (active = green, lead = blue, prospect = purple, proposal = amber, paused = gray, churned = red)
- Health indicator dot (see below)

**Contact & location:**
- Contact person name
- Business type + City, State

**Three info boxes (compact row):**

Box 1 — Revenue:
- Monthly revenue amount (from active services or package price)
- Package name (Starter, Growth, Premium, Custom)
- If no package: show "No package" in gray
- Color: teal/green accent

Box 2 — SEO Health:
- Average SEO score across all client websites
- Number of open issues
- If never crawled: show "Not audited" in gray
- Color: green (80+), yellow (50-79), red (<50)

Box 3 — Sites:
- Number of websites
- Site type indicator (TruePath Managed, WordPress, Wix, etc.)
- If no sites: show "No sites" in gray
- Color: blue accent

**Last activity line:**
- Show the most recent action taken for this client:
  - Last task completed: "Task completed — [task title] — 3 days ago"
  - Last SEO crawl: "SEO crawl — 2 days ago"
  - Last deploy: "Site deployed — 1 week ago"
  - Last note added: "Note added — 5 days ago"
  - Last proposal: "Proposal created — 2 weeks ago"
- If no activity: "No recent activity" in amber (this is a flag to pay attention)
- Pull from: most recent across Task, CrawlHistory, ClientNote, Proposal tables linked to this client

**Action buttons:**
- "View Profile" → navigate to client detail page
- "SEO Dashboard" → navigate to SEO page for client's primary website
- "Create Task" → open new task modal pre-filled with this client

---

## Client Health Indicator

A colored dot next to the status badge that shows if the client needs attention:

**🟢 Green — Healthy:**
- Client has active services
- Website was crawled within the last 14 days
- No critical SEO issues
- Has had activity in the last 14 days

**🟡 Yellow — Needs attention:**
- No activity in 14-30 days, OR
- Has 3+ SEO issues, OR
- Website hasn't been crawled in 14+ days

**🔴 Red — At risk:**
- No activity in 30+ days, OR
- Has critical SEO issues (score below 50), OR
- Client status is "Paused"
- This client is paying you but you're not doing anything — money walking out the door

**⚪ Gray — N/A:**
- Client is a lead or prospect (not yet active, no health tracking needed)

The health check logic:

```javascript
function getClientHealth(client) {
  // Not applicable for non-active clients
  if (client.status !== 'Active') return 'gray';
  
  const daysSinceActivity = getDaysSince(client.lastActivityDate);
  const hasCriticalSEO = client.avgSeoScore < 50;
  const hasManySEOIssues = client.seoIssueCount >= 3;
  const notCrawledRecently = getDaysSince(client.lastCrawlDate) > 14;
  
  // Red: at risk
  if (daysSinceActivity > 30 || hasCriticalSEO || client.status === 'Paused') {
    return 'red';
  }
  
  // Yellow: needs attention  
  if (daysSinceActivity > 14 || hasManySEOIssues || notCrawledRecently) {
    return 'yellow';
  }
  
  // Green: healthy
  return 'green';
}
```

---

## Sort Options

Add a sort dropdown next to the status filter:

```
Search clients...    [All statuses ▾]    [Sort by: Revenue ▾]
```

Sort options:
- **Revenue (high to low)** — see your most valuable clients first
- **Revenue (low to high)** — see upsell opportunities
- **Last activity (oldest first)** — see neglected clients that need attention
- **SEO score (lowest first)** — see worst-performing sites
- **Name (A-Z)** — alphabetical
- **Date added (newest first)** — most recent clients

Default sort: Revenue (high to low)

---

## View Toggle (Cards vs. Table)

Add a toggle in the top right to switch between card view and table view:

```
[Grid icon] [Table icon]
```

**Table view columns:**
| Client | Contact | Status | Package | Revenue | SEO Score | Sites | Last Activity | Health |
|--------|---------|--------|---------|---------|-----------|-------|---------------|--------|

Table view is better when the user has 10+ clients — easier to scan and compare. Cards are better for a visual overview with fewer clients.

Save the user's preference in localStorage so it persists.

---

## API Endpoint

Create or update the clients list endpoint to return enriched data:

### `GET /api/clients` (enhanced)

Each client in the response should include:

```json
{
  "id": "abc-123",
  "businessName": "RevitaLine Health",
  "contactName": "Michael Santiago",
  "businessType": "Health and Wellness",
  "city": "Farmingdale",
  "state": "NY",
  "status": "Active",
  "package": {
    "name": "Growth",
    "price": 1000
  },
  "monthlyRevenue": 1000,
  "websites": [
    {
      "id": "xyz",
      "url": "revitalinehealth.com",
      "cmsPlatform": "Wix",
      "seoScore": 71,
      "seoIssues": 5
    }
  ],
  "websiteCount": 1,
  "serviceCount": 1,
  "taskCount": 0,
  "avgSeoScore": 71,
  "totalSeoIssues": 5,
  "lastActivity": {
    "type": "seo_crawl",
    "description": "SEO crawl completed",
    "date": "2026-04-02T17:00:00Z"
  },
  "health": "green"
}
```

This should be computed server-side with efficient JOINs, not N+1 queries. Use Prisma includes:

```javascript
const clients = await prisma.client.findMany({
  include: {
    websites: {
      include: {
        seoPages: {
          select: { score: true, issues: true, lastCrawled: true }
        }
      }
    },
    services: { where: { status: 'active' } },
    package: true,
    tasks: { 
      orderBy: { updatedAt: 'desc' }, 
      take: 1,
      where: { status: 'done' }
    },
    notes: { 
      orderBy: { createdAt: 'desc' }, 
      take: 1 
    },
    proposals: { 
      orderBy: { createdAt: 'desc' }, 
      take: 1 
    }
  },
  orderBy: { businessName: 'asc' }
});
```

Then compute `monthlyRevenue`, `avgSeoScore`, `totalSeoIssues`, `lastActivity`, and `health` from the included data before returning.

---

## Quick Stats Row (Optional Enhancement)

Below the page header, show a row of summary stats across all clients:

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ $2,500       │ │ 🟢 2 Healthy │ │ 🟡 1 Needs   │ │ Avg SEO: 74  │
│ Monthly MRR  │ │              │ │   Attention  │ │ across sites │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

This gives an instant health check of the entire client portfolio.

---

## Design Notes

- Keep the dark navy/teal glassmorphism theme
- Cards should have a subtle left border color matching client health (green/yellow/red/gray)
- The three info boxes inside each card should be compact — not full-width, just small badges
- Revenue should be the most prominent number on the card (it's what matters most)
- Status badges use existing colors: active=green, lead=blue, prospect=purple, proposal=amber, paused=gray, churned=red
- Health dots are small (8px) circles next to the status badge
- The "Last activity" line should use relative time ("2 days ago", "1 week ago")
- Hover effect on cards: subtle border glow
- Clicking anywhere on the card navigates to the client detail page (except the action buttons which have their own targets)
- Responsive: 3 columns desktop, 2 tablet, 1 mobile
- Table view: striped rows, sortable columns (click header to sort), compact padding

---

## After making changes:

1. Test with existing client data
2. Verify revenue calculations are correct
3. Verify health indicators show appropriate colors
4. Test sort options
5. Test card vs. table view toggle
6. Verify last activity pulls from the right sources
7. Deploy: `vercel --prod` or `git push`
