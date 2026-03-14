# @better-openclaw/api

A scalable, rate-limited REST API bridging web clients, agents, and CLIs to the core generation engine. It enables external applications to programmatically scaffold and download production-ready AI agent Docker Compose stacks with support for 8 agent frameworks.

## Available Endpoints

The API is mounted at `/api/v1`.

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Application health check |
| `GET`  | `/services` | List all available Docker services. Extensible with `?category=` or `?maturity=` filters. |
| `GET`  | `/skills` | List all AI skill packs (`SKILL.md` collections). Filter using `?services=id1,id2`. |
| `GET`  | `/presets` | List predefined configurations (minimal, creator, devops, researcher, etc.) |
| `POST` | `/validate` | Validates an incoming stack generation payload. Accepts optional `primaryFramework` and `companionFrameworks`. |
| `POST` | `/generate` | Core endpoint to generate the stack. Expects `GenerationInput` matching the core specifications. Accepts `primaryFramework` (one of 8 frameworks) and `companionFrameworks` (array). |
| `POST` | `/deploy/test` | Test connection to a PaaS instance (Dokploy/Coolify). |
| `POST` | `/deploy` | Deploy a compose stack to a PaaS provider (relay). |
| `GET`  | `/deploy/providers` | List available PaaS deployment providers. |
| `GET`  | `/openapi.json` | Dynamic OpenAPI 3.1 specification schema. |

### Generation Output Formats (`POST /generate`)

The generation endpoint dynamically formats its output using standard exact HTTP semantics:

- **JSON (Default):** Returns `{ files: Record<string, string>, metadata: { ... } }`.
- **Complete Payload:** Pass `?format=complete` or `Accept: application/vnd.openclaw.complete+json` to return `{ formatVersion: "1", input, files, metadata }`. The `input` object contains exactly what was parsed for reproducible generation hashes.
- **Binary Archive (ZIP):** Add `Accept: application/zip` or `?format=zip` to receive a compressed binary `.zip` containing the entire filesystem tree.

### Deploy Relay (`POST /deploy`)

The deploy endpoints act as a server-side relay between the web UI and the user's self-hosted PaaS instance to avoid browser CORS restrictions. The API never stores API keys -- they are passed through to the target PaaS in a single request.

```bash
# Test PaaS connection
curl -X POST http://localhost:3456/api/v1/deploy/test \
  -H "Content-Type: application/json" \
  -d '{"provider":"dokploy","instanceUrl":"https://dokploy.example.com","apiKey":"..."}'

# Deploy a stack
curl -X POST http://localhost:3456/api/v1/deploy \
  -H "Content-Type: application/json" \
  -d '{"provider":"dokploy","instanceUrl":"https://...","apiKey":"...","projectName":"my-stack","composeYaml":"...","envContent":"..."}'
```

## Security & Rate Limiting

This API exposes intense computational operations. It enforces multi-tier rate limiting using Redis/Upstash (or in-memory cache fallbacks):

| Tier | Window (ms) | `GET` Limits | `POST /generate` Limits |
|------|-------------|--------------|-------------------------|
| **Anonymous IP** | 60,000 (1 min) | 30 requests | 5 generations |
| **Authenticated (`X-API-Key`)** | 60,000 (1 min) | 300 requests | 10 generations |

Clients exceeding limits receive an HTTP `429 Too Many Requests` holding a `Retry-After` header. Rate limiting stats are embedded in standard headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

## Deployment

The API is fully containerized. A standard deployment wraps it securely with Traefik or Caddy.

```bash
# Local development server (port 3456)
pnpm dev

# Build for server runtime
pnpm build
pnpm start
```

### Environment Configuration

| Variable | Default Node | Importance |
|----------|--------------|------------|
| `PORT` | 3456 | |
| `RATE_LIMIT_MAX_ANON` | 30 | Base API limit |
| `RATE_LIMIT_GENERATE_MAX_ANON` | 5 | Generation limit |
| `NEXT_PUBLIC_CLAWEXA_DEPLOY_URL` | none | Used by UI clients |
