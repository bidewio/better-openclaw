# @better-openclaw/mission-control

The centralized oversight system and orchestration dashboard for Better OpenClaw. Built entirely upon extremely modern standards: Vite, React, Convex (real-time backend), and Tailwind v4.
It enables humans to interact with, manage, and assign goals to autonomous agent deployments running within constructed agent clusters.

> **Note:** Mission Control is included automatically when using the OpenClaw framework but is **optional** for other frameworks (CoPaw, NanoClaw, NanoBot, ZeroClaw, MemU, Claude Code, Codex). Non-OpenClaw stacks skip Convex and Mission Control by default.

## Features

- 🎯 **Kanban Mission Queue:** Watch agent tasking progress organically via a dynamic Inbox → Assigned → In Progress → Review → Done state graph.
- 🤖 **Agent Oversight Sidebar:** Real-time visibility into agent health status (idle, active, blocked), hierarchical levels (LEAD, INT, SPC), and automated rapid task dispatch mapping.
- 📄 **Document Management & Viewing Trays:** Access Markdown records, images, code files, and operational artifacts asynchronously created by AI workers. Sandbox-type documents render an embedded VNC desktop viewer.
- 🖥️ **Desktop Sandbox Viewer:** Embedded noVNC/KasmVNC iframe viewer with fullscreen, refresh, terminate controls, and Chrome DevTools tab switching. Appears in the dedicated Sandboxes page, inline in task detail panels, and in document preview trays.
- 📡 **Live Telemetry Feed:** Real-time logging of activity broadcasts tracking agent state transitions and tool outputs.
- 🔗 **Deep OpenClaw Hooks Integration:** Natively receives webhook triggers from OpenClaw instances automatically instantiating human-review tracks for requested actions.
- 🔒 **Convex Auth Layer:** Built-in multi-tenant isolation and email/password secure gating.
- ✨ **Better-OpenClaw Aesthetic UI:** Responsive layout logic leveraging modern Glassmorphism, CSS dark themes by default, ErrorBoundaries for crash prevention, and smooth suspense loading indicators.

## Architecture

```
packages/mission-control/
├── convex/              # Auto-syncing real-time database schema
│   ├── schema.ts        # Declarative data models (agents, tasks, messages)
│   ├── openclaw.ts      # Webhook ingestion logic (POST tracking, sandbox events)
│   ├── sandboxes.ts     # Sandbox session CRUD (noVNC/KasmVNC sessions)
│   ├── queries.ts       # Database accessors and subscription polling
│   └── seed.ts          # Sample state bootstrapping
├── hooks/               # OpenClaw webhook listener definition
├── src/                 
│   ├── components/      # Glassmorphic React Components (Sidebars, Trays, Modal logic)
│   ├── index.css        # Custom variable mapping and utility classes (`.glass-panel`)
│   └── App.tsx          # Orchestrator embedding ErrorBoundaries and suspense tracks
├── Dockerfile           # OCI-compliant isolated build directives
└── setup.mjs            # Installation hook injection logic 
```

## Quick Start Configuration

Node 20+ and a free [Convex.dev](https://convex.dev/) account are the only true prerequisites.

### 1. Database Provisioning

Initiate Convex cloud syncing to build a `.env.local` backing context containing the `VITE_CONVEX_URL` route:

```bash
cd packages/mission-control
npx convex dev --once
```

### 2. Seeding Sample Traces (Optional)

Generate dummy agents and standard mission flows for debugging UI states:

```bash
npx convex run seed:run
```

### 3. Server Initialization

Start both the Hot-Reload Vite frontend mapping and the real-time Convex cloud synchronization socket:

```bash
pnpm dev
# (Accessible at http://127.0.0.1:3660)
```

### 4. Injecting OpenClaw Hooks (Crucial step)

Connect a pre-existing deployed OpenClaw cluster to push webhook telemetry back into this console application:

```bash
npm run setup -- --url https://<your-convex-project>.convex.site/openclaw/event
```
*(This places the event handler physically into `~/.openclaw/hooks/mission-control/` modifying the active cluster bindings)*

## Containerization

The SPA can be instantly containerized using standard execution directives:

```bash
docker build -t mission-control .
docker run -p 3660:3660 mission-control
```
*(NOTE: The compiled SPA strictly serves web fragments. The actual Convex backend socket execution stays resident in the cloud context unless specifically overridden with self-hosted Convex variants.)*
