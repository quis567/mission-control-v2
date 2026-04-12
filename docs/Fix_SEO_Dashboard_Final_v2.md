# Fix & Redesign SEO Dashboard — Claude Code Prompt (FINAL v2)

Read the project context file: `Mission_Control_v2_Project_Context.md`

**IMPORTANT:** A previous prompt was already given to fix the SEO dashboard and the crawl is now working (5 pages found, scores showing). This prompt SUPERSEDES the previous design and adds major new functionality. Review what was built from the previous prompt and integrate/overwrite as needed.

---

## PART A: Redesign SEO Dashboard (Seobility-Inspired)

The current dashboard layout is too basic. Redesign it to look like a professional SEO audit tool, modeled after Seobility's SEO Checker. Keep the app's existing **dark navy/teal glassmorphism** theme.

### Remove These:
- Remove the **"+ Add Page"** button from the top action bar (if it still exists)
- Remove the **"Add Page" form** section (if it still exists)

### New Layout Structure:

#### A. Top Header Bar
```
SEO Dashboard
[website URL] · [client name]
Last crawled: [date/time]
                                    [Re-Crawl Site ↻]  [Competitor Analysis]
```
- "Re-Crawl Site" = primary action button (teal). Show "Full Site Audit" if never crawled.
- Keep "Competitor Analysis" as secondary button.

#### B. Page Selector Bar (NEW)

After a crawl, show a **horizontal row of clickable page pills/tabs**:
```
Pages: [ / ] [ /services/lead-generation ] [ /about ] [ /contact ] [ /gallery ]   (5 pages)
```
- Each page pill is clickable — selecting one loads that page's detailed SEO audit below
- Show a small colored dot on each pill: green (score 80+), yellow (50-79), red (<50)
- Default to homepage selected
- Show the page's score number inside or next to each pill

#### C. Overall Score for Selected Page

Large **circular percentage gauge** (SVG/CSS animated ring):
```
┌──────────────────────────────────────────┐
│      ╭───╮                               │
│     │ 82% │    Overall SEO Score          │
│      ╰───╯    truepathstudios.com/about  │
└──────────────────────────────────────────┘
```
- Animated count-up from 0 on load
- Color: green (80-100), yellow (50-79), red (0-49)
- Show the selected page URL below the score

#### D. TO-DO List (Priority Issues)

Table of issues found on the selected page, sorted by importance:
```
TO-DO LIST
┌───────────────────────────────────────────────────────────┐
│ Issue                                  │ Importance       │
│ Add a favicon to the HTML code         │ 🟡 Tip           │
│ Add Open Graph meta tags               │ 🟠 Important     │
│ Add external links                     │ 🟡 Nice to have  │
└───────────────────────────────────────────────────────────┘
```
- Only show items that FAILED or got warnings
- Include a **"Fix with AI"** button per row that triggers the relevant AI tool
- If no issues: show a success message "No issues found!"

#### E. Category Tabs + Detailed Checks (MAIN SECTION)

Horizontal **sticky tab bar**:
```
[ Meta Data 97% ] [ Page Quality 90% ] [ Page Structure 85% ] [ Link Structure 56% ] [ Server Config 100% ]
```

Each tab shows its percentage and contains expandable check cards. Here's the structure:

##### Each Check Card Layout:
```
┌─ [green/yellow/red left border] ─────────────────────────────────┐
│  Title                                    3/3   Very important ═ │
│                                                                   │
│  "TruePath Studios — Websites & SEO for Trades & Construction"   │
│                                                                   │
│  ✅ The length of the page title is perfect. (52 characters)      │
│  ✅ There are no duplicate words in the title.                    │
│  ✅ Title contains relevant keywords.                             │
└───────────────────────────────────────────────────────────────────┘
```

