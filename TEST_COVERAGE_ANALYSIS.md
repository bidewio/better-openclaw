# Test Coverage Analysis

## Current State

**Test framework:** Vitest
**Total test files:** 45
**Total passing tests:** 439 (core) + 35 (api, partial — 5 suites fail due to missing `zod` dep)
**Approximate file-level coverage:** ~7% of source files have dedicated tests

### Coverage by Package

| Package | Source Files | Test Files | Coverage |
|---------|-------------|-----------|----------|
| **core** | ~265 | 25 | 9% |
| **api** | ~23 | 11 | 48% |
| **cli** | ~9 | 2 | 22% |
| **db** | ~2 | 1 | 50% |
| **mcp** | ~15 | 2 | 13% |
| **mission-control** | ~44 | 3 | 7% |
| **web** | ~180+ | 2 | 1% |

---

## Priority 1 — Critical / Safety-Critical Gaps

### 1. SSRF Protection in Deploy Route (`packages/api/src/routes/deploy.ts`)

The deploy route contains hand-rolled SSRF protection that blocks private IPs, localhost variants, and internal hostnames. This is **security-critical** code with zero tests.

**Recommended tests:**
- Block all RFC 1918 ranges (10.x, 172.16–31.x, 192.168.x)
- Block link-local (169.254.x)
- Block localhost variants (127.0.0.1, ::1, `*.localhost`)
- Block internal hostnames (`.internal`, `.local`, `.svc.cluster.local`)
- Enforce HTTPS in production mode
- Allow legitimate external URLs
- Edge cases: IPv6-mapped IPv4, URL-encoded bypasses, DNS rebinding hostnames

### 2. Port Scanner (`packages/core/src/port-scanner.ts`)

Two-phase port availability check (TCP connect + bind) with port reassignment logic. A bug here silently breaks every generated stack.

**Recommended tests:**
- TCP connect detection (mock net.Socket)
- Bind check for OS-reserved ranges
- Inter-service port conflict detection (two services claiming same host port)
- Port reassignment algorithm (port + 1000, skip claimed)
- Fallback to random port after 100 failures
- Edge case: ports > 65535
- Socket cleanup on error/timeout paths

### 3. PostgreSQL Init Generator (`packages/core/src/generators/postgres-init.ts`)

Generates SQL `CREATE DATABASE` / `CREATE USER` / `GRANT` statements. Potential SQL injection vector if service names or passwords aren't sanitized.

**Recommended tests:**
- Correct SQL output for multiple services
- Password variable substitution uses env vars, not literals
- Service names with special characters are safe
- Empty service list produces no-op script

### 4. Deployer Orchestration (`packages/core/src/deployers/coolify.ts`, `dokploy.ts`)

Multi-step deployment pipelines (server discovery → project → service → env vars → deploy) with only `strip-host-ports.ts` tested.

**Recommended tests:**
- Hash-based compose change detection (skip deploy when unchanged)
- Environment variable parsing (multiline values, `=` in values, comments)
- Server discovery failure handling
- Project lookup vs creation branching
- Step status tracking and error reporting
- Dokploy source-type override logic (`raw` vs default `github`)

---

## Priority 2 — High-Impact Feature Gaps

### 5. Rate Limiting (`packages/api/src/middleware/rate-limit.ts`)

Two-tier rate limiting (global 30/min anon, 300/min keyed; generate 5/min anon, 10/min keyed) with env-var overrides.

**Recommended tests:**
- Counter increment and window expiration
- API key vs IP-based key selection
- `x-forwarded-for` header parsing (first IP extraction)
- 429 response with correct `Retry-After` header
- Env var hierarchical override (prefix-specific > global > default)
- Boundary: exactly at limit vs one over

### 6. Untested Generators (12 generators with zero tests)

