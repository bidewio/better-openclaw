<p align="center">
  <h1 align="center">better-openclaw</h1>
  <p align="center">
    <strong>Build your AI agent superstack in seconds.</strong><br/>
    201 services. 8 agent frameworks. 44 skill packs. 21 presets. One command.
  </p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#deployment">Deployment</a> &bull;
  <a href="#service-catalog">Services</a> &bull;
  <a href="#skill-packs">Skill Packs</a> &bull;
  <a href="#presets">Presets</a> &bull;
  <a href="#rest-api">API</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#development">Development</a>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" />
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.30.3-orange.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" />
</p>

---

**better-openclaw** is a CLI tool, REST API, and web UI for scaffolding production-ready AI agent stacks with Docker Compose. Choose from **8 agent frameworks** (OpenClaw, CoPaw, NanoClaw, NanoBot, ZeroClaw, MemU, Claude Code, Codex), pick your services, choose skill packs, and get a fully wired `docker-compose.yml`, `.env`, reverse proxy configs, monitoring dashboards, and agent skill files -- all in one command.

## Quick Start

```bash
npx create-better-openclaw@latest
```

Follow the interactive wizard to select services, skill packs, and configuration options. Your complete stack will be generated in seconds.

### Don't want to run it yourself?

better-openclaw is free and AGPL-3.0, and always will be. But if you'd rather not operate
the stack, we'll deploy and run it for you on a dedicated VPS.

Self-serve signup isn't open yet — during early access instances are set up by hand.
Email **bachir@bidew.io** with what you're trying to run and what you're doing today
instead, and you'll get an honest answer about whether it's a fit.

Or run non-interactively:

```bash
# Use a preset
npx create-better-openclaw --preset researcher --yes

# Cherry-pick services
npx create-better-openclaw --services postgresql,redis,n8n,grafana --proxy caddy --domain example.com --yes

# Use a different agent framework
npx create-better-openclaw --preset researcher --primary-framework zeroclaw --yes

# Run multiple frameworks side-by-side
npx create-better-openclaw --services postgresql,redis --primary-framework memu --companion-frameworks copaw,nanoclaw --yes

# Preview without writing files
npx create-better-openclaw --preset devops --dry-run

# JSON output for CI/CD pipelines
npx create-better-openclaw --preset minimal --yes --json
```

### CLI Commands

```bash
npx create-better-openclaw generate [dir]       # Generate a stack (default command)
npx create-better-openclaw services list        # List all 201 available services
npx create-better-openclaw presets list         # List all preset stacks
npx create-better-openclaw presets info <id>    # Show preset details
npx create-better-openclaw validate <dir>      # Validate an existing stack
npx create-better-openclaw init                 # Initialize in current directory
npx create-better-openclaw add <service-id>    # Add a service to existing stack
npx create-better-openclaw remove <service-id> # Remove a service from existing stack
npx create-better-openclaw deploy               # Deploy stack to Dokploy or Coolify (interactive)
npx create-better-openclaw deploy --provider dokploy --url https://... --api-key ...  # Non-interactive
npx create-better-openclaw completion <shell>  # Generate shell completions (bash/zsh/fish)
```

### Advanced CLI Options

```bash
# Custom proxy ports (auto-detects conflicts)
npx create-better-openclaw --proxy caddy --proxy-http-port 8080 --proxy-https-port 8443

# Select AI providers (comma-separated)
npx create-better-openclaw --ai-providers openai,anthropic,google --yes

# Combine options
npx create-better-openclaw \
  --services postgresql,redis,n8n \
  --proxy caddy --proxy-http-port 8080 \
  --ai-providers openai,anthropic \
  --domain example.com \
  --yes
```

## Features

