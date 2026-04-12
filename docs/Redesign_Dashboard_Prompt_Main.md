# Redesign Main Dashboard — Claude Code Prompt

Read the project context file: `Mission_Control_v2_Project_Context.md`

## Goal

Redesign the main dashboard page (`/` or `/dashboard`) to be a proper command center overview. The current dashboard is too basic — just stat counters, an empty active tasks list, agent roster, and recently done tasks. Replace it with a dynamic, data-rich dashboard that pulls real data from the database and gives a complete at-a-glance view of the entire business.

Keep the app's existing **dark navy/teal glassmorphism** theme.

---

## New Dashboard Layout

### Section 1: Top KPI Row (4 stat cards)

Four glassmorphic cards across the top, each showing a live metric pulled from the database:

| Card | Value | Subtitle | Change Indicator |
|------|-------|----------|-----------------|
| Monthly Revenue | `$X,XXX` | Monthly recurring revenue | `+$500 from last month` (green) or `-$200` (red) |
| Active Clients | `6` | Active clients | `+2 this month` |
| SEO Issues | `12` | SEO issues found | `across 3 sites` |
| Tasks Completed | `3` | Tasks completed | `this week` |

**Data sources:**
- Revenue: Sum of `Service.price` where `Service.status = 'active'` and `Service.billingType = 'monthly'`, OR sum from `Client` records with active packages
- Active Clients: Count of `Client` where `status = 'Active'`
- SEO Issues: Count issues from `SeoPage.issues` JSON across all websites (count items where status is warning or fail)
- Tasks Completed: Count of `Task` where `status = 'done'` and `updatedAt` is within the last 7 days

Each card should show a comparison to the previous period (last month for revenue/clients, last week for tasks). If data isn't available for comparison, just show the current value without the change indicator.

---

### Section 2: Quick Navigation Cards (grid of 8)

A grid of clickable cards (4 columns, 2 rows) representing the main sections of the app. Each card links to its page and shows a **live badge** with real data.

```
[ Tasks        ] [ Pipeline      ] [ Prospector   ] [ Clients      ]
  Kanban board     Client stages     AI lead finder   Client list
  ● 2 active       ● 3 leads         ● New            ● 6 active

[ Websites     ] [ SEO           ] [ Proposals    ] [ Revenue      ]
  Site management  SEO dashboards   AI proposals     MRR & charts
  ● 6 sites        ● 12 issues      ● 1 draft        ● $4.5k
```

**Each card has:**
- Section name (bold, 14px)
- Short description (12px, muted)
- Live badge with count pulled from database:
  - Tasks: count where `status = 'in_progress'` or `status = 'todo'`
  - Pipeline: count of `Client` where `status = 'Lead'`
  - Prospector: just show "New" badge (or count of `ProspectorSearch` this month)
  - Clients: count where `status = 'Active'`
  - Websites: count of `Website` records
  - SEO: total issues count from `SeoPage.issues`
  - Proposals: count of `Proposal` where `status = 'draft'`
  - Revenue: formatted MRR total

**Badge colors:**
- Green: positive/good (active clients, revenue)
- Blue: informational (sites, tasks)
- Amber: attention (new, drafts)
- Red: issues needing action (SEO issues)

**On click:** Navigate to the respective page (e.g., clicking "Tasks" goes to `/tasks`)

**Styling:** Glassmorphic cards with subtle border, slight hover effect (border brightens on hover), consistent padding.

---

### Section 3: Two-Column Layout Below

**Left column (wider, ~60-65%):**

#### Panel A: Pipeline Funnel

A horizontal bar chart showing client counts at each pipeline stage. This gives an instant visual of the sales pipeline.

```
Leads      ████████████████████████████  8
Prospects  ██████████████████            5
Proposals  █████████████                 3
Active     ████████████████████          6
Paused     ████                          1
Churned    ████                          1
```