| Generator | Risk | Key Logic |
|-----------|------|-----------|
| `cloud-init.ts` | High | Full cloud-init YAML with Docker install, compose embedding |
| `prometheus.ts` | High | Scrape config with per-service endpoint mapping |
| `grafana.ts` | High | Dashboard JSON with panel definitions, datasource config |
| `postgres-init.ts` | Critical | SQL generation (see Priority 1) |
| `get-shit-done.ts` | Medium | Shell + PowerShell script generation |
| `n8n-workflows.ts` | Medium | Workflow JSON with node connections |
| `native-services.ts` | Medium | Platform-specific install scripts (bash/PowerShell) |
| `openclaw-install-script.ts` | Medium | Installation script |
| `openclaw-json.ts` | Medium | Config JSON |
| `readme.ts` | Low | README template |
| `skills.ts` | Low | Skills manifest |
| `stack-manifest.ts` | Low | Stack metadata |

**Recommended approach:** Start with snapshot tests — generate output for known inputs and assert it matches. This catches regressions cheaply.

### 7. Framework Definitions (`packages/core/src/frameworks/`)

9 framework implementations (OpenClaw, NanoClaw, Claude Code, Codex, etc.) with only `registry.test.ts` covering the registry lookup. The frameworks contain complex logic:

- Environment variable aggregation from companion services
- Volume mount handling (bind vs named)
- Image variant selection
- Traefik label application
- Service dependency declarations

**Recommended tests:**
- Each framework's `buildServices()` produces valid Docker Compose service definitions
- Environment variable construction includes all expected keys
- Mandatory/recommended dependencies are correctly declared

---

## Priority 3 — Important Coverage Gaps

### 8. CLI Wizard (`packages/cli/src/wizard.ts`)

700+ line interactive wizard with complex branching. Hard to unit test due to interactive prompts, but the pure logic can be extracted and tested:

- Project directory name validation (kebab-case)
- Dependency auto-resolution logic
- Port conflict detection integration
- Conditional prompt visibility rules
- Skill pack filtering by selected services

### 9. CLI Deploy (`packages/cli/src/deploy.ts`)

- Compose file discovery and `.env` / `.env.example` fallback
- Project name derivation from directory path
- Provider validation
- Connection testing before deployment

### 10. Analytics Route (`packages/api/src/routes/analytics.ts`)

Complex aggregation with 11 parallel queries, JSONB unnesting, date bucketing, and feature percentage calculations. Bugs here produce silently wrong dashboard data.

### 11. Web Package (180+ files, 2 tests)

The web package has near-zero coverage. Priority areas:
- `app/api/generate/route.ts` (has test) and `app/api/skills-search/route.ts` (has test) — already covered
- Stack builder components (user-facing, complex state)
- Authentication flows

### 12. MCP Tools (`packages/mcp/src/`)

15 tool implementations with only 2 test files. The tools include generate, validate, resolve-dependencies, search-services — all user-facing MCP integrations.

---

## Quick Wins

These would provide the most value for the least effort:

1. **Snapshot tests for all generators** — Call each generator with a fixture config, snapshot the output. Catches regressions with ~5 lines per test.
2. **SSRF unit tests** — Extract the URL validation function and test it in isolation. Pure function, no mocking needed.
3. **Port scanner mocking** — Mock `net.Socket` and test the conflict detection/reassignment logic.
4. **Rate limit store tests** — The store (`rate-limit-store.ts`) already has tests; extend to cover the middleware integration.
5. **Framework `buildServices()` smoke tests** — Similar to preset smoke tests, call each framework and assert the output is valid compose YAML.

---

## Existing Strengths

The test suite has good patterns to build on:
- **Core composer/resolver/validator** have thorough tests covering edge cases
- **Snapshot tests** (`composer.snapshot.test.ts`) effectively catch regressions
- **Preset smoke tests** programmatically test all presets with generation + resolution
- **API route tests** (for tested routes) properly mock dependencies
- **Schema validation tests** cover Zod schema edge cases