**Card elements:**
- **Left border color:** Green = all pass, Yellow = some warnings, Red = critical fails
- **Header:** Check name (bold) + pass/total score (e.g., "3/3") + importance badge
- **Importance badges:** "Very important" (teal), "Important" (blue), "Low importance" (gray), "Nice to have" (light gray)
- **Content preview:** Show the actual value found (the title text, meta description text, etc.)
- **Sub-checks:** ✅ green row = pass, ⚠️ yellow/amber tinted row = warning, ❌ red/pink tinted row = fail
- **Collapsible:** Click header to expand/collapse each card

##### Meta Data Tab Checks:
1. **Title** — Show title text, check: exists, length 30-60 chars, no duplicate words, pixel width estimate
2. **Meta Description** — Show description text, check: exists, length 120-160 chars
3. **Crawlability** — Page accessible, no errors
4. **Canonical Link** — Present or missing
5. **Language** — HTML lang attribute present, language detected
6. **Open Graph Tags** — og:title, og:description, og:image present or missing
7. **Twitter Card Tags** — twitter:title, twitter:description present or missing
8. **Domain** — Not subdomain, good length, no special chars
9. **Page URL** — No parameters, no session IDs, clean structure
10. **Charset Encoding** — UTF-8 set correctly
11. **Doctype** — HTML5 declared
12. **Favicon** — Linked in HTML or not (Warning if missing)

##### Page Quality Tab Checks:
1. **Content** — Word count (target 300+), stop word %, title keywords in content, title keywords in H1, paragraph count, sentence length, no placeholders
2. **Frames** — No framesets/iframes
3. **Mobile Optimization** — Viewport tag present, Apple touch icon
4. **Strong/Bold Tags** — Proper emphasis usage
5. **Image SEO** — All images have alt text (show X of Y)
6. **Social Media** — Social sharing elements present

##### Page Structure Tab Checks:
1. **Headings** — Show full H1-H6 hierarchy tree, check: exactly one H1, logical hierarchy (no skipping levels), no empty headings
2. **Heading Content** — Display actual text of each heading found

##### Link Structure Tab Checks:
1. **Internal Links** — Count, anchor text quality, duplicate anchor warnings
2. **External Links** — Count (warning if zero — Google likes outbound links)

##### Server Configuration Tab Checks:
1. **HTTP Redirects** — No unnecessary redirects, www/non-www configured
2. **HTTP Headers** — No X-Powered header, compression enabled
3. **Performance** — Response time < 400ms, HTML file size < 100KB

#### F. AI SEO Tools Section

Below the checks, show AI tool action cards:
```
AI SEO Tools
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🔧 Generate  │ │ 🔑 Suggest   │ │ ✍️ Rewrite    │ │ 📊 Keyword   │
│ Meta Tags    │ │ Keywords     │ │ Content      │ │ Analysis     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```
These use the existing Anthropic API integration. When "Generate Meta Tags" is used, the results appear with an **"Apply Changes"** button (see Part B below for how this works).

---

## PART B: GitHub-Powered "Apply Changes" Flow

### Overview

When a user clicks "Apply Changes" after generating AI meta tags (or any AI-generated SEO improvement), the app should **directly update the HTML file in the client's GitHub repo**, which triggers a Netlify auto-deploy so the live site updates automatically.

### Prerequisites (the app should check for these)

Before "Apply Changes" can work, the client's website record must have:
1. `githubRepoUrl` — a linked GitHub repo (e.g., `https://github.com/quis567/truepath-studios-site`)
2. The GitHub repo must contain the actual HTML files for the site
3. The `GITHUB_ACCESS_TOKEN` environment variable must be set (already in .env)

If these aren't set, clicking "Apply Changes" should show a helpful message:
> "To apply changes directly to the live site, link a GitHub repository to this website first. Go to Website Settings → Link GitHub Repo."

### Flow When "Apply Changes" is Clicked:

1. **Identify the file to edit:**
   - The `SeoPage` record has the page URL (e.g., `/about`, `/services/lead-generation`)
   - Map the URL to the HTML file path in the repo:
     - `/` → `index.html`
     - `/about` → `about.html` OR `about/index.html`
     - `/services/lead-generation` → `services/lead-generation.html` OR `services/lead-generation/index.html`
   - Use the GitHub Contents API to check which file exists: `GET /repos/{owner}/{repo}/contents/{path}`

