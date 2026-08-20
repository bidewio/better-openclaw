# CLAUDE.md

Guidance for Claude Code and other coding agents working in this repository.

## What this is

**better-openclaw** (BOC) generates production-ready self-hosted AI agent stacks.
Given a set of services and an agent framework, it emits a wired `docker-compose.yml`,
a `.env` with generated secrets, reverse proxy config, monitoring dashboards, and
agent skill files.

It ships as five surfaces over one core library:

| Package | Purpose |
|---|---|
| `packages/core` | Schemas, service registry, resolver, composer, validators, generators. Everything else is a thin shell over this. |
| `packages/cli` | `create-better-openclaw` — interactive wizard (Clack) + non-interactive flags (Commander) |
| `packages/api` | REST API on :3456 (Hono + Zod OpenAPI), Swagger at `/api/v1/docs` |
| `packages/web` | Visual stack builder (Next.js 16, React 19, Tailwind 4) on :3654 |
| `packages/mcp` | MCP server for agent integrations |
| `packages/mission-control` | Vite + Convex operations dashboard on :3660 |
| `packages/db` | Shared Drizzle schema + client (used by API/auth) |
| `packages/guard-sdk`, `packages/promo-video` | Peripheral; not on the main path |

License is AGPL-3.0.

## Downstream consumer: clawexa

**This matters more than anything else in this file.** `@better-openclaw/core` is
consumed as a library by **clawexa** (`~/Desktop/clawexa`), a commercial managed-hosting
product that provisions VPS instances (Hetzner / Linode / Contabo), bills through Stripe,
and deploys OpenClaw stacks onto them via cloud-init.

Clawexa is a *first-class consumer with a vendor-specific mode inside this open source
codebase*:

- `DeploymentTargetSchema` in `packages/core/src/schema.ts` includes a literal `"clawexa"`
  member alongside `local` / `vps` / `homelab`.
- `packages/core/src/addon-stack.ts` exports `generateAddonStack()` and
  `updateAddonStack()`, which exist specifically to serve clawexa's provisioning flow.
  They emit a *single compose override* layered on top of infrastructure that clawexa's
  cloud-init already provides (gateway, redis, postgres, open-webui, host Caddy), rather
  than a full standalone stack.
- `ServiceDefinition` carries fields added for that use case: `capDropCompatible`,
  `prebuiltImage`, `proxyPath`, `firstBootCapabilities`, `envQuirks`.
- The originating spec lives at `~/Desktop/clawexa/PRD_BOC_CLAWEXA_STACKS.md`. It is
  substantially implemented as of core v1.0.31.

**Implications when you change core:**

1. Changing `addon-stack.ts`, the `clawexa` deployment target, or any of the
   PRD-era `ServiceDefinition` fields can break a paying product. Treat these as a
   published API contract, not internal code.
2. `generateAddonStack()` must **never throw**. Failures are reported through
   `skippedServices[]` and `warnings[]`. This is a deliberate contract — clawexa
   provisions unattended and cannot recover from an exception mid-cloud-init.
3. Secrets generated in clawexa mode must be non-empty and meet per-service minimums
   (Convex needs exactly 32 bytes / 64 hex chars; `DISABLE_BEACON` must be `"true"`,
   never `""`). These are encoded as `envQuirks` on service definitions — add them
   there rather than special-casing in the generator.
4. Adding a service that needs `build:` makes it undeployable for clawexa unless you
   also set `prebuiltImage`. Cloud-init cannot clone and build.

If you are working in this repo and a change would be simpler by breaking one of the
above, say so explicitly rather than doing it quietly.

## Source of truth

Do not trust counts in prose (README.md, VISION.md — both are stale). Read the
registries:

- Services: `packages/core/src/services/definitions/*.ts`, indexed by
  `packages/core/src/services/registry.ts` (~200 definitions)
- Presets: `packages/core/src/presets/registry.ts`
- Agent frameworks: `packages/core/src/frameworks/registry.ts`
- Skills / skill packs: `packages/core/src/skills/registry.ts`

Every service definition pins an image tag and declares ports, volumes, health checks,
env vars, resource limits, and dependencies.

## Commands

```bash
pnpm install          # Node >= 22, pnpm 10.30.3 (enforced by only-allow)
pnpm dev              # web :3654, api :3456, mission-control :3660
pnpm dev:mcp          # MCP server separately
pnpm build            # turbo build, all packages
pnpm test             # vitest across the workspace
pnpm check:all        # lint + typecheck + test — run this before shipping
pnpm lint:fix         # Biome autofix
pnpm format           # Biome format
pnpm check:deadcode   # knip
```

## Conventions

- **TypeScript everywhere**, strict. Zod schemas are the validation boundary; derive
  types from schemas rather than declaring them twice.
- **Biome** for lint and format, not ESLint/Prettier. Tabs, per existing files.
- **Vitest** for tests. Snapshot tests in `packages/core/src/__snapshots__` guard
  generator output — if a snapshot changes, understand why before updating it. An
  unexplained snapshot diff usually means you changed generated compose output for
  every downstream consumer.
- **Validation at every layer**: service definitions at build time, user selections
  during resolution, generated config before writing, YAML validity after generation.
- **tsdown** builds dual ESM + CJS.
- New services go in `packages/core/src/services/definitions/` as one file per service,
  registered in the registry. Tests are required.

## Gotchas

- README.md and VISION.md service/preset counts are out of date. Don't propagate them;
  fix them if you touch those files.
- `hardened: true` applies `cap_drop: ALL` + `security_opt: no-new-privileges`, which
  breaks first boot for services that write config on startup (SearXNG, Uptime Kuma,
  Meilisearch). Use `capDropCompatible: false` on the definition rather than removing
  hardening globally.
- Bare-metal mode is a *hybrid*: only services with a native recipe run on the host
  (currently Redis on Linux); everything else stays in Docker. See
  `packages/core/src/bare-metal-partition.ts`.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
