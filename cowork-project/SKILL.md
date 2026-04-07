# TruePath Studios — Lead Generation Skill

## Goal

Find contractor and trade businesses in Central Florida, audit their websites, check for duplicates in the CRM, and push new leads directly into the TruePath Studios pipeline.

## How It Works

You have two MCP tools connected to the TruePath CRM:

- **check_duplicate** — Check if a business already exists before adding
- **create_lead** — Push a new lead into the CRM pipeline

## Two-Phase Search Process

### Phase 1: Find Businesses

For each business type + area combination, search the web to find real local businesses. Gather:
- Business name
- Business type / trade
- Phone number
- Email (if findable)
- Website URL (or note if none)
- Address
- City, State

### Phase 2: Website Audit

For each business found, visit or assess their website and score it using this rubric:

| Score | Meaning |
|-------|---------|
| 1-3 | No website, broken site, or extremely outdated (Flash, pre-2015 design) |
| 4-5 | Website exists but not mobile-friendly, very basic, missing contact info, slow |
| 6-7 | Functional and acceptable but outdated design, no SEO optimization, generic template |
| 8-10 | Modern, mobile-friendly, professional, fast, has forms/booking, good SEO |

Write a brief reason for the score (1-2 sentences).

**Best prospects = scores 1-5.** These businesses need our help the most.

## Workflow Steps

1. Read `lead-schedule-config.json` for target areas and business types
2. Pick the next area to search (rotate through the list — check `run-log.json` to see which area was last used)
3. For each business type, search for 8 real businesses in that area
4. For each business found:
   a. **ALWAYS call `check_duplicate` first** with the business name and phone/website
   b. If duplicate → skip it, increment duplicate counter
   c. If new → audit their website, score it, then call `create_lead`
5. After all leads are processed, append a summary to `run-log.json`
6. Report results: total found, added, duplicates skipped, top 5 prospects (lowest site score)

## Rules

- **NEVER** push a lead without calling `check_duplicate` first
- **NEVER** skip the website audit — site_score is required for every lead
- **ALWAYS** append to `run-log.json`, never overwrite it
- **NEVER** modify `lead-schedule-config.json` unless explicitly told to
- Sort final results by site_score ascending (worst websites = best prospects)
- If a business has no website at all, score it 1 and note "No website found"
- If you can't determine the score, use "N/A" and explain why

## Lead Data Format

When calling `create_lead`, provide:
- **name**: Full business name
- **type**: Trade type (Roofer, Plumber, etc.)
- **phone**: Phone number or omit
- **email**: Email or omit
- **website**: Full URL or omit
- **address**: Street address or omit
- **area**: "City, ST" format (e.g., "Winter Garden, FL")
- **site_score**: "1" through "10" or "N/A"
- **site_reason**: Brief explanation of the score
