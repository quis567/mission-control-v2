# Mission Control v2 — Rebuild Prompt

**Claude Code Implementation Guide**
**TruePath Studios — Business Operations Orchestration Platform**

---

## Context

Rebuild Mission Control as a business operations orchestration platform for TruePath Studios, a web design and SEO agency serving contractor and trade businesses in Central Florida.

The current version was designed for software development teams (builder/tester/reviewer workflows for code). It needs to be redesigned for **business operations** with autonomous AI agents that actually execute tasks when assigned.

---

## Problem Statement

The current Mission Control has four critical gaps:

1. **Agents don't auto-execute:** Tasks get assigned but agents never start working. They're database entries, not live processes.
2. **Wrong workflows:** Software QA stages (Testing, Verification) don't apply to business tasks like research, marketing, and content creation.
3. **No agent coordination:** The Operations Manager can't spawn other agents to delegate work.
4. **No integration:** Agents can't access Google Sheets, Drive, or workspace files.

---

## What This App Must Do

A business operations control center where:

- I create high-level tasks or missions
- The Operations Manager receives them and breaks them into subtasks
- Specialized agents execute their assigned work autonomously
- Work flows through stages automatically
- Deliverables are tracked and stored
- I can monitor progress and review results in real time

---

## Agent Roster

Seven specialized agents, each with a defined role and constraints:

| # | Agent | Role | Constraints |
|---|-------|------|-------------|
| 1 | **Operations Manager** | Receives goals, breaks into tasks, delegates, tracks progress, synthesizes outputs | Does NOT execute work directly. Planning and delegation only. |
| 2 | **Builder** | Executes research, builds content, creates deliverables (websites, docs, assets) | Does NOT create strategy or redesign workflows. Executes instructions only. |
| 3 | **Marketing Architect** | Creates offers, messaging, sales copy, marketing assets, pitches | Does NOT create internal systems or document SOPs. |
| 4 | **Quality Reviewer** | Reviews outputs for quality, clarity, completeness before delivery | Does NOT create original work. Refines and validates only. |
| 5 | **SOP Engineer** | Converts workflows into step-by-step SOPs and repeatable processes | Does NOT create strategy or perform execution work. |
| 6 | **Systems Architect** | Designs file structures, organizational systems, naming conventions | Does NOT create SOPs or execute tasks. |
| 7 | **Onboarding Specialist** | Creates client onboarding workflows, intake forms, checklists | Does NOT create marketing content or execute project work. |

---

## Key Requirements

### 1. Task Assignment → Agent Execution (CRITICAL)

When a task is assigned to an agent, the app must:

1. Spawn that agent as an OpenClaw sub-agent session
2. Pass the task description, workspace context, and any files/links needed
3. Monitor the session until completion
4. Collect the results and update the task status

**Technical approach — OpenClaw sessions_spawn API:**

```javascript
const response = await fetch('http://localhost:18789/api/sessions/spawn', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    runtime: 'subagent',
    mode: 'run',
    task: taskDescription,
    model: 'anthropic/claude-haiku-4-5',  // or sonnet for complex tasks
    cwd: 'C:\\Users\\atlas\\.openclaw\\workspace',
    runTimeoutSeconds: 1800
  })
});
```

Poll or listen for completion, then extract results.

### 2. Agent Coordination

The Operations Manager must be able to spawn other agents as sub-tasks, pass context between them, collect outputs from multiple agents, and synthesize final deliverables.

**Example workflow — Lead Generation:**

1. I create task: "Generate 25 contractor leads for Winter Garden"
2. Operations Manager receives it and creates execution plan
3. Ops Manager spawns Builder: "Research 25 businesses and gather info"
4. Ops Manager spawns Marketing Architect: "Write custom pitches for these 25 businesses"
5. Ops Manager spawns Quality Reviewer: "Validate data and pitches"
6. Ops Manager collects all outputs, updates spreadsheet, marks task complete

### 3. Business Operation Workflows

Create workflow templates suited for agency work. Each workflow should allow custom stages and agent assignments:

