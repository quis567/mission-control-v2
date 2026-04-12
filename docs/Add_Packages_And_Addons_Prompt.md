# Add Pre-Built Packages & Monthly Add-ons — Claude Code Prompt

Read the project context file: `Mission_Control_v2_Project_Context.md`

## Goal

Make it easy to assign TruePath Studios' standard packages and monthly add-ons to clients. Currently, adding services requires manually typing everything. Instead, there should be pre-built options that can be selected with one click, alongside the ability to still add custom services.

---

## Pre-Built Offerings to Seed

### One-Time Packages (3):

**1. Starter — $500 (one-time)**
- Up to 5-page custom website
- Mobile-responsive design
- Contact form + call-to-action setup
- Basic on-page SEO
- Google Business Profile setup
- Local SEO campaign
- Monthly reporting

**2. Growth — $1,500 (one-time)** ← Most Popular
- Up to 10-page custom website
- Advanced conversion design
- Lead gen funnel + form optimization
- Full local SEO campaign
- Google Business Profile optimization
- Monthly reporting & strategy call
- Priority support

**3. Pro — $3,000 (one-time)**
- Unlimited pages + custom sections
- Premium conversion design system
- Multi-location SEO strategy
- Content strategy + blog setup
- Google Ads account setup
- Weekly reporting + strategy calls
- Dedicated account manager

### Monthly Add-ons (3):

**1. Website Care — $99/mo**
- Hosting, plugin updates, security monitoring, daily backups, and priority support to keep your site fast and safe

**2. SEO Growth — $199/mo**
- Ongoing keyword optimization, rank tracking, Google Business Profile management, and monthly reporting to climb higher

**3. Ads Management — $500/mo**
- Google Ads setup, bid management, ad copy, landing page alignment, and weekly performance reporting

---

## Database Updates

### Update or create a `ServiceTemplate` model for pre-built offerings:

```prisma
model ServiceTemplate {
  id            String   @id @default(uuid())
  name          String
  description   String?
  price         Float
  billingType   String   // "one-time" or "monthly"
  category      String   // "package" or "addon"
  features      Json     // Array of feature strings
  isPopular     Boolean  @default(false)
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

Alternatively, if there's already a `Package` model, update it to include the add-ons too. The key is having a single source of pre-built offerings.

### Seed the data:

```javascript
const templates = [
  // One-Time Packages
  {
    name: "Starter",
    description: "One-time website build — no recurring fees required",
    price: 500,
    billingType: "one-time",
    category: "package",
    isPopular: false,
    sortOrder: 1,
    features: [
      "Up to 5-page custom website",
      "Mobile-responsive design",
      "Contact form + call-to-action setup",
      "Basic on-page SEO",
      "Google Business Profile setup",
      "Local SEO campaign",
      "Monthly reporting"
    ]
  },
  {
    name: "Growth",
    description: "One-time build — pair with monthly plans for ongoing growth",
    price: 1500,
    billingType: "one-time",
    category: "package",
    isPopular: true,
    sortOrder: 2,
    features: [
      "Up to 10-page custom website",
      "Advanced conversion design",
      "Lead gen funnel + form optimization",
      "Full local SEO campaign",
      "Google Business Profile optimization",
      "Monthly reporting & strategy call",
      "Priority support"
    ]
  },
  {
    name: "Pro",
    description: "One-time build — pair with monthly plans for ongoing growth",
    price: 3000,
    billingType: "one-time",
    category: "package",
    isPopular: false,
    sortOrder: 3,
    features: [
      "Unlimited pages + custom sections",
      "Premium conversion design system",
      "Multi-location SEO strategy",
      "Content strategy + blog setup",
      "Google Ads account setup",
      "Weekly reporting + strategy calls",
      "Dedicated account manager"
    ]
  },
  // Monthly Add-ons
  {
    name: "Website Care",
    description: "Keep your site fast, safe, and up to date",
    price: 99,
    billingType: "monthly",
    category: "addon",
    isPopular: false,
    sortOrder: 4,
    features: [
      "Hosting",
      "Plugin updates",
      "Security monitoring",
      "Daily backups",
      "Priority support"
    ]
  },
  {
    name: "SEO Growth",
    description: "Climb higher in search results every month",
    price: 199,
    billingType: "monthly",
    category: "addon",
    isPopular: false,
    sortOrder: 5,
    features: [
      "Ongoing keyword optimization",
      "Rank tracking",
      "Google Business Profile management",
      "Monthly reporting"
    ]
  },
  {
    name: "Ads Management",
    description: "Managed Google Ads to drive targeted leads",
    price: 500,
    billingType: "monthly",
    category: "addon",
    isPopular: false,
    sortOrder: 6,
    features: [
      "Google Ads setup",
      "Bid management",
      "Ad copy creation",
      "Landing page alignment",
      "Weekly performance reporting"
    ]
  }
];
```

Run this as a seed script or create an API endpoint to seed them.

---

## UI: Add Services to a Client

When adding services to a client (on the client detail page, Services tab), redesign the flow:

### Current: Manual form where you type everything
### New: Three-section service selector

#### Section 1: One-Time Packages (pick one)

Show 3 cards side by side:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Starter       │ │    Growth        │ │      Pro         │
│     $500         │ │    $1,500        │ │    $3,000        │
│   one-time       │ │   one-time       │ │   one-time       │
│                  │ │  ⭐ Most Popular │ │                  │
│ • 5-page site    │ │ • 10-page site   │ │ • Unlimited pgs  │
│ • Mobile design  │ │ • Conversion     │ │ • Premium design │
│ • Basic SEO      │ │ • Lead gen       │ │ • Multi-location │
│ • GBP setup      │ │ • Full SEO       │ │ • Content + blog │
│                  │ │ • Strategy call  │ │ • Google Ads     │
│   [ Select ]     │ │   [ Select ]     │ │   [ Select ]     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

- Only one package can be selected at a time (radio behavior)
- Selected card gets a teal border/highlight
- Shows all features in a checklist
- Growth card has a "Most Popular" badge

#### Section 2: Monthly Add-ons (pick any combination)

Show 3 cards below:

```
Monthly Add-ons (optional — select any combination)

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Website Care    │ │   SEO Growth     │ │ Ads Management   │
│    $99/mo        │ │    $199/mo       │ │    $500/mo       │
│                  │ │                  │ │                  │
│ • Hosting        │ │ • Keyword opt.   │ │ • Google Ads     │
│ • Plugin updates │ │ • Rank tracking  │ │ • Bid management │
│ • Security       │ │ • GBP management │ │ • Ad copy        │
│ • Daily backups  │ │ • Reporting      │ │ • Landing pages  │
│                  │ │                  │ │                  │
│   [ Add ✓ ]      │ │   [ Add ✓ ]      │ │   [ Add ✓ ]      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

