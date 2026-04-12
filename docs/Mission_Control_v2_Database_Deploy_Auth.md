# Mission Control v2 — Database, Deployment & Auth Upgrade

**Claude Code Expansion Prompt**
**Run this BEFORE the CRM expansion**

---

## Context

Mission Control v2 is currently running locally with SQLite. We need to upgrade it to a production-ready setup so multiple users can access it from any device via the web.

**Three changes in this prompt:**
1. Swap SQLite → Supabase (hosted PostgreSQL)
2. Deploy to Vercel (public URL)
3. Add authentication with NextAuth.js

**IMPORTANT:** Do not rebuild existing features. Migrate the current functionality to the new database and add auth on top. Everything that works now should still work after this upgrade.

**Design:** Keep the existing **liquid glass** theme. Auth pages (login, signup) should match the same glassmorphism aesthetic.

---

## Project Location

Same project:

```
C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2
```

---

## 1. Database Migration — SQLite to Supabase (PostgreSQL)

### Setup

1. Create a free Supabase project at https://supabase.com
2. Get the connection details:
   - `SUPABASE_URL` (project URL)
   - `SUPABASE_ANON_KEY` (public anon key)
   - `DATABASE_URL` (PostgreSQL connection string — found in Settings → Database → Connection string → URI)

3. Store these in a `.env.local` file in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

### Database Client

Replace the SQLite `lib/db.ts` with a PostgreSQL client. Use **Prisma** as the ORM for type safety and easy migrations:

```bash
npm install prisma @prisma/client
npx prisma init
```

### Prisma Schema

Create `prisma/schema.prisma` that mirrors the existing SQLite tables:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Existing tables — migrate from SQLite

model Task {
  id                  String    @id @default(uuid())
  title               String
  description         String?
  status              String?   // inbox, assigned, in_progress, review, done
  priority            String?   // low, normal, high
  assignedAgentId     String?   @map("assigned_agent_id")
  workflowTemplateId  String?   @map("workflow_template_id")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  dueDate             DateTime? @map("due_date")
  workspaceId         String?   @map("workspace_id")
  deliverables        String?   // JSON array of file paths/links
  sessionKey          String?   @map("session_key")

  activities          Activity[]

  @@map("tasks")
}

model Agent {
  id          String    @id @default(uuid())
  name        String
  role        String
  description String?
  soulMd      String?   @map("soul_md")
  model       String?
  status      String?   // standby, working
  workspaceId String?   @map("workspace_id")
  createdAt   DateTime  @default(now()) @map("created_at")

  activities  Activity[]

  @@map("agents")
}

model WorkflowTemplate {
  id          String  @id @default(uuid())
  name        String
  description String?
  stages      String? // JSON array
  workspaceId String? @map("workspace_id")

  @@map("workflow_templates")
}

model Activity {
  id           String   @id @default(uuid())
  taskId       String?  @map("task_id")
  agentId      String?  @map("agent_id")
  activityType String?  @map("activity_type")
  content      String?
  createdAt    DateTime @default(now()) @map("created_at")

  task         Task?    @relation(fields: [taskId], references: [id])
  agent        Agent?   @relation(fields: [agentId], references: [id])

  @@map("activities")
}

// Auth table — managed by NextAuth
model User {
  id            String    @id @default(uuid())
  name          String?
  email         String    @unique
  password      String    // hashed
  role          String    @default("user") // user, admin
  createdAt     DateTime  @default(now()) @map("created_at")

  sessions      Session[]

  @@map("users")
}

model Session {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  token        String   @unique
  expiresAt    DateTime @map("expires_at")

  user         User     @relation(fields: [userId], references: [id])

  @@map("sessions")
}
```

### Migration Steps

1. Generate the Prisma client: `npx prisma generate`
2. Push schema to Supabase: `npx prisma db push`
3. Seed the database with existing agent definitions and workflow templates
4. Update ALL existing API routes to use Prisma instead of SQLite queries

### Update lib/db.ts

Replace the SQLite connection with Prisma:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

### Verify Migration

After migrating, test every existing feature:
- Create a task
- View task board
- View agent roster
- Create/edit workflow templates
- Activity logging

Everything must work exactly as before.

---

## 2. Authentication — NextAuth.js

### Install

```bash
npm install next-auth bcryptjs
npm install -D @types/bcryptjs
```

### Setup

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        
        if (!user) return null;
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;
        
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      }
    })
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
```

