# Mission Control – Client Portal Feature Roadmap
**TruePath Studios | truepathstudios.com**

---

## Overview

The goal is to make Mission Control feel less like a "website portal" and more like a **business command center** for clients. The more tools a client uses daily, the stickier the retainer becomes and the harder it is to churn.

You already have:
- ✅ SEO data dashboard (client login)

Below are the next features to build, organized by effort vs. impact.

---

## Tier 1 — Easy Wins (High Perceived Value, Low Build Effort)

### 1. Website Health Dashboard
Show clients a live snapshot of their site's technical health.

**What to display:**
- Uptime status (green/red indicator)
- PageSpeed / Core Web Vitals score (via Google PageSpeed Insights API — free)
- SSL certificate expiration date
- Last deployment date / build status (via Netlify API)
- Mobile vs. desktop score

**Why it works:** Clients see a "green checkup" screen every time they log in. It silently justifies your retainer without them asking what you do all month.

**APIs to use:**
- Google PageSpeed Insights API (free, no auth needed)
- Netlify API (get deploy status)
- SSL check: `https://api.ssllabs.com/api/v3/analyze`

---

### 2. Lead Tracking / Form Submission Log
Every contact form submission captured and displayed in the dashboard.

**What to display:**
- Table of submissions: date, name, email, phone, message
- Total leads this month vs. last month
- Simple chart (submissions over time)

**Why it works:** Small business owners obsess over leads. If your app is where they check their leads, they log in daily. Daily logins = they never forget you exist.

**How to build:**
- Route all client contact forms to a webhook endpoint in your app
- Store submissions in your database per client
- Display in a clean table with export to CSV option

---

### 3. Google Business Profile Snapshot
Pull their Google Business data and show it in the dashboard.

**What to display:**
- Star rating + total review count
- Recent reviews (last 3–5)
- "Reviews this month" count
- Direct link to respond to reviews

**Why it works:** Trades companies live and die by Google reviews. Seeing this in your app ties their reputation management back to you.

**API to use:**
- Google Business Profile API (requires OAuth — client connects their Google account once)

---

## Tier 2 — Medium Effort, Strong Differentiation

### 4. Monthly Report Card (Auto-Generated)
A clean, branded summary generated automatically each month.

**What to include:**
- Keyword ranking changes (up/down arrows)
- Organic traffic trend (via Google Search Console API)
- Page speed score trend
- Lead count for the month
- One-line AI summary: "Your site ranked for 3 new keywords this month..."
- Overall score / grade (A, B, C — gamified)

**Why it works:** Clients forward this to their business partner or spouse. It's shareable proof of value. This alone can justify a $150–$250/month retainer.

**APIs to use:**
- Google Search Console API
- Your own stored SEO + lead data
- Claude API for the auto-generated summary blurb

**Prompt idea for Claude API:**
```
Given this monthly data: [keywords], [traffic], [leads], [speed score],
write a 2-sentence plain-English summary a small business owner would understand.
Keep it positive and highlight wins. Flag one area to improve.
```

---

### 5. Competitor Comparison Widget
Show how the client stacks up against 2–3 local competitors.

**What to display:**
- Side-by-side: domain authority, page speed, estimated keywords, Google rating
- Simple color-coded table (green = winning, red = losing)
- "Last updated" timestamp

**Why it works:** Trades business owners are competitive by nature. Seeing "your competitor ranks for 40 more keywords" creates urgency for them to keep investing in SEO.

**APIs / tools:**
- Moz API or DataForSEO for domain authority + keyword estimates
- Google PageSpeed for speed comparison
- Let client input 2–3 competitor URLs on setup

---

### 6. Content Suggestions Tool (AI-Powered)
Use the Claude API to generate SEO content ideas specific to their niche and location.

**What to display:**
- List of 5–10 blog post ideas based on their industry + service area
- Keyword each post would target + estimated search volume
- "Generate a draft" button (Claude writes a full outline or draft)

**Why it works:** Most small businesses have no content strategy. You become their strategist, not just their developer. This is a major upsell into a content/blogging retainer.

**How to build:**
```
Prompt: "I run a [roofing company] in [Hauppauge, NY].
Suggest 8 blog post topics that would rank well in local search.
For each, include the target keyword and why a local customer would search it."
```

---

## Tier 3 — Bigger Build, Major Differentiator

### 7. Review Request Tool
Let clients send a review request text to any customer — directly from their dashboard.

**What the client does:**
1. Enters customer name + phone number
2. Clicks "Send Review Request"
3. Customer gets a text: "Hi [Name], thanks for choosing [Business]! Would you mind leaving us a Google review? [link]"

**Why it works:** Getting Google reviews is one of the #1 pain points for small businesses, especially trades. This has nothing to do with their website — which makes it incredibly sticky. They will not cancel a retainer that is actively getting them reviews.

**How to build:**
- Twilio API for SMS (very cheap — ~$0.0079/text)
- Store a Google review link per client (one-time setup)
- Log all sent requests + track if review was posted

---

### 8. Project / Job Intake Form Builder
For construction and trades clients — let them capture leads in a structured format.

**What it does:**
- Client gets a custom embeddable form for their site (roofing estimate, plumbing request, etc.)
- Form submissions flow into their Mission Control dashboard as structured "jobs"
- Each job has: contact info, job type, address, notes, status (new / contacted / quoted / won / lost)
- Client can update job status like a mini-CRM

**Why it works:** You are now part of their operations, not just their website. This is the kind of tool that makes a client say "I couldn't run my business without this." Churning becomes unthinkable.

---

## Suggested Build Order

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Website Health Dashboard | Low | High |
| 2 | Lead Tracking / Form Log | Low | Very High |
| 3 | Monthly Report Card | Medium | Very High |
| 4 | Google Business Snapshot | Medium | High |
| 5 | Content Suggestions (AI) | Low | High |
| 6 | Competitor Comparison | Medium | High |
| 7 | Review Request Tool | Medium | Very High |
| 8 | Job Intake / Mini-CRM | High | Very High |

---

## Monetization Angle

Each tier of features maps naturally to a service tier:

- **Basic** ($99–$149/mo) — Health dashboard + lead log + monthly report
- **Growth** ($199–$249/mo) — Above + SEO dashboard + content suggestions + GBP snapshot
- **Pro** ($299–$399/mo) — Above + review request tool + competitor comparison + job intake CRM

Clients who use more features churn less. The goal is to get them dependent on at least 3 tools.

---

## Notes for Claude Code

- All client data should be scoped by `client_id` — never let client A see client B's data
- Use environment variables for all API keys (Google, Twilio, Moz/DataForSEO, Anthropic)
- Google APIs (Search Console, PageSpeed, GBP) require OAuth 2.0 — build a "Connect Google" flow per client
- Twilio requires a verified sender number — set up one number per account or use Twilio Messaging Services
- The Claude API integration for content suggestions and report summaries should use `claude-sonnet-4-20250514`
