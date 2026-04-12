# Redesign Pipeline Page — Claude Code Prompt

Read the project context file: `Mission_Control_v2_Project_Context.md`

## Problems to Fix

1. **"NaN" showing on every card** — there's a bug where revenue or some numeric field is displaying NaN. Find the source and fix it. Likely `client.monthlyRevenue` or `client.package?.price` is null/undefined and being rendered without a fallback.

2. **Cards are too basic** — only showing name, contact, business type, and a broken value. Pipeline cards need to communicate deal value and urgency.

3. **No revenue per column** — this is a sales pipeline, you need to see total revenue per stage at a glance.

4. **No time-in-stage tracking** — how long has a lead been sitting there? Is a deal going cold?

5. **$0/mo active revenue in header** — tied to the NaN bug, revenue calculation is broken.

---

## Fix the NaN Bug First

Search the pipeline page component for where the NaN is being rendered. It's likely one of these:

```javascript
// BAD — if monthlyRevenue is null, this shows NaN
client.monthlyRevenue

// FIX — add fallback
client.monthlyRevenue ?? 0
// or
client.package?.price ?? 0
// or format it properly
const revenue = client.monthlyRevenue || client.package?.price || 0;
```

Also fix the header "$0/mo active revenue" calculation — it should sum `package.price` or `service.price` for all clients in the "Active Client" column.

---

## Pipeline Card Redesign

Each card in the kanban columns should show:

### For Leads & Prospects:
```
┌─────────────────────────────────┐
│  Boardroom Cafe and Catering    │
│  George Santiago                │
│  Cafe · Winter Garden, FL       │
│                                 │
│  💰 Est. value: $500/mo        │
│  ⏱️ Lead for 12 days            │
│                                 │
│  [+task]  [+note]  [view]       │
└─────────────────────────────────┘
```

- **Estimated deal value:** If they have a package assigned, show the package price. If not, show "No estimate" or allow setting a deal value.
- **Time in stage:** "Lead for X days" — calculated from when their status was last changed to this stage, or from `createdAt` if never changed. Shows how long a deal has been sitting.
- **Stale warning:** If in Lead/Prospect stage for 14+ days with no activity, show the card with a yellow/amber left border and a small "⚠️ Going cold" label.

### For Active Clients:
```
┌─────────────────────────────────┐
│  RevitaLine Health         🟢   │
│  Michael Santiago               │
│  Health and Wellness            │
│                                 │
│  💰 $1,000/mo · Growth         │
│  📊 SEO: 71% · 5 issues        │
│  ⏱️ Active for 3 months        │
│                                 │
│  [+task]  [+note]  [view]       │
└─────────────────────────────────┘
```

- **Revenue:** Actual monthly revenue from their package/services
- **Package name:** Starter, Growth, Premium, Custom
- **SEO score:** Average across their websites (if crawled)
- **Health dot:** Green/yellow/red based on client health (same logic as the Clients page redesign)
- **Time active:** How long they've been an active client

### For Paused/Churned:
```
┌─────────────────────────────────┐
│  Example Company           🔴   │
│  John Doe                       │
│  Plumbing                       │
│                                 │
│  💰 Was: $500/mo · Starter     │
│  ⏱️ Churned 2 weeks ago        │
│  📝 Reason: Budget cuts        │
│                                 │
│  [+task]  [+note]  [view]       │
└─────────────────────────────────┘
```

- **Previous revenue:** Show what they were paying ("Was: $500/mo")
- **Time since churn/pause:** When they left
- **Churn reason:** If a note was added when they were moved to Churned, show it

---

## Column Headers with Revenue

Each column header should show the total monthly revenue in that stage:

```
● LEAD          1       ● PROSPECT      0       ● PROPOSAL       0
  $500/mo est.            $0/mo est.              $0/mo est.

● ACTIVE CLIENT 2       ● PAUSED        0       ● CHURNED        0
  $2,500/mo               $0/mo lost              $0/mo lost
```