2. **Fetch the current file content:**
   - `GET /repos/{owner}/{repo}/contents/{filepath}`
   - Response includes `content` (Base64-encoded), `sha` (needed for updates), and `encoding`
   - Decode the Base64 content to get the raw HTML

3. **Apply the changes:**
   - Parse the HTML string
   - Find and replace the relevant tags:
     - **Title:** Find `<title>...</title>` and replace inner text
     - **Meta Description:** Find `<meta name="description" content="...">` and replace the `content` attribute
     - **Meta Keywords:** Find or insert `<meta name="keywords" content="...">`
     - **OG Tags:** Find or insert `<meta property="og:title" content="...">` etc.
   - Use string replacement or a simple HTML parser — do NOT use a full DOM parser that might reformat the entire HTML file

4. **Commit the change to GitHub:**
   - `PUT /repos/{owner}/{repo}/contents/{filepath}`
   - Body:
     ```json
     {
       "message": "SEO: Update meta tags for /about — via Mission Control",
       "content": "<Base64-encoded updated HTML>",
       "sha": "<sha from step 2>"
     }
     ```
   - The commit message should be descriptive: include what changed and which page

5. **Netlify auto-deploys:**
   - If the Netlify site is connected to this GitHub repo, it auto-deploys on push
   - No additional action needed from the app

6. **Show success feedback:**
   - "✅ Changes applied! Meta tags updated in GitHub and deploying to live site."
   - Show a link to the GitHub commit
   - Show estimated deploy time (~30-60 seconds for Netlify)
   - Optionally: re-crawl the page after 60 seconds to verify the changes took effect

### API Endpoint:

`POST /api/seo/apply-changes`

**Input:**
```json
{
  "websiteId": "abc-123",
  "pageUrl": "/about",
  "changes": {
    "title": "About TruePath Studios | Web Design for Contractors",
    "metaDescription": "Learn about TruePath Studios...",
    "metaKeywords": "web design, contractors, SEO",
    "ogTitle": "About TruePath Studios",
    "ogDescription": "Learn about TruePath Studios..."
  }
}
```

**Logic:**
1. Look up the Website record to get `githubRepoUrl`
2. Parse the repo owner and name from the URL (e.g., `quis567` and `truepath-studios-site`)
3. Map `pageUrl` to file path, try both `{page}.html` and `{page}/index.html`
4. Fetch current file from GitHub API
5. Decode Base64, apply changes to HTML string
6. Re-encode to Base64, PUT back to GitHub with commit message
7. Update the `SeoPage` record in the database with the new values
8. Return success with commit URL

**Error Handling:**
- If no `githubRepoUrl` on the website: return error with helpful message
- If file not found in repo: try alternate path, then return error
- If GitHub API fails (auth, permissions): return clear error message
- If token doesn't have repo scope: suggest checking token permissions

### GitHub API Headers:

```javascript
const headers = {
  'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28'
};
```

### UI for "Apply Changes" Button:

- Show loading spinner while in progress: "Applying changes to live site..."
- On success: green toast with commit link and "Deploying to Netlify (~30s)"
- On error: red toast with specific issue
- If no GitHub repo linked: yellow info message explaining setup
- After success: update the SeoPage data in the UI to reflect new values
- Show "View on GitHub" link to the commit

### "Link GitHub Repo" on Website Settings:

On the client's website detail/edit page, add:
- **"Link GitHub Repo"** button or dropdown
- Fetches repos from `GET /api/integrations/github/repos` (calls GitHub API `GET https://api.github.com/user/repos?per_page=100`)
- Shows repos as selectable options
- When selected, saves repo URL to `Website.githubRepoUrl`
- Shows linked repo on website card with GitHub icon and link

---

## PART C: Update Prisma Schema (if needed)

Make sure the `SeoPage` model has all fields needed for the detailed checks. Add these if missing:

