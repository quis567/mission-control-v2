# Redesign Websites Page — Claude Code Prompt

Read the project context file: `Mission_Control_v2_Project_Context.md`

## Problem

The Websites page currently shows all sites with confusing status labels like "development" and "live" that don't mean anything useful. There's no clear distinction between sites we built and fully control vs. sites hosted on external platforms like WordPress or Wix. The page needs to clearly communicate what level of control we have over each site.

## Site Types

There are three types of websites in our system. The type should be **auto-detected** based on the data in the Website record, NOT manually set:

### 1. TruePath Managed
- **Criteria:** Website has BOTH `githubRepoUrl` AND `netlifySiteId` linked
- **Meaning:** We built this site, it's in our GitHub, deployed via Netlify. We have full control.
- **Capabilities:** Full SEO audit, AI-generated fixes, "Apply Changes" pushes directly to live site
- **Badge:** "TruePath Managed" with a green shield icon
- **Color accent:** Green

### 2. Client Hosted (External)
- **Criteria:** Website has a `cmsPlatform` value set (WordPress, Wix, Squarespace, etc.) OR has neither GitHub nor Netlify linked but has a client associated
- **Meaning:** Client's site on a third-party platform. We can audit SEO but can't push changes directly.
- **Capabilities:** Full SEO audit, AI-generated recommendations, "Export Recommendations" (instead of "Apply Changes")
- **Badge:** "External — [Platform]" (e.g., "External — WordPress", "External — Wix") with a globe icon
- **Color accent:** Blue

### 3. Audit Only
- **Criteria:** Website has no client linked, or was added just for an SEO audit/prospect research
- **Meaning:** We're just auditing this site, no management relationship
- **Capabilities:** SEO audit only, generate pitch/proposal based on findings
- **Badge:** "Audit Only" with a magnifying glass icon
- **Color accent:** Gray

## Remove the "development" / "live" Status

- **Remove the `status` field from being displayed** (or repurpose it)
- The old "development" and "live" statuses are meaningless
- Replace with the auto-detected site type above
- A site is effectively "live" if it returns a 200 HTTP response — we don't need a manual label for this

## New Website Card Design

Each card should show:

```
┌──────────────────────────────────────────────────────────┐
│  🛡️ TruePath Managed                                     │
│                                                          │
│  https://www.truepathstudios.com/                        │
│  TruePath Studios                                        │
│                                                          │
│  Hosted: Netlify          CMS: Static HTML               │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ ✅ GitHub │  │ ✅ Netlify│  │ SEO: 71% │               │
│  │  Linked   │  │  Linked  │  │ 5 pages  │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
│  Last deploy: Apr 4, 2026                                │
│                                                          │
│  [ View SEO ]  [ Apply Changes ]  [ Open Site ↗ ]       │
└──────────────────────────────────────────────────────────┘
```

vs. an external site:

```
┌──────────────────────────────────────────────────────────┐
│  🌐 External — WordPress                                 │
│                                                          │
│  https://abcplumbing.com                                 │
│  ABC Plumbing                                            │
│                                                          │
│  Hosted: Unknown          CMS: WordPress                 │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ ⬜ GitHub │  │ ⬜ Netlify│  │ SEO: --  │               │
│  │ Not linked│  │Not linked│  │ No crawl │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
│  [ View SEO ]  [ Export Recs ]  [ Open Site ↗ ]          │
└──────────────────────────────────────────────────────────┘
```

### Card Elements:

**Top badge (site type):**
- Green pill: "🛡️ TruePath Managed" — GitHub + Netlify linked
- Blue pill: "🌐 External — [Platform]" — third-party hosted
- Gray pill: "🔍 Audit Only" — no client relationship

**Site info:**
- URL (clickable, opens in new tab)
- Client/business name
- Hosting provider + CMS platform

