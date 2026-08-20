# Plan: Stack Manifest + Mission Control Services/Skills Pages

## Overview

When a stack is generated, produce a `stack-manifest.json` file containing all chosen services and skills metadata. The mission-control app ingests this manifest (via a new HTTP endpoint + Convex tables) and renders two new pages:

1. **Services page** — live view of deployed services with actions (view logs, restart, change env vars)
2. **Skills page** — view and edit skill markdown files

## Architecture

```
Core generate() ──► stack-manifest.json (included in output files)
                         │
         ┌───────────────┼──────────────────┐
         ▼               ▼                  ▼
   CLI writes to     Web ZIP download    API relay POST
   disk as usual     includes it         /api/v1/stack/register
                                              │
                                              ▼
                                    Mission Control HTTP
                                    POST /stack/register
                                              │
                                              ▼
                                    Convex mutations
                                    (stacks, stackServices, stackSkills)
                                              │
                                              ▼
                                    React UI (2 new pages)
```

---

## Part 1: Core — Generate `stack-manifest.json`

### New file: `packages/core/src/generators/stack-manifest.ts`

```typescript
export function generateStackManifest(
  resolved: ResolverOutput,
  input: GenerationInput,
): Record<string, string>
```

Produces a single file `stack-manifest.json` with this shape:

```json
{
  "formatVersion": "1",
  "generatedAt": "2026-03-01T...",
  "projectName": "my-stack",
  "deployment": "vps",
  "deploymentType": "docker",
  "platform": "linux/amd64",
  "proxy": "caddy",
  "domain": "example.com",
  "services": [
    {
      "id": "postgresql",
      "name": "PostgreSQL",
      "category": "database",
      "icon": "🐘",
      "image": "postgres",
      "imageTag": "16-alpine",
      "ports": [{ "container": 5432, "host": 5432, "exposed": false }],
      "docsUrl": "https://...",
      "addedBy": "user" | "dependency",
      "dependencyOf": "n8n"  // if addedBy === "dependency"
    }
  ],
  "skills": [
    {
      "id": "browser-skill",
      "name": "Browser Automation",
      "path": "openclaw/skills/browser.md",
      "serviceIds": ["browserless"]
    }
  ],
  "metadata": {
    "serviceCount": 5,
    "skillCount": 2,
    "estimatedMemoryMB": 3072
  }
}
```

### Modify: `packages/core/src/generate.ts`

Add call to `generateStackManifest(resolved, input)` after env files, merge into `files`.

### Modify: `packages/core/src/index.ts`

Export `generateStackManifest`.

---

## Part 2: Convex Schema + Functions

### New table: `stacks` (in schema.ts)

```typescript
stacks: defineTable({
  projectName: v.string(),
  domain: v.optional(v.string()),
  deployment: v.optional(v.string()),
  deploymentType: v.optional(v.string()),
  platform: v.optional(v.string()),
  proxy: v.optional(v.string()),
  manifestVersion: v.string(),        // formatVersion from manifest
  registeredAt: v.number(),
  tenantId: v.optional(v.string()),
}).index("by_tenant", ["tenantId"])
```

### New table: `stackServices`

```typescript
stackServices: defineTable({
  stackId: v.id("stacks"),
  serviceId: v.string(),              // e.g. "postgresql"
  name: v.string(),
  category: v.string(),
  icon: v.string(),
  image: v.string(),
  imageTag: v.string(),
  ports: v.array(v.object({
    container: v.number(),
    host: v.optional(v.number()),
    exposed: v.boolean(),
  })),
  docsUrl: v.optional(v.string()),
  addedBy: v.string(),               // "user" | "dependency"
  dependencyOf: v.optional(v.string()),
  status: v.optional(v.string()),     // "running" | "stopped" | "error" | "unknown"
  tenantId: v.optional(v.string()),
}).index("by_tenant", ["tenantId"])
  .index("by_stack", ["stackId"])
```

### New table: `stackSkills`

```typescript
stackSkills: defineTable({
  stackId: v.id("stacks"),
  skillId: v.string(),
  name: v.string(),
  path: v.string(),                   // e.g. "openclaw/skills/browser.md"
  content: v.string(),                // actual markdown content
  serviceIds: v.array(v.string()),
  tenantId: v.optional(v.string()),
}).index("by_tenant", ["tenantId"])
  .index("by_stack", ["stackId"])
```

### New file: `convex/stacks.ts` — Mutations & Queries