- Multiple add-ons can be selected (checkbox behavior)
- Selected cards get a teal border/highlight and checkmark
- Each can be toggled on/off independently

#### Section 3: Custom Service (optional)

Below the pre-built options, keep a collapsible "Add Custom Service" section:

```
▸ Add Custom Service

[expanded:]
  Service Name: [____________]
  Price:        [____________]
  Billing:      [One-time ▾] / [Monthly ▾]
  Description:  [____________]
  [ Add Custom Service ]
```

This is for anything that doesn't fit the standard offerings.

#### Summary Bar

At the bottom, show a live summary of what's being added:

```
┌──────────────────────────────────────────────────────────┐
│  Summary                                                  │
│                                                          │
│  📦 Growth Package              $1,500  (one-time)       │
│  🔧 Website Care                  $99  /mo               │
│  🔧 SEO Growth                   $199  /mo               │
│                                                          │
│  One-time total:  $1,500                                 │
│  Monthly total:   $298/mo                                │
│                                                          │
│              [ Cancel ]  [ Save Services ]                │
└──────────────────────────────────────────────────────────┘
```

When "Save Services" is clicked:
1. Create `Service` records for each selected item, linked to the client
2. If the client doesn't have a `Package` assigned yet, link the selected package
3. Update the client's `monthlyRevenue` field (sum of monthly add-ons)
4. Show a success toast

---

## Where This UI Appears

1. **Client detail page → Services tab** — primary location. Replace or enhance the current service management section.

2. **Pipeline drag-and-drop** — when dragging a client to "Active Client" stage, show a modal with this service selector if they don't have services yet. "Assign services to activate this client."

3. **Add Client flow** — optionally allow selecting a package during initial client creation.

---

## API Endpoints

### `GET /api/service-templates`
Returns all pre-built packages and add-ons, sorted by `sortOrder`.

### `POST /api/clients/[clientId]/services/assign`
Accepts a list of service template IDs to assign to the client:

```json
{
  "packageTemplateId": "growth-id",
  "addonTemplateIds": ["website-care-id", "seo-growth-id"],
  "customServices": [
    {
      "name": "Custom Logo Design",
      "price": 250,
      "billingType": "one-time"
    }
  ]
}
```

Creates the appropriate `Service` records and updates the client's package and revenue.

---

## Revenue Calculation

When services are assigned, recalculate the client's monthly revenue:

```javascript
const monthlyRevenue = services
  .filter(s => s.billingType === 'monthly' && s.status === 'active')
  .reduce((sum, s) => sum + s.price, 0);

await prisma.client.update({
  where: { id: clientId },
  data: { monthlyRevenue }
});
```

This fixes the NaN issue on the Pipeline page too — `monthlyRevenue` will always have a real number.

---

## Design Notes

- Use the existing dark navy/teal glassmorphism theme
- Package cards should be side by side (3 columns on desktop, stack on mobile)
- The "Most Popular" badge on Growth should be a teal/accent colored pill
- Selected cards: teal border glow + subtle teal background tint
- Unselected cards: default border, neutral
- The summary bar should be sticky at the bottom of the modal/section
- Add-on cards are slightly shorter/more compact than package cards
- Feature lists use small checkmark icons, not bullet points
- Price should be the most prominent element on each card
- The "/mo" suffix on monthly prices should be smaller and muted

---

## After making changes:

1. Seed the 6 service templates into the database
2. Test selecting a package + add-ons for a client
3. Verify revenue calculations update correctly
4. Verify the Pipeline page no longer shows NaN
5. Test the summary bar totals
6. Test custom service addition alongside pre-built selections
7. Deploy: `vercel --prod` or `git push`