- **Lead Generation:** Inbox → Planning → Research → Pitch Creation → Review → Added to CRM
- **Research & Content:** Inbox → Planning → Research → Review → Done
- **Client Onboarding:** Inbox → Planning → Design → Review → Delivered
- **SOP Creation:** Inbox → Planning → Document → Review → Published

### 4. Workspace Integration

Agents need access to:

- **Google Sheets:** Read/write data (leads, clients, tracking)
- **Google Drive:** Upload deliverables (SOPs, content, designs)
- **Local workspace:** Read/write files in `C:\Users\atlas\.openclaw\workspace\truepath\`
- **APIs:** Web search, external data sources

**Pre-configured OAuth credentials:**

```
C:\Users\atlas\.openclaw\workspace\google_oauth_desktop.json
C:\Users\atlas\.openclaw\workspace\google_oauth_token.json
```

### 5. User Interface

**Dashboard:**
- Active tasks (in progress) with real-time agent status
- Completed tasks (last 7 days)
- Agent status indicators (working / standby)

**Task Board:**
- Kanban-style columns for workflow stages
- Drag-and-drop to assign and move tasks
- Click task to see details, agent activity, and deliverables

**Create Task Modal:**
- Title, description, priority
- Agent assignment (or auto-assign to Operations Manager)
- File/link attachments
- Workflow template selection

**Agent Panel:**
- List of all agents with roles
- Current task assignments
- Session logs showing what each agent is working on

### 6. Task Lifecycle

1. **Create:** User creates task with description
2. **Assign:** Task assigned to Operations Manager (or specific agent)
3. **Auto-Execute:** App spawns OpenClaw sub-agent session with task context
4. **Monitor:** Track session progress, capture logs and outputs
5. **Collect:** Extract deliverables (files, data, links)
6. **Complete:** Mark task done, store results, notify user

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** SQLite (lightweight, file-based)
- **Agent Runtime:** OpenClaw Gateway API (localhost:18789)
- **Auth:** Simple token-based (single user for now)

---

## Design Theme — Liquid Glass

The entire UI should follow a **liquid glass / glassmorphism** aesthetic. This is the signature look of the app — don't fall back to generic flat UI.

### Core Visual Principles

- **Frosted glass panels:** All cards, modals, sidebars, and containers use semi-transparent backgrounds with backdrop blur. Nothing should feel solid or opaque.
- **Layered depth:** UI elements should feel like stacked glass panes floating over a subtle gradient background. Use varying levels of transparency and blur to create visual hierarchy.
- **Soft light borders:** Use 1px borders with `rgba(255, 255, 255, 0.15-0.25)` to simulate light catching the edge of glass.
- **Subtle inner glow:** Cards and panels should have a faint inner shadow or highlight along the top edge to simulate light refraction.
- **Smooth transitions:** All hover states, status changes, and panel opens should animate smoothly (200-300ms ease). Glass elements should feel fluid, not snappy.

### Tailwind Implementation

```css
/* Base glass panel — use on all cards, modals, containers */
.glass {
  @apply bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl shadow-lg;
}

/* Elevated glass — modals, dropdowns, floating elements */
.glass-elevated {
  @apply bg-white/15 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl;
}

/* Subtle glass — sidebar, nav, secondary panels */
.glass-subtle {
  @apply bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl;
}

/* Active/selected state */
.glass-active {
  @apply bg-white/20 backdrop-blur-xl border border-white/30 ring-1 ring-white/10;
}
```

### Background

- Use a **dark gradient mesh background** as the app canvas — deep navy, dark purple, or dark teal tones with subtle color shifts (not a flat color).
- Example: `background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);` or a more refined mesh gradient with 3-4 color stops.
- The background should feel like looking through tinted glass into deep space — rich but not distracting.

### Color System

- **Primary accent:** A cool blue or teal glow (`#38bdf8` or `#06b6d4`) for active states, buttons, and highlights
- **Success:** Soft green glow (`#4ade80`) for completed tasks and positive states
- **Warning:** Warm amber glow (`#fbbf24`) for pending/review states
- **Error:** Soft red glow (`#f87171`) for failures or blocked items
- **Text:** White (`#ffffff`) for primary, `rgba(255,255,255,0.6)` for secondary, `rgba(255,255,255,0.35)` for tertiary
- Accent colors should feel like they're **glowing through the glass**, not sitting on top of it. Use subtle box-shadows with the accent color: `box-shadow: 0 0 20px rgba(56, 189, 248, 0.15);`

