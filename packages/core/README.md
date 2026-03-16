# @better-openclaw/core

The core engine responsible for parsing configurations, resolving dependencies, formatting outputs, and generating production-ready AI agent Docker Compose stacks with support for 8 agent frameworks.

## Features

- **Multi-Agent Framework Registry:** Choose from 8 pluggable agent frameworks (OpenClaw, CoPaw, NanoClaw, NanoBot, ZeroClaw, MemU, Claude Code, Codex) as primary orchestrator, with optional companion frameworks for hybrid stacks. Framework definitions live in `src/frameworks/` and use a registry pattern.
- **Service Registry:** A unified, expandable catalog of 94+ pre-configured Docker services (e.g., Traefik, PostgreSQL, Qdrant, Ollama, N8N, SearXNG, Scrapling, etc.) categorized by function (databases, models, scrapers, tools).
- **Dependency Resolution Engine:** Automatically detects and resolves required services. Framework-specific mandatory services are injected automatically (e.g., MemU requires PostgreSQL, non-OpenClaw frameworks skip Convex/Mission-Control/Tailscale).
- **Skill Injection (`SKILL.md`):** Deep integration with AI agent workflows. Packages specialized `SKILL.md` instructions into volume mounts for AI tools like the `browser` integration or `tinyfish`.
- **Intelligent Networking & Proxies:** Fully integrated reverse proxy generation (Caddy and Traefik) with auto-SSL domain generation and WebSocket streaming support (`flush_interval -1`) for noVNC/KasmVNC desktop sandbox services.
- **Cross-Platform & Heterogeneous Topologies:** Supports generating stacks for `local` (Docker Desktop), `vps` (cloud), and `homelab` deployments. It explicitly supports a hybrid native-docker model via `deploymentType: "bare-metal"`.
- **GPU Passthrough Support:** Automatically injects NVIDIA or AMD runtime flags to AI services if the `gpuRequired` flag is detected on the requested service and enabled by the user.

## Programmatic API

You can use the generation engine programmatically within any Node.js or TypeScript application:

```typescript
import { generate, type GenerationInput } from "@better-openclaw/core";

const input: GenerationInput = {
	projectName: "my-agent-stack",
	services: ["postgresql", "ollama", "n8n"],
	skillPacks: ["local-ai"],
	proxy: "caddy",
	domain: "my-ai.example.com",
	gpu: true,
	platform: "linux/amd64",
	deployment: "vps",
	deploymentType: "docker", // or "bare-metal"
	generateSecrets: true,
	openclawVersion: "latest",
	monitoring: true,
	primaryFramework: "zeroclaw",       // Choose from 8 agent frameworks
	companionFrameworks: ["copaw"],     // Optional companion frameworks
};

// Generates the Compose YAML, configs, skills, and .env securely.
const result = generate(input);

console.log(result.files["docker-compose.yaml"]); 
console.log(result.metadata.estimatedMemoryMB);
```

## Service Definition Format

The Core reads from `src/services/definitions/`. New services should expose a standardized `ServiceDefinition`:

```typescript
export const myCoolService: ServiceDefinition = {
	id: "my-cool-service",
	name: "Cool AI Service",
	description: "Provides an API for cool operations.",
	category: "tools",
	image: "cool/service:latest",
	ports: [{ port: 8080, public: true }],
	environment: { API_KEY: "${SECRET_KEY}" },
	dependsOn: ["postgres-database"],
};
```

## Adding Skills

Skills are markdown instructions or code bundles mapped to specific tools. They are defined in `skills/manifest.json`. During generation, if a `SkillPack` is explicitly selected or implicitly included via an auto-installing service, the Core locates the corresponding files and mounts them into the generated stack's Volume pathways.

## PaaS Deployers

The core includes deployer clients for pushing generated stacks directly to self-hosted PaaS platforms:

| Provider    | Module                 | Auth                    |
|-------------|------------------------|-------------------------|
| **Dokploy** | `deployers/dokploy.ts` | `x-api-key` header      |
| **Coolify** | `deployers/coolify.ts` | `Authorization: Bearer` |

All deployers implement the `PaasDeployer` interface (defined in `deployers/types.ts`). To add a new provider, implement the interface and register it in `deployers/index.ts`.

```typescript
import { getDeployer, getAvailableDeployers } from "@better-openclaw/core";

// List available providers
const providers = getAvailableDeployers(); // ["dokploy", "coolify"]

// Deploy a stack
const deployer = getDeployer("dokploy");
const result = await deployer.deploy({
  target: { instanceUrl: "https://dokploy.example.com", apiKey: "..." },
  projectName: "my-stack",
  composeYaml: "...",
  envContent: "...",
});
```

## Operations Logger

The core ships a centralized `OperationsLogger` used by all packages (CLI, API, MCP) to produce structured, NDJSON log files tracking every significant operation — generation pipelines, deployments, file writes, API requests, and MCP tool calls.

### Programmatic Usage

```typescript
import { OperationsLogger, ConsoleSink, CallbackSink } from "@better-openclaw/core";
import { FileSink } from "@better-openclaw/core/logger/sinks/file-sink";

const logger = new OperationsLogger({
  source: "cli",                // "cli" | "api" | "mcp" | "web" | "core"
  sinks: [
    new ConsoleSink(),          // Human-readable terminal output
    new FileSink(),             // NDJSON file (~/.better-openclaw/logs/operations.log)
  ],
  minLevel: "info",             // "debug" | "info" | "warn" | "error"
});

// Basic logging
logger.info("generation", "Starting stack generation", { projectName: "my-stack" });
logger.warn("validation", "Port conflict detected", { port: 8080 });
logger.error("deployment", "Deploy failed", new Error("timeout"), { provider: "dokploy" });

// Timed operations (auto-logs duration + outcome)
const result = await logger.timed("deployment", "Deploying to Dokploy", async () => {
  return await deployer.deploy(input);
});

// Child loggers (inherit correlationId)
const childLogger = logger.child({ source: "core" });

// Pass to generate()
const output = generate(input, { logger });
```

### Log File Location

| Default | `~/.better-openclaw/logs/operations.log` |
|---------|------------------------------------------|
| Override | `OPENCLAW_LOG_DIR` env var |
| Format | NDJSON (one JSON object per line, `jq`-friendly) |
| Rotation | 10 MB per file, 5 rotated files (~60 MB total) |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_LOG_DIR` | `~/.better-openclaw/logs/` | Log directory path |
| `OPENCLAW_LOG_LEVEL` | `info` | Minimum log level |
| `OPENCLAW_LOG_MAX_SIZE` | `10485760` (10 MB) | Max file size before rotation |
| `OPENCLAW_LOG_MAX_FILES` | `5` | Number of rotated files to keep |

### Sensitive Data

The logger automatically redacts known sensitive keys (`apiKey`, `password`, `token`, `secret`, `authorization`, `credentials`, `private_key`) from context before writing to any sink.

## Development

```bash
pnpm build  # Compiles TypeScript via tsdown
pnpm test   # Executes integration tests verifying generating valid stacks
pnpm lint   # Executes Biome linting rules
```
