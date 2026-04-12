# Mission Control v2 — Project Context & Continuation Guide

**Use this document to continue work in a fresh chat window.**

---

## About TruePath Studios

TruePath Studios is a web design and SEO agency based in Winter Garden, FL. We build websites and provide digital marketing services for contractor and trade businesses (roofers, plumbers, electricians, HVAC, landscapers, etc.) in Central Florida.

**Owner:** Marc Santiago
**Email:** info@truepathstudios.com
**GitHub:** github.com/quis567
**Netlify:** ~6 client sites deployed via Netlify Drop (manual drag-and-drop)
**Live App URL:** https://mission-control-v2-lovat-three.vercel.app/
**Login:** admin@truepathstudios.com / TruePath2026!

---

## What Is Mission Control v2

A custom-built CRM and business operations platform for TruePath Studios. It combines:
- **AI agent orchestration** (task delegation to specialized AI agents)
- **Client management (CRM)**
- **Website management**
- **SEO dashboard with AI tools**
- **Lead prospecting**
- **Proposal generation**
- **Client reporting**
- **Revenue tracking**

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** PostgreSQL via Supabase + Prisma ORM
- **Auth:** NextAuth.js (email/password credentials)
- **AI:** Anthropic Claude API (direct for SEO tools + text generation)
- **Agent Runtime:** OpenClaw Gateway (localhost:18789 — runs on separate AI laptop)
- **Hosting:** Vercel (live deployment)
- **Design Theme:** Liquid glass / glassmorphism with dark navy/teal color scheme

---

## Project Location

```
C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2
```

**GitHub repo:** github.com/quis567/mission-control-v2 (private)

**Logo location:** `C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2\images`

---

## Architecture — Dual-Mode Agent System

The app supports two AI execution modes:

1. **Anthropic API (cloud)** — for text generation tasks (SEO meta tags, pitches, keyword suggestions, content rewrites, proposals, reports). Works from any device via Vercel.

2. **OpenClaw (local)** — for tasks needing tool access (web search, file creation, multi-agent delegation). Only works on the laptop running OpenClaw at localhost:18789.

The app auto-routes tasks to the right mode, with manual override available.

---

## Agent Roster (7 agents)

| Agent | Role |
|-------|------|
| Operations Manager | Receives goals, delegates to other agents, tracks progress |
| Builder | Executes research, builds content and deliverables |
| Marketing Architect | Creates offers, messaging, sales copy, pitches |
| Quality Reviewer | Reviews outputs for quality before delivery |
| SOP Engineer | Documents processes as repeatable SOPs |
| Systems Architect | Designs file structures and organizational systems |
| Onboarding Specialist | Creates client onboarding workflows |

---

## Database Models (Current)

- **Task** — with clientId, assignedAgentId, status, deliverables, sessionKey
- **Agent** — name, role, soulMd, model, status
- **WorkflowTemplate** — name, stages (JSON array)
- **Activity** — task activity log
- **User** — auth (email/password)
- **Session** — auth sessions
- **Client** — businessName, contactName, email, phone, businessType, city, state, status, monthlyRevenue, tags, packageId
- **ClientNote** — timestamped notes per client
- **Website** — url, status, hostingProvider, domainRegistrar, sslStatus, cmsPlatform, netlifySiteId, githubRepoUrl
- **SeoPage** — per-page SEO data (title, meta, headings, images, links, word count, keyword, score)
- **SeoChange** — SEO change history
- **Service** — serviceType, billingType, price, status per client
- **ClientLink** — portal links with credentials per client
- **Package** — predefined service packages (Starter $500, Growth $1000, Premium $2000)
- **Proposal** — AI-generated proposals per client
- **Report** — monthly client performance reports
- **ProspectorSearch** — lead search history
- **CrawlHistory** — SEO crawl tracking

---

## Current Navigation (Sidebar)

1. Dashboard
2. Tasks (Kanban board)
3. Pipeline (client stage board — Lead → Prospect → Proposal → Active → Paused → Churned)
4. Prospector (AI lead finder)
5. Clients (client list)
6. Websites (all websites grid)
7. SEO (SEO dashboards)
8. Proposals
9. Reports
10. Revenue (MRR, charts, top clients)
11. Agents (agent roster)

---

## Environment Variables (.env.local)

```
DATABASE_URL=postgresql://...supabase connection string
SUPABASE_URL=https://mxmqdarkrzxfibufinme.supabase.co
SUPABASE_ANON_KEY=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_TOKEN=...
OPENCLAW_WORKSPACE=C:\Users\atlas\.openclaw\workspace
NETLIFY_ACCESS_TOKEN=...
GITHUB_ACCESS_TOKEN=...
```

Same variables are also in Vercel dashboard (Settings → Environment Variables).

---

## What Has Been Built (Completed)

### Phase 1 — Core App
- Next.js project with Tailwind
- SQLite database (later migrated to Supabase PostgreSQL)
- Task CRUD with Kanban board (5 columns)
- Agent roster with 7 agents seeded
- OpenClaw integration for spawning sub-agent sessions
- Create Task modal with agent/workflow selection
- Dashboard with active tasks and agent status

### Phase 2 — Database, Auth, Deployment
- Migrated SQLite → Supabase PostgreSQL with Prisma ORM
- NextAuth.js with email/password login
- Liquid glass login page
- Auth middleware protecting all routes
- Dual-mode agent system (API + OpenClaw)
- OpenClaw health check endpoint
- Deployed to Vercel

