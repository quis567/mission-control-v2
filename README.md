# Mission Control v2 — TruePath Studios

Business Operations Orchestration Platform with autonomous AI agents.

## Quick Start (Local Development)

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your credentials
3. Install dependencies: `npm install`
4. Generate Prisma client: `npx prisma generate`
5. Push database schema: `npx prisma db push`
6. Seed initial data: `node prisma/seed.mjs`
7. Seed user accounts: `node scripts/seed-users.mjs`
8. Start the app: `npm run dev`
9. Open http://localhost:3000

## Deployed Version

Access from any device at your Vercel URL.

## User Accounts

Contact admin to get login credentials. Users are created via the seed script:
```
node scripts/seed-users.mjs
```

## Agent Execution Modes

This app supports two AI execution modes:

- **API Mode:** Uses Anthropic API directly. Works from any device, any browser. Best for text generation tasks like writing pitches, generating meta tags, and content rewrites.
- **OpenClaw Mode:** Uses OpenClaw on the local machine. Required for tasks that need web search, file access, or multi-agent coordination. Only works when OpenClaw is running.

The app auto-selects the right mode, or you can override per task.

## Agent Roster

| Agent | Role |
|-------|------|
| Operations Manager | Planning & delegation |
| Builder | Execution & creation |
| Marketing Architect | Marketing & sales |
| Quality Reviewer | Review & validation |
| SOP Engineer | Process documentation |
| Systems Architect | Systems & organization |
| Onboarding Specialist | Client onboarding |

## Requirements

- Node.js 18+
- Supabase account (free tier)
- Anthropic API key (required for API mode)
- OpenClaw on localhost:18789 (optional — only needed for full agent task execution)

## Environment Variables

See `.env.example` for the full list. Key variables for Vercel deployment:
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `ANTHROPIC_API_KEY` — for API-mode agent tasks
- `NEXTAUTH_SECRET` — random secret for JWT signing
- `NEXTAUTH_URL` — your production domain

## Moving to Another Machine

1. Copy the project or clone from GitHub
2. Run `npm install`
3. Copy `.env.example` to `.env.local` and fill in credentials
4. Run `npx prisma generate`
5. Run `npm run dev`