### Component-Specific Guidelines

**Dashboard cards:** Glass panels with a faint colored top border indicating status (blue = active, green = done, amber = review). Numbers and stats should be large, light-weight font.

**Kanban board:** Each column is a glass-subtle container. Task cards are glass panels that glow slightly on hover. Drag state should increase the card's blur and add a shadow lift.

**Agent status indicators:** Small glowing dots — pulsing green for "working," static dim for "standby." The pulse should be a soft radial glow, not a harsh blink.

**Create Task Modal:** Glass-elevated panel centered on screen with a darkened backdrop. Form inputs should have transparent backgrounds with bottom borders, not boxed inputs.

**Activity logs / session output:** Monospace text on a glass-subtle panel. Scrollable. New entries should fade in, not pop in.

**Navigation / sidebar:** Glass-subtle with icon-based nav. Active page indicated by a glass-active highlight behind the icon. No solid background colors.

### Typography

- **Headings:** Inter or Geist Sans, light weight (300-400), generous letter-spacing
- **Body:** Inter or Geist Sans, regular weight (400)
- **Monospace (logs/code):** Geist Mono or JetBrains Mono
- Keep text crisp against the glass — if readability suffers, increase the panel's background opacity slightly rather than adding text shadows

### What to Avoid

- No flat solid-color backgrounds on any UI element
- No heavy drop shadows — keep shadows diffused and subtle
- No harsh borders — borders should be barely visible, just enough to define edges
- No pure black anywhere — darkest tone should be the gradient background
- No generic Bootstrap/Material UI patterns — this should feel premium and custom

---

## Database Schema

```sql
-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,                -- inbox, assigned, in_progress, review, done
  priority TEXT,              -- low, normal, high
  assigned_agent_id TEXT,
  workflow_template_id TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  due_date DATETIME,
  workspace_id TEXT,
  deliverables TEXT,          -- JSON array of file paths/links
  session_key TEXT            -- OpenClaw session ID
);

-- Agents
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  soul_md TEXT,               -- Agent instructions/personality
  model TEXT,                 -- anthropic/claude-haiku-4-5 or sonnet
  status TEXT,                -- standby, working
  workspace_id TEXT,
  created_at DATETIME
);

-- Workflow Templates
CREATE TABLE workflow_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stages TEXT,                -- JSON array: ["Inbox", "Planning", "Research", "Review", "Done"]
  workspace_id TEXT
);

-- Activity Log
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  agent_id TEXT,
  activity_type TEXT,         -- status_change, note, deliverable
  content TEXT,
  created_at DATETIME
);
```

---

## Agent Instructions Template

Each agent should have a `soul_md` that defines their role, responsibilities, constraints, output format, and available tools.

**Example — Operations Manager:**

```markdown
You are the Operations Manager for TruePath Studios.

Your role is to receive business goals and break them into actionable tasks for specialized agents.

Responsibilities:
- Analyze incoming tasks and create execution plans
- Delegate work to Builder, Marketing Architect, Quality Reviewer, SOP Engineer, etc.
- Track progress across all agents
- Synthesize outputs into final deliverables
- Report status to the human

You have access to:
- Google Sheets API (read/write)
- Google Drive API (upload files)
- Web search
- Workspace file system: C:\Users\atlas\.openclaw\workspace\truepath\

When you receive a task:
1. Read and understand the goal
2. Break it into 3-5 clear subtasks
3. Assign each subtask to the appropriate agent
4. Monitor their progress
5. Collect and synthesize outputs
6. Deliver final result

Always ensure no duplicate work and clear handoffs between agents.
```

---

## File Structure