**Mutations:**
- `registerStack(manifest)` — Parse manifest JSON, upsert stack + services + skills
- `updateServiceStatus(stackServiceId, status)` — Update running/stopped/error
- `updateSkillContent(stackSkillId, content)` — Edit skill markdown
- `updateServiceEnv(stackServiceId, envPatch)` — Store env var changes (activity logged)
- `deleteStack(stackId)` — Remove stack + cascade services/skills

**Queries:**
- `listStacks()` — All stacks for tenant
- `getStack(stackId)` — Single stack with services + skills
- `listStackServices(stackId)` — Services for a stack
- `listStackSkills(stackId)` — Skills for a stack
- `getStackSkill(skillId)` — Single skill with content

### Modify: `convex/http.ts`

Add new HTTP route: `POST /stack/register` — accepts the manifest JSON, calls `stacks.registerStack`.

---

## Part 3: Mission Control UI

### Navigation Changes

**Modify `Header.tsx`**: Add a "Stack" button (like ClawRecipes) that toggles a stack panel or navigates to stack view.

**Modify `App.tsx`**: Add state for `activeView: "missions" | "services" | "skills"` to switch between the kanban board and the new pages. Keep it as a SPA with view switching (no router needed — matches existing pattern).

### New component: `StackSelector.tsx`

- Dropdown/tabs to select which registered stack to view
- Shows project name, service count, registration date
- "Register Stack" button opens a modal to paste manifest JSON or upload the file

### New component: `ServicesPage.tsx`

Full-page view replacing the MissionQueue when `activeView === "services"`:

- Grid/list of services from `stackServices` for the selected stack
- Each **ServiceCard** shows:
  - Icon + Name + Category badge
  - Image:tag
  - Ports (host:container)
  - Status indicator (running/stopped/unknown)
  - "Added by" badge (user vs auto-dependency)
- **Actions per service** (buttons):
  - **View Logs** — Opens a tray/modal showing `docker compose logs <service>` output (sends command via webhook or displays placeholder with the command to run)
  - **Restart** — Sends restart command (placeholder action + toast)
  - **Env Vars** — Opens a modal to view/edit environment variables for this service
  - **Docs** — External link to service documentation

### New component: `SkillsPage.tsx`

Full-page view when `activeView === "skills"`:

- List of skills from `stackSkills` for the selected stack
- Each skill card shows: name, associated services, path
- Click to open an **editor modal/tray**:
  - Textarea with the skill markdown content
  - Live markdown preview (using existing `react-markdown` dependency)
  - Save button → calls `stacks.updateSkillContent` mutation
  - Revert button to undo unsaved changes

### New component: `ServiceDetailModal.tsx`

Modal for viewing service details + env var editing:
- Shows full service info (image, ports, docs link, dependencies)
- Env vars section: key/value table with edit capability
- "Copy docker compose logs <service>" button
- "Copy docker compose restart <service>" button

### New component: `RegisterStackModal.tsx`

Modal to register a new stack:
- Paste manifest JSON textarea
- OR file upload (accepts .json)
- Parse + validate → call `stacks.registerStack`
- Show success/error

---

## Part 4: API Relay (Optional Enhancement)

### New route in API: `POST /api/v1/stack/register`

Relay endpoint that forwards the manifest to mission-control's Convex HTTP endpoint. This mirrors the deploy relay pattern — the web UI can call this to register a stack without knowing the Convex URL directly.

---

## File Summary

### New files:
1. `packages/core/src/generators/stack-manifest.ts` — Manifest generator
2. `packages/mission-control/convex/stacks.ts` — Convex queries + mutations
3. `packages/mission-control/src/components/StackSelector.tsx`
4. `packages/mission-control/src/components/ServicesPage.tsx`
5. `packages/mission-control/src/components/SkillsPage.tsx`
6. `packages/mission-control/src/components/ServiceDetailModal.tsx`
7. `packages/mission-control/src/components/RegisterStackModal.tsx`

### Modified files:
1. `packages/core/src/generate.ts` — Add manifest generation call
2. `packages/core/src/index.ts` — Export `generateStackManifest`
3. `packages/mission-control/convex/schema.ts` — Add 3 new tables
4. `packages/mission-control/convex/http.ts` — Add stack register route
5. `packages/mission-control/src/App.tsx` — Add view switching + new pages
6. `packages/mission-control/src/components/Header.tsx` — Add Stack nav button

### Implementation order:
1. Core manifest generator + wire into generate()
2. Convex schema + mutations/queries
3. HTTP endpoint for stack registration
4. UI: StackSelector + RegisterStackModal
5. UI: ServicesPage + ServiceDetailModal
6. UI: SkillsPage with markdown editor
7. Header + App.tsx view switching