- Each bar is a different color:
  - Leads: blue (#3b82f6)
  - Prospects: indigo (#6366f1)
  - Proposals: purple (#8b5cf6)
  - Active: green (#10b981)
  - Paused: amber (#f59e0b)
  - Churned: red (#ef4444)
- Bar widths are proportional to the count
- Clicking a bar navigates to the Pipeline page filtered to that stage
- Pull data from: `Client` table grouped by `status`

**Panel title:** "Pipeline funnel" with a "View pipeline →" link on the right

#### Panel B: Recent Activity Feed

A timeline of recent events across the entire app. This makes the dashboard feel alive.

Show the 8-10 most recent events, each with:
- Colored dot (green = success, blue = info, purple = agent, amber = change, red = issue)
- Event description
- Relative timestamp ("2 hours ago", "Yesterday", "3 days ago")

**Events to track (pull from the `Activity` table, or create queries):**
- SEO crawl completed — "[site] crawled, score: X%"
- New client added — "New client: [name]"
- Proposal generated — "Proposal for [client]"
- SEO changes applied — "Meta tags updated on [page]"
- Website deployed — "[site] deployed via Netlify"
- Task completed — "[task title] completed"
- Client status changed — "[client] moved to [stage]"
- Agent task started — "[agent] started working on [task]"

If the `Activity` table doesn't have enough data, fall back to combining recent records from `Task` (completed), `Client` (recently created), `SeoPage` (recently crawled), `Proposal` (recently created), and `CrawlHistory` (recent crawls). Sort all by date, take the most recent 8-10.

**Panel title:** "Recent activity" with a "View all →" link

---

**Right column (narrower, ~35-40%):**

#### Panel C: Revenue Snapshot

A compact revenue overview:
- Large MRR number at the top (e.g., "$4,500")
- Label: "Monthly recurring revenue"
- Mini bar chart showing MRR over the last 6-7 months
  - Simple vertical bars, no axis labels needed, just month abbreviations below
  - Bar color: teal/info color
  - If historical revenue data isn't available, show just the current month's bar or skip the chart

**Data source:** Calculate from `Service` records with active monthly billing, or from `Package` prices linked to active clients.

**Panel title:** "Revenue snapshot" with "View details →" link to `/revenue`

#### Panel D: Agent Status

A compact list of the AI agents with their current status:

```
● Operations Manager    Idle
● Builder               Idle
● Marketing Architect   Idle
● Quality Reviewer      Idle
● SOP Engineer          Idle
● Systems Architect     Idle
● Onboarding Specialist Idle
```

- Green dot = working on a task
- Gray dot = idle
- Show only the first 4-5 agents to save space, with a "View all →" link to `/agents`

**Data source:** `Agent` table, cross-referenced with active `Task` records to determine if any agent is currently assigned to an in-progress task.

#### Panel E: Quick Actions

A row of small action buttons for common tasks:
- **+ New client** → opens the add client flow (navigate to `/clients` with a modal trigger, or `/clients/new`)
- **+ New task** → opens the new task modal (navigate to `/tasks` with modal trigger)
- **Find leads** → navigate to `/prospector`
- **Create proposal** → navigate to `/proposals/new` or `/proposals` with creation flow
- **Crawl all sites** → triggers a bulk SEO crawl (hits the crawl endpoint for each website)

Style these as small, subtle bordered buttons. They're shortcuts, not primary actions.

---

## API Endpoint

Create a single API endpoint that returns all dashboard data in one call:

### `GET /api/dashboard`

**Returns:**
```json
{
  "kpis": {
    "mrr": 4500,
    "mrrChange": 500,
    "activeClients": 6,
    "activeClientsChange": 2,
    "seoIssues": 12,
    "seoIssuesSites": 3,
    "tasksCompleted": 3
  },
  "navigation": {
    "activeTasks": 2,
    "leads": 3,
    "activeClients": 6,
    "websites": 6,
    "seoIssues": 12,
    "draftProposals": 1,
    "mrr": 4500
  },
  "pipeline": {
    "Lead": 8,
    "Prospect": 5,
    "Proposal": 3,
    "Active": 6,
    "Paused": 1,
    "Churned": 1
  },
  "recentActivity": [
    {
      "type": "seo_crawl",
      "message": "SEO crawl completed — truepathstudios.com (score: 71%)",
      "timestamp": "2025-04-04T17:29:00Z",
      "color": "green"
    }
  ],
  "revenue": {
    "current": 4500,
    "history": [2000, 2500, 3000, 3500, 4000, 4500]
  },
  "agents": [
    { "name": "Operations Manager", "status": "idle" },
    { "name": "Builder", "status": "idle" }
  ]
}
```

This single endpoint makes the dashboard load fast — one API call instead of 8 separate ones.

---

## Design Notes

- Use the existing glassmorphic card components from the app
- All cards/panels should have the same `backdrop-blur`, border, and background opacity as existing components
- Navigation cards should have a subtle hover animation (border glow, slight scale, or brightness change)
- The pipeline funnel bars should animate in on page load (grow from left to right)
- Badge colors should use the semantic colors from the existing theme
- The activity feed dots should match the event type color
- Revenue mini-chart bars should use a subtle teal/info color
- Everything must be responsive — on mobile, the two-column layout should stack to single column, and the nav grid should go to 2 columns
- The KPI stat cards should show the number in the accent color (teal for revenue, green for clients, amber for issues, blue for tasks)
- Quick action buttons should be subtle — small bordered pills, not prominent CTAs

## Page Header

Keep "COMMAND CENTER" as the page title with "TruePath Studios Operations" subtitle. Keep the "+ New Task" button in the top right.

---

## After making changes:

1. Test that all data pulls correctly from the database
2. Verify navigation cards link to the correct pages
3. Check that the pipeline funnel shows real client stage counts
4. Verify the activity feed shows real recent events
5. Test responsive layout on mobile
6. Deploy: `vercel --prod` or `git push`