```
Mission Control V2/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Dashboard
│   │   ├── tasks/
│   │   │   ├── page.tsx                # Task board (Kanban)
│   │   │   └── [id]/page.tsx           # Task detail view
│   │   ├── agents/
│   │   │   └── page.tsx                # Agent roster
│   │   └── api/
│   │       ├── tasks/
│   │       │   ├── route.ts            # CRUD
│   │       │   └── [id]/
│   │       │       ├── execute/route.ts  # Spawn agent
│   │       │       └── status/route.ts   # Check progress
│   │       ├── agents/route.ts
│   │       └── workflows/route.ts
│   ├── lib/
│   │   ├── db.ts                       # SQLite queries
│   │   ├── openclaw.ts                 # OpenClaw API client
│   │   ├── google.ts                   # Google Sheets/Drive APIs
│   │   └── agents.ts                   # Agent definitions + soul_md
│   └── components/
│       ├── TaskBoard.tsx
│       ├── TaskCard.tsx
│       ├── AgentCard.tsx
│       └── CreateTaskModal.tsx
├── database/
│   └── mission-control.db
└── package.json
```

---

## Implementation Order

> Focus on making a single task work end-to-end before building out all features.

1. **Setup:** Initialize Next.js 14 project with Tailwind and SQLite
2. **Database:** Create schema, seed initial agents and workflow templates
3. **OpenClaw Integration:** Build client to spawn and monitor sub-agent sessions (lib/openclaw.ts)
4. **Task CRUD:** API routes for creating, updating, and listing tasks
5. **Agent Execution:** /api/tasks/[id]/execute endpoint that spawns OpenClaw sub-agent
6. **UI:** Dashboard, task board (Kanban), task detail pages, create task modal
7. **Workflows:** Template system for different task types
8. **Google Integration:** Add Sheets/Drive helpers for agents to use
9. **Monitoring:** Real-time status updates and activity logs
10. **Testing:** End-to-end test with real tasks (lead generation, SOP creation, content writing)

---

## Key Flows to Implement

### Flow 1: Simple Task (no delegation)
User creates task → assign to Builder → Builder executes → mark done

### Flow 2: Complex Task (with delegation)
User creates task → assign to Ops Manager → Ops Manager spawns Builder + Marketing Architect → collect outputs → Ops Manager synthesizes → mark done

### Flow 3: Workflow with Review
User creates task → assign to Builder → Builder completes → auto-move to Quality Reviewer → Reviewer approves → mark done

---

## Success Criteria

The rebuilt Mission Control must:

1. Accept a task like "Generate 25 leads for Winter Garden plumbers" and automatically spawn the Operations Manager agent to work on it
2. Show real-time progress (agent is actively working, not just "assigned")
3. Collect deliverables (updated spreadsheets, files, reports)
4. Mark tasks complete when the agent finishes
5. Let me review results and agent activity logs
6. Support all three task flows: simple (no delegation), complex (with delegation), and workflow with review gate

---

## Project Location

**Build the entire project in this directory:**

```
C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2
```

All file paths, database location, and build output should be relative to this root. The final structure should look like:

```
C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2\
├── src/
├── database/
├── package.json
├── README.md
└── ...
```

---

## Implementation Notes

- No auth system yet — single user
- Use polling for status updates (WebSockets optional later)
- Store deliverables as file paths or JSON in the database
- Agents should log their progress to the activities table
- All agent spawns should use the workspace directory as cwd
- Use Haiku for routine tasks, Sonnet for complex planning

---

## Setup & Installation (Generate a README.md with these instructions)

Claude Code should generate a `README.md` in the project root with clear setup instructions:

```markdown
# Mission Control v2 — TruePath Studios

## Quick Start

1. Open terminal and navigate to the project folder:
   cd "C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2"

2. Install dependencies:
   npm install

3. Start the app:
   npm run dev

4. Open browser to:
   http://localhost:3000

## Requirements
- Node.js 18+
- OpenClaw running on localhost:18789 (required for agent execution)
- Google OAuth credentials in workspace (optional, for Sheets/Drive integration)

## Moving to Another Machine
1. Copy the entire "Mission Control V2" folder to the new machine
2. Run `npm install`
3. Run `npm run dev`
4. Ensure OpenClaw is also running on the new machine
```

---

**START HERE:** Build the project in `C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2`. Set up SQLite with the schema, create the OpenClaw client, build the task board UI, and implement one complete task execution flow (create → assign → spawn agent → monitor → complete). Get one task working end-to-end before expanding.