- **8 agent frameworks** -- choose OpenClaw, CoPaw, NanoClaw, NanoBot, ZeroClaw, MemU, Claude Code, or Codex as your primary orchestrator, with optional companion frameworks for hybrid stacks
- **Interactive CLI wizard** -- guided service selection with dependency resolution
- **Non-interactive mode** -- scriptable with presets and flags for CI/CD pipelines
- **Automatic port conflict detection** -- scans your system for port conflicts and auto-reassigns services to available ports (interactive and non-interactive modes)
- **REST API** -- generate stacks programmatically via HTTP endpoints
- **Web UI** -- visual stack builder with live preview and one-click download
- **Smart dependency resolution** -- automatically adds required services (e.g., n8n adds PostgreSQL)
- **Preset stacks** -- pre-configured templates for common use cases
- **Skill packs** -- bundles of agent skills wired to their backing services
- **Reverse proxy configs** -- auto-generated Caddy or Traefik configuration with label generation and custom port support
- **Auto-generated OpenAPI spec** -- live Swagger UI at `/api/v1/docs`
- **Distributed rate limiting** -- optional Redis-backed rate limiter for production
- **Config migrations** -- forward-compatible configuration versioning
- **Monitoring dashboards** -- Grafana + Prometheus pre-wired with service exporters
- **Environment files** -- secure `.env` generation with random secrets
- **One-click deploy** -- deploy generated stacks to self-hosted Dokploy or Coolify directly from the web UI or CLI
- **Centralized operations logging** -- structured NDJSON logs across all packages (CLI, API, MCP) with correlation IDs, step tracking, duration measurement, and automatic sensitive data redaction
- **Validation engine** -- port conflicts, resource limits, and configuration checks
- **Multi-platform support** -- linux/amd64 and linux/arm64
- **Bare-metal deployment** -- hybrid native + Docker: run supported services natively on the host and use Docker only for the rest (see [Deployment](#deployment))

## Deployment

You can generate stacks for **Docker** (default) or **bare-metal**:

- **Docker** — All services run in containers. Use `docker compose up` to start everything.
- **Bare-metal** — A **native + Docker hybrid**: services that have a **native recipe** (install/run on the host) run natively; the rest run in Docker. The generator outputs:
  - One **docker-compose** for Docker-only services plus the OpenClaw gateway.
  - **Native install/run scripts** (e.g. `native/install-linux.sh`) for services that support native install on the chosen platform.
  - A **top-level installer** (`install.sh` or `install.ps1`) that installs and starts native services first, then runs `docker compose up` for the rest.

Only services with a native recipe run on the host; others remain in Docker. Currently **Redis** supports a native Linux recipe (apt/dnf + systemd). More services (e.g. PostgreSQL, Caddy, Prometheus) may be added over time. Node/Python apps, La Suite Meet, Ollama, and similar stay Docker-only.

## Service Catalog

201 services across 37 categories, ready to compose. The table below is a selection;
run `npx create-better-openclaw services list` for the full catalog:

| Category | Services |
|---|---|
| **AI Coding Agents** | Claude Code, Codex, Gemini CLI, Kimi, OpenCode |
| **AI Platforms & Chat UIs** | AnythingLLM, Dify, Flowise, LibreChat, LiteLLM, Open WebUI |
| **AI / Local Models** | ComfyUI, Ollama, Stable Diffusion, Whisper |
| **Automation & Workflows** | Cal.com, Home Assistant, n8n, Temporal, xyOps |
| **Database & Caching** | Convex, Neo4j, PostgreSQL, Redis, Supabase, Valkey |
| **Vector Databases** | ChromaDB, Milvus, Qdrant, Weaviate |
| **Media & Video** | FFmpeg, Immich, Jellyfin, Motion Canvas, Remotion |
| **Social Media** | Ghost, Mixpost, Postiz |
| **Analytics** | Matomo, OpenPanel, Umami |
| **Knowledge & Documents** | AppFlowy, DocsGPT, NocoDB, Outline, Paperless-ngx |
| **Object Storage** | MinIO, Nextcloud |
| **Developer Tools** | Beszel, Code Server, Convex Dashboard, Coolify, Dokploy, Dozzle, Gitea, Headscale, Jenkins, Mission Control, Portainer, Tailscale, Watchtower |
| **Reverse Proxy** | Caddy, Traefik |
| **Monitoring** | Grafana, Loki, Prometheus, SigNoz, Uptime Kuma |
| **Browser Automation** | Browserless, LightPanda, Playwright Server, Scrapling, Steel Browser |
| **Search** | Meilisearch, SearXNG |
| **Communication** | Gotify, La Suite Meet (frontend/backend/agents), LiveKit, Matrix Synapse, Mattermost, ntfy, Rocket.Chat, UseSend |
| **Streaming** | Stream Gateway |
| **Security** | Authentik, CrowdSec, HexStrike, PentAGI, PentestAgent, SolidityGuard, Vaultwarden |
| **Desktop** | Desktop Environment (KasmVNC) |

Every service definition includes a pinned Docker image tag, ports, volumes, health checks, environment variables, resource limits, and dependency declarations.

## Skill Packs

Skill packs bundle agent skills with their required infrastructure. 44 packs are
available; these are the most used:

| Pack | Description | Services |
|---|---|---|
| **Video Creator** | Create and process videos programmatically | FFmpeg, Remotion, MinIO |
| **Research Agent** | Web research with vector memory and scraping | Qdrant, SearXNG, Browserless |
| **Social Media** | Content processing with caching and storage | FFmpeg, Redis, MinIO |
| **DevOps** | Monitoring, automation, and alerting | n8n, Redis, Uptime Kuma, Grafana, Prometheus |
| **Knowledge Base** | Document indexing with vector + full-text search | Qdrant, PostgreSQL, Meilisearch |
| **Local AI** | Local LLM inference and speech-to-text | Ollama, Whisper |
| **Content Creator** | AI-powered image and video generation | FFmpeg, Remotion, MinIO, Stable Diffusion |
| **AI Playground** | Multi-model AI experimentation | Ollama, Open WebUI, Qdrant, LiteLLM |
| **Coding Team** | AI coding agents with shared state | Claude Code, Codex, Redis, PostgreSQL |
| **Knowledge Hub** | Wiki and document search | Outline, Qdrant, Meilisearch, PostgreSQL |

## Presets

Pre-configured stack templates for quick starts. 21 presets are available; these are
the most used:

| Preset | Services | Memory |
|---|---|---|
| **Minimal** | Redis | ~1 GB |
| **Creator** | FFmpeg, Remotion, MinIO, Redis | ~2 GB |
| **Researcher** | Qdrant, SearXNG, Browserless, Redis | ~2.5 GB |
| **DevOps** | n8n, PostgreSQL, Redis, Uptime Kuma, Grafana, Prometheus | ~3 GB |
| **Content Creator** | FFmpeg, Remotion, MinIO, Redis, Stable Diffusion | ~4 GB |
| **AI Playground** | Ollama, Open WebUI, Qdrant, LiteLLM, Redis | ~6 GB |
| **Coding Team** | Claude Code, Codex, Redis, PostgreSQL | ~3 GB |
| **La Suite Meet** | Meet frontend/backend/agents, Redis, PostgreSQL, LiveKit | ~4 GB |
| **Full Stack** | All core services + all skill packs | ~8 GB |

## Agent Frameworks

Choose your primary agent orchestrator and optionally add companion frameworks for hybrid stacks:

| Framework | ID | Description |
|---|---|---|
| **OpenClaw** | `openclaw` | Full-featured agent framework with gateway, mission control, and Tailscale networking (default) |
| **CoPaw** | `copaw` | Cooperative multi-agent framework with shared memory |
| **NanoClaw** | `nanoclaw` | Lightweight single-agent runtime for resource-constrained environments |
| **NanoBot** | `nanobot` | Minimal bot framework with plugin architecture |
| **ZeroClaw** | `zeroclaw` | Zero-config agent framework with convention-over-configuration |
| **MemU** | `memu` | Memory-first agent framework with persistent context and PostgreSQL backing |
| **Claude Code** | `claude-code` | Anthropic's CLI agent for software engineering tasks |
| **Codex** | `codex` | OpenAI's CLI agent for code generation and editing |

Non-OpenClaw frameworks skip Convex, Mission Control, and Tailscale. Each framework generates its own gateway container, CLI services, and network configuration.

## REST API

The API runs on port 3456 with auto-generated OpenAPI docs at `/api/v1/docs`.

```bash
# List all services
curl http://localhost:3456/api/v1/services

# Get a specific service
curl http://localhost:3456/api/v1/services/postgresql

# Filter services by category
curl http://localhost:3456/api/v1/services?category=database

# List presets
curl http://localhost:3456/api/v1/presets

# Get preset with resolved service details
curl http://localhost:3456/api/v1/presets/devops

# Generate a stack
curl -X POST http://localhost:3456/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"services": ["postgresql", "redis", "n8n"], "proxy": "caddy"}'

# Generate with a specific agent framework
curl -X POST http://localhost:3456/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"services": ["postgresql", "redis"], "primaryFramework": "zeroclaw", "companionFrameworks": ["copaw"]}'
```

API key authentication is supported via the `X-API-Key` header. Configure allowed keys with the `API_KEYS` environment variable (comma-separated).

## Architecture

Main workspace packages and repo tooling:

```
better-openclaw/
├── packages/
│   ├── core/             # Schemas, service registry, resolver, composer, validators
│   ├── cli/              # Interactive wizard + non-interactive CLI (Commander + Clack)
│   ├── api/              # REST API (Hono + Zod OpenAPI)
│   ├── web/              # Web UI (Next.js 16 + Tailwind CSS 4)
│   ├── db/               # Shared Drizzle schema and database client
│   ├── mcp/              # MCP server for agent integrations
│   └── mission-control/  # Vite + Convex operations dashboard
├── turbo.json            # Turborepo task pipeline
├── biome.json            # Linting and formatting (Biome)
└── vitest.config.ts      # Shared Vitest defaults for non-UI packages
```

### Package Dependency Graph

- `core` powers the CLI, API, web app, and MCP server.
- `db` is shared by the API/auth layer for persisted user data.
- `mission-control` is a separate Vite + Convex app within the same workspace.

### Key Technologies

- **Runtime**: Node.js >= 22
- **Language**: TypeScript 5.7
- **Monorepo**: pnpm workspaces + Turborepo
- **API**: Hono with Zod OpenAPI
- **Web**: Next.js 16 with React 19, Tailwind CSS 4, Framer Motion
- **CLI**: Commander + @clack/prompts
- **Validation**: Zod schemas throughout
- **Testing**: Vitest
- **Linting**: Biome
- **Build**: tsdown (ESM + CJS dual-format output)

## Development

### Prerequisites

- Node.js >= 22
- pnpm 10.30.3

### Setup

```bash
# Clone the repository
git clone https://github.com/bidewio/better-openclaw.git
cd better-openclaw

# Install dependencies
pnpm install

# Start the main local apps in development mode
pnpm dev
```

This starts:
- **API** at `http://localhost:3456` (with hot reload via tsx)
- **Web** at `http://localhost:3654` (with Next.js fast refresh)
- **Mission Control** at `http://localhost:3660` (with Vite + Convex dev tooling)

Run `pnpm dev:mcp` to start the MCP server separately. `packages/db` is a shared library package and exposes `db:*` scripts for schema and migration work rather than a long-running dev server.

### Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start the main local apps in dev mode |
| `pnpm dev:mcp` | Start the MCP server in dev mode |
| `pnpm dev:all` | Start the main apps plus the MCP server |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm format` | Format all files with Biome |
| `pnpm clean` | Remove all build artifacts |

### Docker

Build and run the full stack with Docker:

```bash
docker compose up --build
```

This exposes:
- **Web UI** at `http://localhost:3000`
- **API** at `http://localhost:3456`

## Contributing

Contributions are welcome! Please see the [Contributing Guide](CONTRIBUTING.md) for details on:

- Adding new service definitions
- Creating skill packs
- Building preset stacks
- Writing tests
- Code style and conventions

## License

[AGPL-3.0](LICENSE)

---

<p align="center">
  Made with care by <a href="https://bidew.io">bachir@bidew.io</a>
</p>
