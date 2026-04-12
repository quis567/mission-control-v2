# Add Website Screenshot Thumbnails to Dashboard

## Overview

Add screenshot thumbnails to the site cards on the Websites dashboard page. Each card should display a visual preview of the website at the top of the card.

## Before You Start

Scan the codebase and understand:
- How the Websites page works and how site cards render
- How sites are stored in the database (schema, models)
- How the existing Netlify integration works (sync, API calls, etc.)
- Where the `NETLIFY_ACCESS_TOKEN` is used — it's already in the `.env`

**Before writing any code, present a plan** — which files you'll modify, what the data flow looks like, and any questions you have about the project structure.

## Requirements

### 1. Netlify-Linked Sites (Primary Source)

For any site that has a Netlify connection:
- Use the Netlify API: `GET https://api.netlify.com/api/v1/sites/{site_id}`
- The response includes a `screenshot_url` field — use that
- Authenticate with `Authorization: Bearer $NETLIFY_ACCESS_TOKEN` (already available in `.env`)

### 2. External Sites — Fallback

For sites that are NOT linked to Netlify (marked as "External"):
- Use Thum.io to generate a screenshot
- URL format: `https://image.thum.io/get/{full_website_url}`
- No API key needed
- Example: `https://image.thum.io/get/https://boardroomcafeandcatering.com`

### 3. Database Storage

- Add a `screenshot_url` field (or whatever fits the existing schema) to the site model
- Store the resolved screenshot URL so we don't hit external APIs on every page load
- Include a `screenshot_updated_at` timestamp to track freshness

### 4. Screenshot Refresh

- Screenshots should refresh automatically when a Netlify sync/deploy happens
- Add a manual "Refresh Screenshot" option per site as a fallback
- For Thum.io URLs, consider appending a cache-busting param on refresh (e.g., `?t={timestamp}`)

### 5. Frontend — Card Updates

- Display the screenshot as a thumbnail at the top of each site card
- Should fit the existing dark theme UI
- Handle loading state (skeleton/placeholder while image loads)
- Handle error state (fallback icon or placeholder if screenshot fails to load)
- Keep the card layout clean — the screenshot should enhance, not clutter
- Use a reasonable aspect ratio (roughly 16:9 works well for website previews)

## Technical Notes

- Thum.io free tier has rate limits — storing URLs in the DB avoids this being an issue
- Netlify's `screenshot_url` may be null for brand new sites that haven't been screenshotted yet — handle gracefully
- Consider lazy loading the images since there could be multiple cards on screen

## Priority

1. Get it working with Netlify screenshots first (since that integration already exists)
2. Add Thum.io fallback for external sites
3. Polish the UI (loading states, error handling)
4. Add the refresh mechanism
