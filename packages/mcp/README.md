# @better-openclaw/mcp

MCP (Model Context Protocol) server for **better-openclaw** — exposes Docker Compose stack generation capabilities to AI agents like Claude, GPT, Gemini, and any MCP-compatible client.

Generate production-ready self-hosted infrastructure stacks through natural conversation with your AI assistant.

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "better-openclaw": {
      "command": "npx",
      "args": ["-y", "@better-openclaw/mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add better-openclaw -- npx -y @better-openclaw/mcp
```

### Cursor / Windsurf

Add to your MCP settings:

```json
{
  "better-openclaw": {
    "command": "npx",
    "args": ["-y", "@better-openclaw/mcp"]
  }
}
```

### Run Standalone

```bash
npx @better-openclaw/mcp
```

## Tools

The server exposes **10 tools** that AI agents can call:

### Discovery

| Tool | Description |
|------|-------------|
| `list-services` | List all 94+ available Docker services, optionally filtered by `category` or `maturity` (stable/beta/experimental) |
| `get-service` | Get complete definition of a service by ID — image, ports, env vars, volumes, health check, resource limits |
| `search-services` | Keyword search across the service catalog with relevance scoring |
| `suggest-services` | Suggest services from a natural language description (e.g. *"I need a research stack with vector search and local LLM"*) |

### Presets & Skills

| Tool | Description |
|------|-------------|
| `list-presets` | List all curated stack presets (minimal, researcher, devops, full, coding-team, ai-playground, etc.) |
| `get-preset` | Get full preset details with resolved dependency tree and memory estimate |
| `list-skill-packs` | List skill packs, optionally filtered by compatibility with selected services |

### Validation & Generation

| Tool | Description |
|------|-------------|
| `resolve-dependencies` | Resolve service dependencies, detect conflicts, estimate memory usage |
| `validate-stack` | End-to-end validation — dependency resolution, YAML generation, port conflict checks, volume uniqueness |
| `generate-stack` | Generate a complete Docker Compose stack with all files (docker-compose.yml, .env, scripts, configs, README) |

## Resources

The server exposes **3 read-only resources** as reference data:

| Resource | URI | Description |
|----------|-----|-------------|
| Service Catalog | `openclaw://services` | Complete catalog of all Docker services with summaries |
| Preset Catalog | `openclaw://presets` | All curated stack presets |
| Skill Catalog | `openclaw://skills` | All skill pack definitions |

## Example Conversations

**Generate a research stack:**
> "Create a self-hosted AI research stack with vector search, local LLM inference, and workflow automation"

The agent will call `suggest-services` → `resolve-dependencies` → `generate-stack` and return a complete Docker Compose setup with Qdrant, Ollama, n8n, and all dependencies.

**Use a preset:**
> "Set up the devops preset with Caddy reverse proxy and monitoring"

The agent calls `get-preset` → `generate-stack` with proxy and monitoring options.

**Choose a different framework:**
> "Create a ZeroClaw stack with PostgreSQL and Redis"

The agent calls `generate-stack` with `primaryFramework: "zeroclaw"` — the output uses a ZeroClaw gateway container and skips Convex/Mission-Control.

**Explore services:**
> "What database services are available?"

The agent calls `list-services` with `category: "database"` and returns all database options.

## Tool Reference

### generate-stack

The primary tool for stack generation.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `projectName` | string | yes | Project name (lowercase alphanumeric with hyphens) |
| `services` | string[] | yes | Service IDs to include (e.g. `["postgresql", "redis", "n8n"]`) |
| `skillPacks` | string[] | no | Skill pack IDs to include |
| `proxy` | `"none"` \| `"caddy"` \| `"traefik"` | no | Reverse proxy (default: none) |
| `domain` | string | no | Domain for SSL/reverse proxy routing |
| `gpu` | boolean | no | Enable GPU passthrough (default: false) |
| `platform` | string | no | Target platform (default: linux/amd64) |
| `monitoring` | boolean | no | Include Grafana + Prometheus (default: false) |
| `generateSecrets` | boolean | no | Auto-generate passwords and keys (default: true) |
| `primaryFramework` | string | no | Primary agent framework: `openclaw` (default), `copaw`, `nanoclaw`, `nanobot`, `zeroclaw`, `memu`, `claude-code`, `codex` |
| `companionFrameworks` | string[] | no | Companion agent frameworks to run alongside the primary |

**Returns:** JSON with `files` (map of filename → content), `metadata` (service count, memory estimate), and `fileList`.

### suggest-services

Natural language service discovery with keyword expansion.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | yes | Natural language description of what you need |
| `limit` | number | no | Max results (1-30, default: 10) |

**Keyword aliases:** `db` → database, `llm` → ai, `metrics` → monitoring, `scraping` → browser, `auth` → security, and more.

### search-services

Keyword search with weighted relevance scoring.

| Match Location | Score Weight |
|----------------|-------------|
| ID / Name | 3x |
| Category | 2x |
| Tags | 2x |
| Description | 1x |

## Operations Logging

The MCP server logs all tool invocations, outcomes, and errors as structured NDJSON to `~/.better-openclaw/logs/mcp-operations.log`. Each tool call is logged with its parameters, duration, result summary, and any errors.

Override the log directory or level with environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_LOG_DIR` | `~/.better-openclaw/logs/` | Log directory path |
| `OPENCLAW_LOG_LEVEL` | `info` | Minimum log level |

## Architecture

```
AI Agent (Claude, GPT, etc.)
    │
    ▼ MCP Protocol (stdio)
┌───────────────────────────┐
│  @better-openclaw/mcp     │
│  ┌─────────┐ ┌──────────┐│
│  │  Tools  │ │Resources ││
│  │  (10)   │ │   (3)    ││
│  └────┬────┘ └────┬─────┘│
│       └─────┬─────┘      │
│             ▼             │
│    @better-openclaw/core  │
│  ┌──────────────────────┐ │
│  │ 94+ service defs     │ │
│  │ Dependency resolver  │ │
│  │ Docker Compose gen   │ │
│  │ Validation engine    │ │
│  └──────────────────────┘ │
└───────────────────────────┘
```

The MCP server is a thin adapter layer over `@better-openclaw/core`. All service definitions, dependency resolution, YAML composition, and file generation logic lives in core.

## Development

```bash
# Install dependencies
pnpm install

# Run in dev mode (auto-reload)
pnpm --filter @better-openclaw/mcp dev

# Build
pnpm --filter @better-openclaw/mcp build

# Run tests
pnpm --filter @better-openclaw/mcp test

# Type check
pnpm --filter @better-openclaw/mcp typecheck
```

### Adding a New Tool

1. Create `src/tools/my-tool.ts`:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerMyTool(server: McpServer): void {
  server.registerTool(
    "my-tool",
    {
      title: "My Tool",
      description: "What it does",
      inputSchema: {
        param: z.string().describe("Parameter description"),
      },
    },
    async (params) => {
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );
}
```

2. Register it in `src/server.ts`:

```typescript
import { registerMyTool } from "./tools/my-tool.js";
// ...
registerMyTool(server);
```

## Available Services

The server provides access to **94+ self-hosted services** across categories:

- **Database** — PostgreSQL, Redis, MongoDB, Neo4j, SurrealDB, ClickHouse
- **AI & ML** — Ollama, Qdrant, ChromaDB, Meilisearch, Weaviate
- **Automation** — n8n, Activepieces, Temporal
- **Communication** — Ntfy, Apprise
- **Development** — Gitea, Code Server, Browserless, OpenSandbox, Agent Browser (AI-native snapshot+ref browsing)
- **Monitoring** — Grafana, Prometheus, Uptime Kuma, Loki
- **Media** — Immich, Jellyfin, FFmpeg
- **Networking** — Caddy, Traefik, WireGuard
- **Storage** — MinIO, Garage, SFTPGo

## Privacy

Analytics tracking is anonymous (no PII) and opt-out via `DISABLE_ANALYTICS=true`.

## License

AGPL-3.0 — see [LICENSE](../../LICENSE) for details.