### Phase 3 — CRM Expansion
- Client CRUD (list, detail, add, edit)
- Client detail page with tabs (Overview, Websites, Services, Notes, Links)
- Website manager with status cards
- Service tracker per client
- Client portal links with masked passwords
- SEO dashboard per website with scoring (0-100)
- AI SEO tools (generate meta tags, suggest keywords, rewrite content, full site audit)
- Revenue dashboard (MRR, charts, top clients)
- Navigation updated with all sections

### Phase 4 — Polish & Features (completed or in progress)
- Color scheme: purple → dark navy/teal
- TruePath Studios logo on login and sidebar
- Client Pipeline board (drag-and-drop kanban by client status)
- Package/Plan system (Starter, Growth, Premium, Custom)
- Task deliverable viewing (markdown viewer, copy, download)
- Workflow automation (auto-execute, auto-progress)
- SEO list page with quick access
- Competitor analysis endpoint
- Reusable components extracted
- App scan endpoint deleted

### Phase 5 — Revenue Features (in progress)
- Lead Prospector (AI-powered lead finder with web search)
- Proposal Generator (AI + branded PDF)
- Client Reporting (monthly performance reports)
- Netlify Integration (auto-sync site data)
- GitHub Integration (repo/commit tracking)
- SEO Auto-Crawler (visits live sites, extracts SEO data)

---

## What Still Needs Work / Known Issues

### Lead Prospector
- Was getting stuck on "generating sales pitches" — timeout issue
- Needs results to show in a table on the page as they stream in
- Needs "Download Spreadsheet" button exporting to .xlsx
- Needs "Add to Pipeline" per row and bulk add
- Columns needed: ID, Business Name, Trade/Service, Contact, Phone, Website, Address, Google Rating, Years in Business, Services Offered, Website Quality, Online Presence Notes, Business Summary, Sales Pitch, Lead Score

### Website Management — KEY OUTSTANDING ITEM
Currently, website data is entered manually by typing a URL into a field on the client profile. This needs to change:

**What we want:**
1. **Netlify Integration** — Connect to the TruePath Studios Netlify account (one account, ~6 sites). Auto-pull all site data: live URL, deploy status, last deploy date, SSL status, hosting info. Link each Netlify site to a client's website record. Auto-sync on page load.

2. **GitHub Integration** — Connect to GitHub account. Link repos to client websites. Show last commit date, commit messages, repo link. Future: enable Claude Code → GitHub → Netlify auto-deploy flow.

3. **SEO Auto-Crawler** — Instead of manually typing SEO data, click "Crawl Site" and the app visits the live website, follows internal links, extracts all SEO data (titles, meta descriptions, headings, images, links, word count) and populates the SEO dashboard automatically. Re-crawl on demand or auto-crawl when Netlify detects a new deploy.

**Current client site workflow:**
- Marc edits website files locally on his PC
- Drags the folder into Netlify to deploy (Netlify Drop)
- No GitHub repos for client sites yet (only mission-control-v2 is on GitHub)
- Future goal: Claude Code pushes code to GitHub, Netlify auto-deploys from GitHub

**Database fields already added to Website model:**
- `netlifySiteId` — for linking to Netlify site
- `githubRepoUrl` — for linking to GitHub repo

**API endpoints needed:**
- `GET /api/integrations/netlify/sites` — fetch all sites from Netlify
- `GET /api/integrations/netlify/sites/[siteId]` — site details + deploy history
- `GET /api/integrations/github/repos` — fetch all repos
- `GET /api/integrations/github/repos/[owner]/[repo]/commits` — recent commits
- `POST /api/seo/crawl` — crawl a website and extract SEO data

**UI needed:**
- "Link Netlify Site" button on website records
- "Link GitHub Repo" button on website records
- Netlify status indicators on website cards (green/yellow/red dots)
- GitHub last commit info on website cards
- "Crawl Site" button on SEO dashboard
- "Sync with Netlify" refresh button on websites page

### Other Outstanding Items
- Workflow automation may still need testing (auto-execute, auto-progress)
- Proposal Generator PDF output needs testing
- Client Reporting PDF output needs testing
- Task deliverable viewing needs verification
- The Anthropic API key was exposed in a screenshot and needs to be rotated at console.anthropic.com

---

## Prompts Already Created and Used

1. **Mission_Control_v2_Rebuild_Prompt.md** — original app build
2. **Mission_Control_v2_Database_Deploy_Auth.md** — SQLite → Supabase, auth, Vercel
3. **Mission_Control_v2_CRM_Expansion.md** — clients, websites, SEO, services, revenue
4. **Mission_Control_v2_Polish_and_Features.md** — color scheme, logo, pipeline board, packages, deliverables, workflow automation
5. **Mission_Control_v2_Revenue_Features.md** — prospector, proposals, reports, Netlify, GitHub, SEO crawler

All prompts are stored in the project folder.

---

## How to Deploy

```bash
# From Claude Code or terminal in the project folder:
vercel --prod

# Or push to GitHub and Vercel auto-deploys:
git add .
git commit -m "description of changes"
git push
```

---

## How to Continue

To pick up where we left off, share this document with Claude (claude.ai) or Claude Code and say:

**For Claude.ai:** "Here's my project context. I need help with [specific thing]."

**For Claude Code:** "Read [prompt-name].md and continue building. Start where we left off."

Key areas that need attention next:
1. Fix Lead Prospector (timeout + results table + spreadsheet export)
2. Wire up Netlify integration so websites auto-populate from real data
3. Wire up GitHub integration for repo tracking
4. Build SEO auto-crawler so SEO data comes from live sites
5. Test proposal and report PDF generation
6. Rotate the exposed Anthropic API key
