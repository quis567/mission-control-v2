# Mission Control v2 — Polish, Fixes & New Features

**Claude Code Improvement Prompt**
**Run this on the existing Mission Control v2 build**

---

## Context

Mission Control v2 is live and functional but needs polish, missing features, and UI improvements. This prompt covers color scheme changes, logo integration, new components, workflow automation, a client pipeline board, package/plan management, and task deliverable viewing.

**IMPORTANT:** Do not rebuild existing features. Improve and add to what's already there.

**Project Location:**
```
C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2
```

**Logo location:**
```
C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2\images
```

Use whatever logo file(s) are in that folder. Reference them in the app via the `/images/` public path (copy them to `public/images/` if not already there).

---

## 1. Color Scheme Overhaul — Remove Purple

The current purple gradient background is not on brand. Replace the entire color scheme with a **dark navy/charcoal base with teal accents**.

### New Background
Replace any purple gradients with:
```css
background: linear-gradient(135deg, #0a0f1a 0%, #111827 40%, #0d1520 70%, #0a1628 100%);
```
This is a deep dark navy — professional, clean, not purple.

### New Accent Colors
- **Primary accent:** Teal/cyan `#06b6d4` (for buttons, active states, highlights, links)
- **Primary accent hover:** `#0891b2`
- **Primary accent glow:** `rgba(6, 182, 212, 0.15)` for box-shadows
- **Secondary accent:** Warm white `#e2e8f0` for important text
- **Success:** `#10b981` (green — completed, active, live)
- **Warning:** `#f59e0b` (amber — pending, review, expiring)
- **Error/Danger:** `#ef4444` (red — failed, churned, expired)
- **Info:** `#3b82f6` (blue — informational badges)

### Glass Panel Updates
Update all glass panels to use the new scheme:
```css
/* Base glass — cards, containers */
background: rgba(15, 23, 42, 0.6);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.08);

/* Elevated glass — modals, dropdowns */
background: rgba(15, 23, 42, 0.8);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.12);

/* Subtle glass — sidebar, nav */
background: rgba(15, 23, 42, 0.4);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.06);
```

### Text Colors
- Primary text: `#f1f5f9`
- Secondary text: `rgba(241, 245, 249, 0.6)`
- Tertiary/muted: `rgba(241, 245, 249, 0.35)`
- Links and interactive: `#06b6d4`