**Connection indicators (3 small status boxes):**
- **GitHub:** ✅ green "Linked" with repo name, or ⬜ gray "Not linked" with "Link GitHub" action
- **Netlify:** ✅ green "Linked" with site name + last deploy date, or ⬜ gray "Not linked" with "Link Netlify" action
- **SEO Score:** Colored circle with score (green 80+, yellow 50-79, red <50), or "No crawl" if never crawled

**Last deploy info:** Only show for TruePath Managed sites (from Netlify data)

**Action buttons (bottom of card):**
- **TruePath Managed:** "View SEO" | "Apply Changes" | "Open Site ↗"
- **External:** "View SEO" | "Export Recs" | "Open Site ↗"
- **Audit Only:** "View SEO" | "Create Proposal" | "Open Site ↗"

## Filter Dropdown

Replace the current "All statuses" dropdown with a filter by site type:

Options:
- All sites
- TruePath Managed (show count)
- External (show count)
- Audit Only (show count)

## Page Header Updates

```
Websites
6 total · 1 TruePath Managed · 4 External · 1 Audit Only
                                              [ + Add Website ]  [ Sync with Netlify ]
```

Show counts by type instead of just "1 linked to Netlify"

## Detection Logic

In the API or frontend, determine the site type like this:

```javascript
function getSiteType(website) {
  if (website.githubRepoUrl && website.netlifySiteId) {
    return 'truepath_managed';
  }
  if (website.clientId) {
    return 'external';
  }
  return 'audit_only';
}

function getSiteTypeLabel(website) {
  const type = getSiteType(website);
  if (type === 'truepath_managed') return 'TruePath Managed';
  if (type === 'external') {
    const platform = website.cmsPlatform || 'Unknown';
    return `External — ${platform}`;
  }
  return 'Audit Only';
}
```

## CMS Platform Detection

When a site is added or crawled, try to auto-detect the CMS platform from the HTML:
- **WordPress:** Look for `wp-content` in page source, `<meta name="generator" content="WordPress">`
- **Wix:** Look for `wix.com` references in source
- **Squarespace:** Look for `squarespace.com` references
- **Shopify:** Look for `cdn.shopify.com` references
- **Static HTML:** No CMS detected (this is what TruePath sites are)
- **Unknown:** Couldn't determine

Save this to the `cmsPlatform` field on the Website model. Run this detection during SEO crawls.

## "Export Recommendations" Feature (for External Sites)

Since we can't push changes to external sites via GitHub, the "Export Recs" button should:

1. Gather all SEO issues and AI-generated fixes for the site
2. Generate a professional PDF or document with:
   - Client name and website URL
   - Overall SEO score
   - List of issues found with severity
   - Recommended fixes (the AI-generated meta tags, keywords, etc.)
   - Step-by-step instructions for the client to implement changes on their platform (e.g., "In WordPress, go to Yoast SEO → Edit snippet → paste this title")
3. Option to email the report directly to the client

This replaces the "Apply Changes" button for sites we don't control.

## Database Updates (if needed)

The Website model may need a `cmsPlatform` field if it doesn't exist:

```prisma
model Website {
  // ... existing fields ...
  cmsPlatform  String?  // wordpress, wix, squarespace, shopify, static, unknown
}
```

Run `npx prisma db push` after any schema changes.

## Design Notes

- Keep the dark navy/teal glassmorphism theme
- TruePath Managed cards should have a subtle green left border or top accent
- External cards should have a subtle blue left border or top accent
- Audit Only cards should have a gray left border
- The connection indicator boxes (GitHub, Netlify, SEO) should be compact — think small status badges, not full-width sections
- Cards should be clickable — clicking anywhere on the card opens the website detail page
- Keep the "Link Netlify" and "Link GitHub" actions, but move them inside the card as small links on the status badges (click the gray "Not linked" GitHub badge to trigger linking)
- Responsive: 3 columns on desktop, 2 on tablet, 1 on mobile

## After making changes:

1. Test with existing website records
2. Verify auto-detection correctly identifies TruePath Managed vs External vs Audit Only
3. Verify CMS detection runs during crawl
4. Test "Export Recommendations" for external sites
5. Deploy: `vercel --prod` or `git push`
