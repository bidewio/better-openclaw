# @better-openclaw/cli

The official Command Line Interface (CLI) for rapidly scaffolding production-ready AI agent stacks directly to your filesystem. Choose from 8 agent frameworks, pick services, and generate tailored Docker Compose & native hybrid topologies.

## Installation & Usage

You can use the CLI seamlessly using `pnpx`, `npx`, or standard global installation mechanisms. Node.js >= 20 is required.

```bash
# Interactive interactive builder (Visual Wizard)
pnpx create-better-openclaw@latest [my-directory]

# Headless / Pipeline generation (Fast track with presets)
pnpx create-better-openclaw@latest --preset researcher --yes

# Custom Advanced Scaffold
pnpx create-better-openclaw@latest --services ollama,qdrant,n8n --skills ollama-local-llm,qdrant-memory

# With sandboxed code execution and VNC desktop
pnpx create-better-openclaw@latest --services opensandbox --skills code --proxy caddy --domain my-ai.dev
```

## Features

- **Interactive Wizard (Terminal UI):** Guides you through agent framework selection, platform architecture, custom vs preset service selection, AI skill packs, and deployment/proxy variables. Driven by highly optimized `@clack/prompts`.
- **Agent Framework Selection:** Choose from 8 frameworks (OpenClaw, CoPaw, NanoClaw, NanoBot, ZeroClaw, MemU, Claude Code, Codex) as primary orchestrator, with optional companion frameworks.
- **Intelligent Dependency Graphs:** Ensures prerequisite tools are correctly enabled.
- **Multiple Platform Topologies:** Support targeting `linux/amd64`, `linux/arm64`, `macos`, and `windows`.
- **Multiple Output Formats:** Directly outputs to a `directory`, a `tar.gz` archive, or a `zip` bundle via flags (`--output-format zip`).

## Non-Interactive CLI Options

This tool is highly suited for CI/CD environments or scripting automation.

| Argument | Definition |
|----------|------------|
| `-y, --yes` | Silently build using default configuration mappings |
| `--preset <id>` | Scaffold immediately using predefined blueprints (`minimal`, `creator`, `researcher`, `devops`, `full`) |
| `--services <ids>` | Explicit comma-separated list of service IDs to install |
| `--skills <ids>` | Explicit comma-separated list of companion Skill Pack IDs to mount into agents |
| `--proxy <type>` | Assign Reverse proxy networking mode: `none`, `caddy`, `traefik` |
| `--domain <domain>` | Fully qualified domain mapped to wildcard auto-SSL proxies |
| `--primary-framework <id>` | Primary agent framework: `openclaw` (default), `copaw`, `nanoclaw`, `nanobot`, `zeroclaw`, `memu`, `claude-code`, `codex` |
| `--companion-frameworks <ids>` | Comma-separated companion frameworks to run alongside the primary |
| `--monitoring` | Embed Prometheus, Grafana, and Cadvisor telemetry |
| `--gpu` | Passthrough host GPU telemetry to NVIDIA/AMD hardware integrations for deployed LLMs |
| `--deployment-type <type>` | Defines compute execution layer boundaries. Options: `docker` (Full containerization) vs. `bare-metal` (Native node execution + Docker fallback layer where required). |
| `--output-format <type>` | File emission mechanism: `directory`, `zip`, `tar` |
| `--dry-run` | Build generation outputs in memory for trace logging without writing to disk |
| `--open` | Escape terminal workflow and launch the Visual Web UI `better-openclaw.dev` platform |

## Deploy to PaaS

Deploy a generated stack directly to a self-hosted Dokploy or Coolify instance:

```bash
# Interactive deploy wizard
pnpx create-better-openclaw deploy

# Non-interactive deploy
pnpx create-better-openclaw deploy \
  --provider dokploy \
  --url https://dokploy.example.com \
  --api-key YOUR_API_KEY \
  --dir ./my-stack
```

| Flag               | Description                                              |
|--------------------|----------------------------------------------------------|
| `--provider <id>`  | PaaS provider: `dokploy` or `coolify`                    |
| `--url <url>`      | Instance URL of the PaaS platform                        |
| `--api-key <key>`  | API key or bearer token                                  |
| `--dir <path>`     | Directory containing `docker-compose.yml` (default: `.`) |

If any required flag is missing, the CLI falls back to the interactive wizard which guides you through provider selection, URL, and API key entry.

## Operations Logging

The CLI automatically writes detailed structured logs for every operation — generation pipelines, file writes, and PaaS deployments. Logs are written as NDJSON to `~/.better-openclaw/logs/operations.log`.

Each log entry includes a correlation ID linking all operations within a single CLI run, timestamps, durations, outcomes, and step-by-step details for multi-step operations like deployments.

Override the default log directory and level with environment variables:

```bash
OPENCLAW_LOG_DIR=/var/log/openclaw OPENCLAW_LOG_LEVEL=debug pnpx create-better-openclaw --preset researcher --yes
```

See the [@better-openclaw/core README](../core/README.md#operations-logger) for full configuration options.

## Package Development

The CLI compiles against standard TypeScript configurations into dual CJS/MJS mappings for backwards execution compatibility.

```bash
pnpm build # Compile via tsdown
pnpm dev   # Hot-reload transpilation watch mode
pnpm test  # CLI unit execution
```
