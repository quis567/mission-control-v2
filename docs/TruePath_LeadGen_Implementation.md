# TruePath Lead Generation System — Implementation Guide

---

## Overview

This document contains three sets of instructions to build a fully automated lead generation system that finds contractor businesses, audits their websites, deduplicates results, and pushes leads directly into your CRM pipeline — at zero extra API cost using your Claude subscription.

**Stack:** Next.js CRM (Supabase) + Claude Chat (web search) + MCP Server + Cowork scheduler

---

## PART 1 — CLAUDE CODE INSTRUCTIONS

Paste the following directly into Claude Code:

---

> ### Build a complete automated lead generation system for TruePath Studios CRM
>
> The app uses Next.js, Supabase, and NextAuth for session auth. Here is everything to build:
>
> ---
>
> #### 1. API Key System
>
> The app currently uses NextAuth session-based auth only. Add an API key system so external tools can call the app without a browser session.
>
> - Create a new Supabase table `api_keys` with fields: `id`, `key` (uuid), `label`, `created_at`, `last_used_at`, `active` (boolean)
> - Generate one key on first run labeled `"lead-gen-system"`
> - Create a middleware helper `lib/apiKeyAuth.ts` that validates an `x-api-key` header on any route that uses it
> - Add an admin endpoint `GET /api/admin/api-keys` to view active keys (session protected)
>
> ---
>
> #### 2. Lead Intake Endpoint
>
> Create `POST /api/leads/intake` protected by the API key middleware.
>
> Accepts this payload:
> ```json
> {
>   "name": "string",
>   "type": "string",
>   "phone": "string or null",
>   "email": "string or null",
>   "website": "string or null",
>   "address": "string or null",
>   "area": "string",
>   "site_score": "string (1-10 or N/A)",
>   "site_reason": "string",
>   "source": "lead-gen-auto"
> }
> ```
>
> Before inserting, run a duplicate check against the existing leads/prospects table. Check for matching `name` AND (`phone` OR `website`). If a match exists, return `{ "status": "duplicate", "skipped": true }`. If new, insert and return `{ "status": "created", "id": "..." }`.
>
> ---
>
> #### 3. MCP Server
>
> Build a standalone MCP server at `/mcp-server/index.ts` that connects Claude Desktop directly to the CRM.
>
> It needs two tools:
>
> **Tool 1: `create_lead`**
> - Accepts: name, type, phone, email, website, address, area, site_score, site_reason
> - POSTs to `/api/leads/intake` using the API key in an env variable `CRM_API_KEY`
> - Returns success or duplicate status
>
> **Tool 2: `check_duplicate`**
> - Accepts: name, phone, website
> - Calls the CRM to check if lead already exists before even generating a pitch
> - Returns `{ exists: true/false }`
>
> Store config in `/mcp-server/.env`:
> ```
> CRM_BASE_URL=http://localhost:3000
> CRM_API_KEY=your-generated-key-here
> ```
>
> Provide the exact JSON snippet to add to Claude Desktop's config file to activate the MCP server.
>
> ---
>
> #### 4. Cowork SKILL.md
>
> Create `/cowork-project/SKILL.md` with the following:
> - The goal: find contractor leads, audit their websites, push new ones to CRM
> - The two-phase search prompt template (phase 1: find businesses, phase 2: deep search per business for phone/email/site quality)
> - Website scoring rubric (1-3: no website or broken, 4-5: poor/not mobile, 6-7: average, 8-10: modern/professional)
> - Duplicate check instruction: always call `check_duplicate` before `create_lead`
> - Summary log format to write after each run
>
> ---
>
> #### 5. Lead Schedule Config
>
> Create `/cowork-project/lead-schedule-config.json`:
> ```json
> {
>   "schedule": "weekly",
>   "runs_per_week": 2,
>   "leads_per_type_per_run": 8,
>   "target_areas": [
>     "Winter Garden, FL",
>     "Orlando, FL",
>     "Windermere, FL",
>     "Clermont, FL",
>     "Ocoee, FL"
>   ],
>   "business_types": [
>     "Roofer", "Plumber", "Electrician", "HVAC",
>     "Painter", "Landscaper", "Pool Service",
>     "Pest Control", "Pressure Washing", "General Contractor"
>   ],
>   "priority": "lowest_site_score_first",
>   "duplicate_prevention": true
> }
> ```
>
> ---
>
> #### 6. Run Log
>
> Create `/cowork-project/run-log.json` as an append-only log file. Each run appends:
> ```json
> {
>   "timestamp": "ISO date",
>   "area": "string",
>   "types_searched": ["..."],
>   "leads_found": 0,
>   "leads_added": 0,
>   "duplicates_skipped": 0,
>   "avg_site_score": "0.0"
> }
> ```
>
> ---
>
> #### 7. Claude Desktop Config Snippet
>
> After building the MCP server, output the exact block to add to `claude_desktop_config.json` so the MCP tools appear in Claude chat automatically.