### Environment Variables

Add to `.env.local`:

```env
NEXTAUTH_SECRET=generate-a-random-secret-here
NEXTAUTH_URL=http://localhost:3000
```

When deployed to Vercel, `NEXTAUTH_URL` should be your production domain.

### Login Page

Create `src/app/login/page.tsx`:

- **Liquid glass design** — centered glass-elevated card on the gradient background
- Email and password fields (transparent inputs with bottom borders, matching existing theme)
- "Sign In" button with accent glow
- TruePath Studios branding at top
- Error messages for invalid credentials

### Registration / User Setup

For v1, create a **seed script** that creates the initial users instead of a full registration page:

```typescript
// scripts/seed-users.ts
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/db';

async function seed() {
  const hash = await bcrypt.hash('your-password-here', 12);
  
  await prisma.user.createMany({
    data: [
      { name: 'Your Name', email: 'you@email.com', password: hash, role: 'admin' },
      { name: 'Wife Name', email: 'wife@email.com', password: hash, role: 'user' },
    ]
  });
  
  console.log('Users seeded');
}

seed();
```

Run with: `npx ts-node scripts/seed-users.ts`

Later, you can add a registration page or an "invite user" feature from the admin panel.

### Protect All Routes

Create a middleware `src/middleware.ts` that redirects unauthenticated users to /login:

```typescript
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/login' }
});

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)']
};
```

This protects every page except the login page and auth API routes.

### Session in UI

- Show the logged-in user's name in the sidebar or top nav
- Add a "Sign Out" button
- Show user avatar/initials

---

## 3. Deploy to Vercel

### Setup