```prisma
model SeoPage {
  id              String   @id @default(uuid())
  websiteId       String
  url             String
  title           String?
  metaDescription String?
  metaKeywords    String?
  canonicalUrl    String?
  language        String?
  h1              String?
  headings        Json?
  wordCount       Int      @default(0)
  paragraphCount  Int      @default(0)
  imagesTotal     Int      @default(0)
  imagesWithAlt   Int      @default(0)
  internalLinks   Int      @default(0)
  externalLinks   Int      @default(0)
  hasViewport     Boolean  @default(false)
  hasFavicon      Boolean  @default(false)
  hasOgTags       Boolean  @default(false)
  hasTwitterTags  Boolean  @default(false)
  hasCharset      Boolean  @default(false)
  hasDoctype      Boolean  @default(false)
  isHttps         Boolean  @default(false)
  responseTime    Int?
  htmlSize        Int?
  statusCode      Int?
  crawlData       Json?
  score           Int      @default(0)
  metaScore       Int      @default(0)
  qualityScore    Int      @default(0)
  structureScore  Int      @default(0)
  linkScore       Int      @default(0)
  serverScore     Int      @default(0)
  issues          Json?
  lastCrawled     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  website         Website  @relation(fields: [websiteId], references: [id])

  @@index([websiteId])
}
```

Run `npx prisma db push` after any schema changes.

---

## PART D: SEO Score Calculation

Calculate a weighted score per page using these categories:

**Meta Data (25%):** Has title (+3), title length 30-60 chars (+3), has meta description (+3), description length 120-160 chars (+3), has canonical (+2), has lang attribute (+2), has viewport (+2), has favicon (+1), has OG tags (+2), has charset UTF-8 (+2), has HTML5 doctype (+2)

**Page Quality (30%):** Word count > 300 (+5), title keywords in content (+4), title keywords in H1 (+3), all images have alt (+5), 3+ paragraphs (+3), no placeholder content (+3), good sentence length (+3), uses bold/strong (+2), has social elements (+2)

**Page Structure (15%):** Exactly one H1 (+5), uses H2 subheadings (+4), logical heading hierarchy (+3), no iframes (+3)

**Link Structure (15%):** Has internal links (+4), has external links (+3), descriptive anchors (+4), no duplicate anchors (+2), reasonable link text length (+2)

**Server/Technical (15%):** Uses HTTPS (+4), response time < 400ms (+3), HTML < 100KB (+3), no redirects (+3), uses compression (+2)

Normalize each category to 0-100, then compute weighted overall score.

---

## PART E: API Endpoints Summary

### `POST /api/seo/discover`
- Input: `{ websiteId }` — discovers all internal page URLs from homepage
- Returns: `{ pages: ["/", "/about", ...], total: 5 }`

### `POST /api/seo/crawl-page`
- Input: `{ websiteId, pageUrl }` — crawls single page with all checks
- Saves to `SeoPage`, returns full results

### `GET /api/seo/results/[websiteId]`
- Returns all `SeoPage` records for a website

### `POST /api/seo/apply-changes`
- The GitHub-powered apply flow from Part B

### `GET /api/integrations/github/repos`
- Fetches repos from GitHub for "Link GitHub Repo" dropdown

---

## Design Notes

- Keep dark navy/teal glassmorphism theme
- Green checks: #10b981
- Yellow warnings: #f59e0b at 10% background opacity
- Red fails: #ef4444 at 10% background opacity
- Category tab bar should be sticky while scrolling
- Check cards have colored left border matching status
- Circular score gauge animates on load
- All responsive
- Use existing glassmorphic card components from the app

---

## After making changes:

1. Run `npx prisma db push` if schema changed
2. Test full crawl on truepathstudios.com
3. Verify check cards populate with real data across all categories
4. Test the "Link GitHub Repo" dropdown on a website record
5. Test "Apply Changes" flow end-to-end (needs a GitHub repo linked first)
6. Deploy: `vercel --prod` or `git push`