---

## PART 2 — YOUR INSTRUCTIONS (WHAT YOU DO)

Follow these steps in order after Claude Code finishes building:

### Step 1 — Get your API key
After Claude Code runs, open your CRM app and navigate to the admin area. Find the generated API key labeled `lead-gen-system` and copy it.

### Step 2 — Add the API key to the MCP server
Open the file `/mcp-server/.env` and paste your API key as the value for `CRM_API_KEY`.

### Step 3 — Install and activate the MCP server
In your terminal, navigate to the `/mcp-server` folder and run:
```bash
npm install
npm run build
```
Then open your Claude Desktop config file and paste the snippet Claude Code provided. Restart Claude Desktop.

### Step 4 — Verify MCP is working
Open Claude chat (desktop app). In a new conversation, type:
> "Check if a lead named ABC Roofing with phone (407) 555-0000 already exists in my CRM."

If it responds with a real answer using your CRM data, the MCP connection is live.

### Step 5 — Set up the Cowork project
Open Cowork and create a new project. Point it at the `/cowork-project` folder that Claude Code created. This folder contains your SKILL.md and config file — Cowork reads these automatically every session.

### Step 6 — Do a manual test run
In Cowork, type:
> "Run the lead generation workflow for Winter Garden, FL using the config file. Find leads, audit websites, check for duplicates, and push new ones to my CRM. Log the results."

Watch it work. Check your CRM pipeline to confirm leads are appearing.

### Step 7 — Set the schedule
In Cowork, set a recurring task to run the lead generation prompt on your chosen schedule (e.g. every Monday and Thursday morning). Use the schedule defined in `lead-schedule-config.json`.

### Step 8 — Ongoing management
To change target areas or business types, just edit `lead-schedule-config.json` — no code changes needed. To view run history, open `run-log.json`.

---

## PART 3 — COWORK INSTRUCTIONS

Save this as a reference for how to instruct Cowork when running the workflow manually or setting up the recurring task.

### The Core Prompt (use this or a variation)

> Read the SKILL.md and lead-schedule-config.json in this project folder. Then run the full lead generation workflow:
>
> 1. Pick the next target area from the config (rotate through the list)
> 2. For each business type in the config, search for real local businesses using web search
> 3. For each business found, do a deep search to find: phone number, email address, website URL, and website quality score (1-10 using the rubric in SKILL.md)
> 4. For each lead, call check_duplicate before adding. Skip any that already exist.
> 5. For new leads only, call create_lead to push them into the CRM
> 6. Sort results by site_score ascending (worst websites first — these are the best sales prospects)
> 7. Append a summary entry to run-log.json with counts and averages
> 8. Report back: how many found, added, skipped as duplicates, and the top 5 prospects by lowest site score

### Website Scoring Rubric (for Cowork reference)

| Score | Meaning |
|-------|---------|
| 1–3 | No website, broken site, or Flash/pre-2015 design |
| 4–5 | Exists but not mobile-friendly, very basic, missing contact info |
| 6–7 | Functional but outdated design, nothing special |
| 8–10 | Modern, mobile-friendly, professional, has online booking |

**Best prospects = scores 1–5. Lead with these first.**

### Rotating Areas

Cowork should rotate through the target areas in `lead-schedule-config.json` so each run covers a different city. It tracks which area was last used in the run log.

### What Cowork Should Never Do

- Never push a lead without calling `check_duplicate` first
- Never skip the website audit step — site score is required for prioritization
- Never overwrite `run-log.json` — always append
- Never change `lead-schedule-config.json` unless explicitly told to

---

## System Summary

| Component | Location | Purpose |
|---|---|---|
| API key system | CRM app + Supabase | Authenticates external tools |
| Lead intake endpoint | `/api/leads/intake` | Accepts leads, deduplicates, inserts |
| MCP server | `/mcp-server/` | Bridge between Claude chat and CRM |
| Cowork project | `/cowork-project/` | Scheduler + SKILL.md + config |
| Run log | `/cowork-project/run-log.json` | Audit trail of every run |
| Schedule config | `/cowork-project/lead-schedule-config.json` | Edit areas/types without touching code |

---

*Built for TruePath Studios — Lead Generation Automation System*