- **Lead/Prospect/Proposal:** Show "estimated" revenue (sum of deal values or package prices)
- **Active Client:** Show actual recurring revenue
- **Paused/Churned:** Show "lost" revenue (what you're no longer collecting)

This turns the pipeline into a visual revenue forecast.

---

## Page Header Redesign

```
Pipeline
3 clients · $2,500/mo active revenue · $500/mo in pipeline
                                              [ + Add Client ]
```

- **Active revenue:** Sum of revenue from Active Client column
- **In pipeline:** Sum of estimated revenue from Lead + Prospect + Proposal columns
- Shows the potential if you close all deals

---

## Stale Deal Alerts

Add a visual system to flag deals going cold:

**Lead/Prospect column:**
- 0-7 days: normal card, no special styling
- 8-14 days: subtle yellow left border on the card
- 14+ days: amber left border + "⚠️ Going cold — X days" warning text + card sorts to top of column
- 30+ days: red left border + "🔴 Stale — X days" warning

**Proposal column:**
- Same thresholds but more aggressive (proposals should close faster):
  - 7+ days: yellow warning
  - 14+ days: red warning

This ensures no deal silently dies. The oldest/most urgent deals float to the top of each column.

---

## Time-in-Stage Tracking

To track how long a client has been in their current stage, you need one of:

**Option A (simple):** Use the `updatedAt` field on the Client record. When the status changes, `updatedAt` updates. Calculate days since then.

**Option B (better):** Add a `statusChangedAt` field to the Client model:

```prisma
model Client {
  // ... existing fields ...
  statusChangedAt  DateTime  @default(now())
}
```

When a client's status changes (drag-and-drop in pipeline or manual edit), update `statusChangedAt` to the current time. Run `npx prisma db push` after adding.

Then calculate time in stage:
```javascript
const daysInStage = Math.floor(
  (Date.now() - new Date(client.statusChangedAt).getTime()) / (1000 * 60 * 60 * 24)
);
```

---

## Drag and Drop Enhancement

When a card is dragged to a new column:
1. Update the client's `status` field
2. Update `statusChangedAt` to `new Date()`
3. If dragged to "Active Client": prompt to assign a package if none is set
4. If dragged to "Churned": prompt to add a churn reason note
5. Show a toast confirmation: "RevitaLine Health moved to Active Client"

---

## Pipeline Summary Bar (Optional)

Add a horizontal funnel/conversion bar at the top of the page showing the flow:

```
Lead (1) ──▶ Prospect (0) ──▶ Proposal (0) ──▶ Active (2)
  $500        $0                $0               $2,500
                                          Conversion: 67%
```

- Shows the flow from left to right
- Conversion rate: Active / (Lead + Prospect + Proposal + Active) as a percentage
- Keeps it simple — just a single-line visual, not a full chart

---

## API Endpoint

Enhance the pipeline data endpoint to include enriched client data:

### `GET /api/pipeline` (or enhance existing)

Each client should include:
```json
{
  "id": "abc",
  "businessName": "RevitaLine Health",
  "contactName": "Michael Santiago",
  "businessType": "Health and Wellness",
  "city": "Farmingdale",
  "state": "NY",
  "status": "Active",
  "statusChangedAt": "2026-01-15T00:00:00Z",
  "daysInStage": 79,
  "monthlyRevenue": 1000,
  "package": { "name": "Growth", "price": 1000 },
  "avgSeoScore": 71,
  "seoIssueCount": 5,
  "health": "green",
  "lastActivity": {
    "description": "SEO crawl completed",
    "date": "2026-04-02T17:00:00Z"
  },
  "isStale": false
}
```

Group clients by status for the pipeline columns. Include column totals:
```json
{
  "columns": {
    "Lead": { "clients": [...], "count": 1, "revenue": 500 },
    "Prospect": { "clients": [...], "count": 0, "revenue": 0 },
    "Proposal": { "clients": [...], "count": 0, "revenue": 0 },
    "Active": { "clients": [...], "count": 2, "revenue": 2500 },
    "Paused": { "clients": [...], "count": 0, "revenue": 0 },
    "Churned": { "clients": [...], "count": 0, "revenue": 0 }
  },
  "totalActiveRevenue": 2500,
  "totalPipelineRevenue": 500,
  "conversionRate": 67
}
```

---

## Design Notes

- Keep the dark navy/teal glassmorphism theme
- Column headers should have a subtle colored dot matching the stage (blue=lead, amber=prospect, purple=proposal, green=active, gray=paused, red=churned)
- Stale deal cards: yellow or red left border, warning text in matching color
- Revenue numbers should be the most prominent element on each card after the name
- Health dots (for active clients) are small 8px circles
- Time-in-stage text is muted/secondary color
- Drag-and-drop should have smooth animations
- Cards within stale columns should sort with most stale at top
- Responsive: on mobile, columns stack vertically or become a horizontal scroll

---

## After making changes:

1. Fix the NaN bug first — verify no NaN appears anywhere
2. Test revenue calculations in column headers and page header
3. Test time-in-stage display
4. Test stale deal warnings at different thresholds
5. Test drag-and-drop with status update + statusChangedAt update
6. Verify the pipeline conversion rate calculates correctly
7. Deploy: `vercel --prod` or `git push`