### Apply everywhere
Update EVERY page, component, card, modal, sidebar, login page, badge, button, and chart to use this new color scheme. Search the entire codebase for any purple hex values (#7c3aed, #8b5cf6, #6d28d9, #a855f7, #9333ea, etc.) and gradient references, and replace them all.

---

## 2. Logo Integration

### Login Page
Replace the "MC" circle icon on the login page with the actual TruePath Studios logo from `public/images/`. Size it appropriately (roughly 60-80px height). Keep "Mission Control" and "TruePath Studios" text below it.

### Sidebar
Replace the "MC" text/icon at the top of the sidebar with the logo. Make it smaller (30-40px height) and keep it clean.

### Browser Tab
Set the logo as the favicon. If the logo is a PNG, also add it as the apple-touch-icon in the HTML head.

### Where NOT to add the logo
Don't put it on every page or in headers. Keep it to login and sidebar only — clean and professional.

---

## 3. Client Pipeline Board (NEW FEATURE)

Add a new **Pipeline** page at `/pipeline` — a kanban-style board for managing client progression through sales stages.

### Pipeline Columns
- **Lead** — just discovered, not contacted yet
- **Prospect** — contacted, in conversation
- **Proposal** — sent pricing/proposal
- **Active Client** — signed, paying customer
- **Paused** — temporarily inactive
- **Churned** — lost client

### Pipeline Cards
Each card shows:
- Business name (bold)
- Contact name
- Business type (e.g., "Roofer")
- Monthly revenue (if set)
- Current plan/package (if assigned — see section 4)
- Tags (small colored badges)
- Days in current stage (e.g., "12 days")

### Functionality
- **Drag and drop** clients between columns — updates client.status in the database
- **Click card** to open client detail page
- **Quick action buttons** on hover: "Add Note", "Create Task", "View Profile"
- **Count badges** on each column header showing total clients in that stage
- **Revenue subtotals** per column (sum of monthly_revenue for clients in that stage)

### Add to Navigation
Add "Pipeline" to the sidebar between "Clients" and "Websites" with a Kanban/columns icon.

### API
Create `POST /api/clients/[id]/move` that accepts `{ status: "prospect" }` and updates the client status. Return the updated client.

---

## 4. Package/Plan Selection on Clients

### Service Packages (predefined)
Create a concept of "Packages" that group services together. Store these as presets that can be assigned to clients:

**Starter Package** — $500/mo
- Website Design (one-time included)
- Monthly Maintenance
- Basic SEO (5 pages)

**Growth Package** — $1,000/mo
- Website Design (one-time included)
- Monthly SEO (full site)
- Monthly Maintenance
- Google Business Profile Management

**Premium Package** — $2,000/mo
- Website Design (one-time included)
- Monthly SEO (full site)
- Monthly Maintenance
- Google Business Profile Management
- Content Creation (4 blog posts/mo)
- Social Media Management

**Custom** — Variable pricing
- Mix and match individual services

### Database Addition
Add a new model:

```prisma
model Package {
  id          String  @id @default(uuid())
  name        String
  description String?
  price       Float
  services    String  // JSON array of service types included
  isCustom    Boolean @default(false)
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@map("packages")
}
```

Add `packageId` to the Client model:
```prisma
// Add to existing Client model:
  packageId   String?  @map("package_id")
  package     Package? @relation(fields: [packageId], references: [id])
```

### UI — Package Selection
- On the **Client Detail page (Overview tab)**, add a "Package" section showing the current package with a dropdown to change it
- On the **Pipeline board**, show the package name on each client card
- On the **Client List page**, add a "Package" column
- When a package is assigned, auto-create the corresponding Service records for that client (if they don't already exist)

### Package Management Page
Create `/packages` page (accessible from Settings or a gear icon) where you can:
- View all packages
- Edit package details (name, price, included services)
- Create new packages
- See how many clients are on each package

---

## 5. Task Deliverable Viewing (FIX)

When an agent completes a task via the Anthropic API, the result text is returned but currently there's nowhere to view it.

### Fix the Task Detail Page (`/tasks/[id]`)
- Add a **"Deliverable" section** below the activity log
- When a task is completed via API mode, store the agent's full response in the `deliverables` field of the task
- Display the deliverable as a formatted text block (support markdown rendering)
- Add a **"Copy" button** to copy the deliverable text
- Add a **"Download" button** to save it as a .txt or .md file
- If the deliverable is empty, show "No deliverable attached"

### Fix the Execute Flow
In the task execution API (`/api/tasks/[id]/execute`):
- After the Anthropic API returns a result, save the full response text to `task.deliverables`
- Also create an Activity record with type "deliverable" and the response as content
- Update task status to "done"

### Show Deliverables on Task Cards
On the TaskBoard, completed task cards should show a small document icon indicating a deliverable is available. Clicking it opens the task detail page.

---

## 6. Workflow Automation (Step 7 — Previously Skipped)

Tasks need to auto-progress through workflow stages instead of sitting in the inbox.

### Auto-Execution on Assignment
When a task is created and assigned to an agent:
1. If mode is "api" → immediately execute via Anthropic API
2. If mode is "openclaw" → check if OpenClaw is available, then execute
3. If mode is "auto" → route based on task requirements, then execute

### Auto-Progression After Completion
When an agent completes a task:
1. Check the task's workflow template
2. If the next stage is "Review" → move task to review status and assign to Quality Reviewer
3. If there's no next stage → mark as done
4. Log the transition as an Activity

### Simple Task Flow
Create → Assign to agent → Auto-execute → Agent completes → Mark done

### Review Task Flow  
Create → Assign to Builder → Auto-execute → Builder completes → Auto-move to Quality Reviewer → Reviewer approves → Mark done

### Update the Task Board
The Kanban columns should reflect the workflow stages. When a task moves between stages, the card should animate to the new column.

---

## 7. Break Pages Into Components

Currently only 6 components exist. Extract reusable components from page files:

### New Components to Create
- **ClientCard.tsx** — Used in pipeline board and client list
- **ClientTable.tsx** — Sortable/filterable table for client list view
- **WebsiteCard.tsx** — Card with status dot, domain info, hosting details
- **SEOScoreBadge.tsx** — Color-coded circle badge (green/amber/red based on score)
- **SEOPageRow.tsx** — Single row in the SEO audit table with inline editing
- **ServiceCard.tsx** — Service details with status badge and billing info
- **LinkCard.tsx** — Portal link with masked password and reveal toggle
- **RevenueChart.tsx** — Recharts bar/line chart component for revenue data
- **PackageCard.tsx** — Package details with included services list
- **PipelineColumn.tsx** — Single kanban column for the pipeline board
- **DeliverableViewer.tsx** — Markdown-rendered deliverable with copy/download buttons
- **NoteTimeline.tsx** — Chronological list of timestamped notes

### Why This Matters
Breaking into components makes the UI consistent, easier to update, and prevents duplicate code across pages.

---

## 8. SEO Quick Access in Navigation

Add "SEO" to the sidebar navigation. When clicked, show a page listing all websites with their average SEO scores, total pages audited, and number of issues. Click a website to go to its full SEO dashboard.

Create `/seo` page (list view) that shows:
- Website URL
- Client name
- Average SEO score (color-coded badge)
- Pages audited count
- Issues count (critical/important/minor)
- Last audited date
- "Run Audit" button

---

## 9. Competitor Analysis Endpoint

Add the missing competitor analysis feature from the original spec:

Create `POST /api/seo/competitor-analysis`:
- Accepts `{ clientWebsiteId, competitorUrl }`
- Uses Anthropic API with web search tool to analyze the competitor's site
- Returns comparison of SEO strategies
- Suggests gaps and opportunities

Add a "Competitor Analysis" button on the SEO dashboard page that opens a modal to enter a competitor URL and view results.

---

## 10. Delete the App Scan Endpoint

Remove `src/app/api/app-scan/route.ts` — it was temporary for review purposes.

Also revert the auth middleware/proxy to block all API routes again (remove the app-scan exception).

---

## Implementation Order

1. **Color scheme** — Replace all purple with navy/teal. Update every file.
2. **Logo** — Copy to public/images, add to login page and sidebar, set as favicon
3. **Delete app-scan** endpoint and revert auth exclusion
4. **Break into components** — Extract reusable components from page files
5. **Client Pipeline board** — New /pipeline page with drag-and-drop kanban
6. **Package/Plan system** — Database model, seed packages, client assignment UI
7. **Task deliverables** — Fix execute flow to save results, add deliverable viewer
8. **Workflow automation** — Auto-execute on assignment, auto-progress through stages
9. **SEO list page** — New /seo page with quick access to all website SEO dashboards
10. **Competitor analysis** — New API endpoint and UI
11. **Push to GitHub and deploy** via `vercel --prod`

---

**START HERE:** Begin with the color scheme overhaul since it touches every file. Then add the logo. Then work through the remaining items in order. Deploy after each major feature so we can verify.