1. Push the project to GitHub (should already be set up)
2. Go to https://vercel.com and sign in with GitHub
3. Import the repository
4. Add environment variables in Vercel's dashboard:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (set to your Vercel domain, e.g., `https://mission-control-v2.vercel.app`)
   - `ANTHROPIC_API_KEY` (required — enables API-mode agent tasks from any device)
   - `OPENCLAW_GATEWAY_URL` (optional — only works if Vercel can reach your local machine, which it typically can't)
   - `OPENCLAW_GATEWAY_TOKEN` (optional — same as above)

### Vercel Config

Create `vercel.json` if needed:

```json
{
  "framework": "nextjs"
}
```

### Custom Domain (optional)

If you want something like `control.truepathstudios.com`:
1. Add the domain in Vercel's dashboard
2. Update DNS records at your domain registrar
3. Update `NEXTAUTH_URL` to match

### Important Note About Agent Execution

See the **Dual-Mode Agent System** section below for how agent execution works across local and deployed environments.

---

## 4. Dual-Mode Agent System

The app needs to support **two ways** of running AI tasks, and intelligently route to the right one based on what the task needs.

### Mode 1: Anthropic API Direct (cloud — works everywhere)

For tasks that only need text generation — writing pitches, generating meta tags, summarizing content, suggesting keywords, rewriting copy, answering questions.

- Calls the Anthropic API directly (`https://api.anthropic.com/v1/messages`)
- Works from Vercel, any device, any browser
- Cheaper and faster
- No tool use, no file access, no computer interaction
- Uses `claude-sonnet-4-20250514` for quality or `claude-haiku-4-5-20251001` for speed

### Mode 2: OpenClaw (local — full agent capabilities)

For tasks that need tool access — researching businesses online, building spreadsheets, updating files, crawling websites, executing multi-step workflows with file system access.

- Calls OpenClaw Gateway API (`http://localhost:18789/api/sessions/spawn`)
- Only works when OpenClaw is running on the local machine
- Full sub-agent with tool use, web search, file read/write
- More expensive (full agent session)
- Supports agent-to-agent delegation (Ops Manager spawning Builder, etc.)

### How to Route Tasks

Create `lib/agent-router.ts`:

```typescript
type AgentMode = 'api' | 'openclaw';

interface TaskRouteConfig {
  mode: AgentMode;
  model: string;
  reason: string;
}

// Determine which mode to use based on task requirements
export function routeTask(task: {
  requiresTools?: boolean;
  requiresFileAccess?: boolean;
  requiresWebSearch?: boolean;
  requiresMultiAgent?: boolean;
  taskType?: string;
}): TaskRouteConfig {
  
  // Tasks that NEED OpenClaw (tool access required)
  const needsOpenClaw = 
    task.requiresTools || 
    task.requiresFileAccess || 
    task.requiresWebSearch || 
    task.requiresMultiAgent;

  if (needsOpenClaw) {
    return {
      mode: 'openclaw',
      model: 'anthropic/claude-sonnet-4-20250514',
      reason: 'Task requires tool access or multi-agent coordination'
    };
  }

  // Everything else goes through the API directly
  return {
    mode: 'api',
    model: 'claude-sonnet-4-20250514',
    reason: 'Text generation task — no tools needed'
  };
}
```

### Create Unified Agent Client

Create `lib/agent-client.ts` that handles both modes:

```typescript
import { routeTask } from './agent-router';

interface AgentRequest {
  task: string;
  agentSoulMd: string;
  requiresTools?: boolean;
  requiresFileAccess?: boolean;
  requiresWebSearch?: boolean;
  requiresMultiAgent?: boolean;
}

interface AgentResponse {
  mode: 'api' | 'openclaw';
  result: string;
  sessionId?: string;
  status: 'complete' | 'in_progress' | 'failed';
}

export async function executeAgent(request: AgentRequest): Promise<AgentResponse> {
  const route = routeTask(request);

  if (route.mode === 'api') {
    return executeViaAPI(request, route.model);
  } else {
    return executeViaOpenClaw(request, route.model);
  }
}

// Mode 1: Direct Anthropic API call
async function executeViaAPI(request: AgentRequest, model: string): Promise<AgentResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: request.agentSoulMd,
      messages: [{ role: 'user', content: request.task }]
    })
  });

  const data = await response.json();
  const result = data.content
    .map((item: any) => item.type === 'text' ? item.text : '')
    .filter(Boolean)
    .join('\n');

  return { mode: 'api', result, status: 'complete' };
}

// Mode 2: OpenClaw sub-agent session
async function executeViaOpenClaw(request: AgentRequest, model: string): Promise<AgentResponse> {
  const openclawUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
  
  const response = await fetch(`${openclawUrl}/api/sessions/spawn`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      runtime: 'subagent',
      mode: 'run',
      task: `${request.agentSoulMd}\n\n---\n\nTASK:\n${request.task}`,
      model,
      cwd: process.env.OPENCLAW_WORKSPACE || 'C:\\Users\\atlas\\.openclaw\\workspace',
      runTimeoutSeconds: 1800
    })
  });

  const data = await response.json();
  
  return {
    mode: 'openclaw',
    result: '',
    sessionId: data.sessionId || data.id,
    status: 'in_progress'
  };
}
```

### UI: Task Creation with Mode Selection

When creating a task, the Create Task Modal should include:

- **Auto mode (default):** App decides based on task type — show which mode was selected and why
- **Force API mode:** User can override to use Anthropic API directly (works from any device)
- **Force OpenClaw mode:** User can override to use OpenClaw (must be on local machine)

Show a small indicator on each task card:
- Cloud icon (☁️) = running via Anthropic API
- Computer icon (💻) = running via OpenClaw
- If OpenClaw is selected but unavailable, show a warning: "OpenClaw not detected. Switch to API mode or run from local machine."

### OpenClaw Availability Check

Create an API route `api/agents/openclaw-status/route.ts` that pings OpenClaw:

```typescript
export async function GET() {
  try {
    const openclawUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
    const response = await fetch(`${openclawUrl}/api/health`, {
      signal: AbortSignal.timeout(3000)
    });
    return Response.json({ available: response.ok });
  } catch {
    return Response.json({ available: false });
  }
}
```

Use this to:
- Show OpenClaw status in the Agent Panel (green dot = connected, red = offline)
- Auto-fallback to API mode if OpenClaw is unreachable
- Disable "Force OpenClaw" option in the UI when it's offline

### Task Type Presets

Pre-configure which task types default to which mode:

| Task Type | Default Mode | Why |
|-----------|-------------|-----|
| Generate sales pitch | API | Text generation only |
| Generate meta tags | API | Text generation only |
| Suggest keywords | API | Text generation only |
| Rewrite content for SEO | API | Text generation only |
| Quality review | API | Text analysis only |
| Write SOP | API | Text generation only |
| Research businesses | OpenClaw | Needs web search + file creation |
| Build lead spreadsheet | OpenClaw | Needs file system access |
| Full site SEO crawl | OpenClaw | Needs web access + multi-step |
| Multi-agent workflow | OpenClaw | Needs agent spawning |

These presets should be configurable — stored in the workflow_templates table or a new settings table.

---

## Updated .env.local Template

Create a `.env.example` file in the project root (safe to commit):

```env
# Supabase / PostgreSQL
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# NextAuth
NEXTAUTH_SECRET=generate-a-random-secret
NEXTAUTH_URL=http://localhost:3000

# Anthropic API (cloud mode — works everywhere)
ANTHROPIC_API_KEY=your-anthropic-api-key

# OpenClaw (local mode — full agent capabilities)
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_TOKEN=your-token
OPENCLAW_WORKSPACE=C:\Users\atlas\.openclaw\workspace
```

---

## Update README.md

Update the existing README to include:

```markdown
# Mission Control v2 — TruePath Studios

## Quick Start (Local Development)

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your credentials
3. Install dependencies: `npm install`
4. Generate Prisma client: `npx prisma generate`
5. Push database schema: `npx prisma db push`
6. Seed initial data: `npx ts-node scripts/seed.ts`
7. Start the app: `npm run dev`
8. Open http://localhost:3000

## Deployed Version

Access from any device: https://your-vercel-url.vercel.app

## User Accounts

Contact admin to get login credentials. Users are created via seed script or admin panel.

## Agent Execution Modes

This app supports two AI execution modes:

- **API Mode (☁️):** Uses Anthropic API directly. Works from any device. Best for text generation tasks like writing pitches, generating meta tags, and content rewrites.
- **OpenClaw Mode (💻):** Uses OpenClaw on the local machine. Required for tasks that need web search, file access, or multi-agent coordination. Only works when OpenClaw is running.

The app auto-selects the right mode, or you can override per task.

## Requirements

- Node.js 18+
- Supabase account (free tier)
- Anthropic API key (required for API mode)
- OpenClaw on localhost:18789 (optional — only needed for full agent task execution)
```

---

## Implementation Order

1. **Install Prisma** and configure for PostgreSQL
2. **Create Prisma schema** matching existing SQLite tables
3. **Set up Supabase** project and get credentials
4. **Push schema** to Supabase
5. **Update all API routes** to use Prisma instead of SQLite
6. **Seed database** with agents and workflow templates
7. **Test everything** — verify all existing features still work
8. **Install NextAuth** and set up credentials provider
9. **Create login page** (liquid glass design)
10. **Add middleware** to protect all routes
11. **Create user seed script** (admin + wife accounts)
12. **Add user info to sidebar** (name, sign out button)
13. **Build dual-mode agent system** — create agent-router.ts, agent-client.ts, and OpenClaw status check endpoint
14. **Update task execution** — replace existing OpenClaw-only execution with the unified agent client
15. **Update Create Task Modal** — add mode selector (Auto / API / OpenClaw) with status indicator
16. **Add OpenClaw status** to Agent Panel — show connected/offline indicator
17. **Push to GitHub** and deploy to Vercel
18. **Configure environment variables** in Vercel dashboard (DATABASE_URL, ANTHROPIC_API_KEY, NEXTAUTH_SECRET, etc.)
19. **Test deployed version** — login, task board, API-mode agent tasks all working from browser
20. **Test local version** — verify OpenClaw-mode tasks still work when running locally

---

**START HERE:** Install Prisma, create the schema, set up the Supabase connection, and migrate all existing API routes from SQLite to Prisma. Verify everything works before touching auth or the agent system.
