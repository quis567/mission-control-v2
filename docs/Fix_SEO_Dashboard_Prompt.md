# Fix SEO Dashboard — Claude Code Prompt

Read the project context file: `Mission_Control_v2_Project_Context.md`

## Current Problem

The SEO Dashboard (visible when a client's website is selected) has these issues:

### 1. "Full Site Audit" button is grayed out / disabled — not clickable
- It should be the PRIMARY action on this page
- When clicked, it should crawl the client's live website URL, discover ALL pages (follow internal links), extract SEO data from every page, and populate the dashboard automatically
- It should NOT require pages to be added manually first

### 2. "Crawl Site" button runs but returns "0 pages analyzed, 0 issues found"
- The crawl is either not actually fetching the live URL, or the response parsing is broken
- This needs to be fixed so it actually visits the website, parses the HTML, and extracts real SEO data

### 3. Remove the "+ Add Page" button and the "Add Page" form entirely
- There's no reason to manually add pages — the whole point is that the crawler discovers them automatically
- Remove the "+ Add Page" button from the top action bar
- Remove the entire "Add Page" form section below the stats

## What "Full Site Audit" Should Do (combine Crawl Site + Full Site Audit into one flow)

When clicked:
1. Show a loading/progress state ("Crawling site..." with a spinner)
2. Fetch the client's website URL (e.g., `https://www.truepathstudios.com/`)
3. Parse the homepage HTML — extract all internal links
4. Follow each internal link and parse those pages too (limit to same domain, max ~50 pages)
5. For EACH page found, extract and save to the `SeoPage` database table:
   - `url` (the page path, e.g., `/about`, `/services`, `/contact`)
   - `title` (from `<title>` tag)
   - `metaDescription` (from `<meta name="description">`)
   - `h1` (first `<h1>` tag)
   - `headings` (all h1-h6 tags as JSON)
   - `wordCount` (visible text word count)
   - `imagesTotal` (total `<img>` tags)
   - `imagesWithAlt` (images that have non-empty `alt` attributes)
   - `internalLinks` (count of links to same domain)
   - `externalLinks` (count of links to other domains)
   - `score` (calculated SEO score 0-100 based on: has title, has meta description, has h1, title length 30-60 chars, meta description length 120-160 chars, images have alt tags, adequate word count)
6. Save crawl timestamp to `CrawlHistory` table
7. Update the dashboard stats: Pages count, Avg Score, Issues count, Optimized count
8. Display all discovered pages in a list/table below the stats, each showing the page URL, title, score, and key issues

## Updated Button Layout

The top action bar should have:
- **"Full Site Audit"** (primary action, teal/accent color) — runs the full crawl described above
- **"Competitor Analysis"** (secondary) — keep as-is
- Remove "+ Add Page" button entirely

## After Crawl — Page List

After a crawl completes, show a list of all discovered pages as cards or table rows:
- Page URL
- Title tag (show "Missing" in red if empty)
- Meta Description (show "Missing" in red if empty)  
- H1 (show "Missing" in red if empty)
- SEO Score (0-100 with color: green 80+, yellow 50-79, red below 50)
- Click a page to expand and see full details + AI tools (generate meta tags, suggest keywords, rewrite content)

## Re-crawl Behavior

- If pages already exist from a previous crawl, the "Full Site Audit" button should say "Re-crawl Site" instead
- Re-crawling should update existing page records (match by URL) and add any new pages found
- Show "Last crawled: [date]" near the button

## Technical Notes

- The crawl API endpoint is likely at `/api/seo/crawl` — check if it exists and fix it, or create it
- Use server-side fetching (Next.js API route) to avoid CORS issues when crawling external sites
- Use a library like `cheerio` for HTML parsing (should already be installed)
- The `SeoPage` model in Prisma already has most of these fields — check the schema
- The `Website` model has the `url` field that should be used as the crawl target
- Make sure the crawl works on Vercel (deployed) not just localhost — keep request timeouts in mind (Vercel has a 10-second limit on the free tier, so you may need to crawl pages individually or use edge functions)

## Important: Vercel Timeout Consideration

Since Vercel's free tier has a 10-second function timeout, the crawl strategy should be:
1. First request: fetch the homepage, discover all internal page URLs, save the list
2. Then crawl each page individually via separate API calls (the frontend can loop through the list)
3. Update the UI progressively as each page completes
4. This avoids the timeout issue while still crawling the full site

After making these changes, deploy to Vercel with `vercel --prod` or `git push`.
