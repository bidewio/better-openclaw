# @better-openclaw/bridge

Stack management sidecar for deployed OpenClaw stacks. Provides REST endpoints for inspecting service status, reading logs, and executing management commands (restart, stop, start, scale). Syncs live status to Mission Control via periodic heartbeat.

## Architecture

```
  Mission Control UI (:3660)
        |
    Convex Backend (cloud / self-hosted)
        ^ heartbeat        v command relay (Convex action -> fetch)
        |                   |
   Bridge Sidecar (:3457)   <- BRIDGE_TOKEN auth
        |
   Docker Socket (/var/run/docker.sock)
        |
   postgresql | redis | n8n | ollama | ...
```

The bridge runs **alongside** the Docker Compose stack on the same host. It communicates with Docker via the Unix socket and syncs state to Mission Control's Convex backend over HTTP.

## Endpoints

### Data (Read)

| Endpoint | Returns |
|---|---|
| `GET /health` | Bridge status + Docker engine connectivity |
| `GET /stack` | Stack manifest + live service count/status |
| `GET /stack/services` | All services with state, health, ports, image |
| `GET /stack/services/:id` | Single service detail + healthcheck output |
| `GET /stack/services/:id/logs` | Tailed logs (`?tail=100`) |
| `GET /containers/:id` | Container detail by ID |
| `GET /containers/:id/logs` | Container logs by ID |
| `GET /containers/:id/stats` | CPU, memory, network I/O |
| `GET /config/env` | Env vars with secrets redacted |
| `GET /config/compose` | Raw docker-compose.yml |

### Commands (Write)

| Endpoint | Action |
|---|---|
| `POST /commands/restart` | Restart a container (`{ serviceId }`) |
| `POST /commands/stop` | Stop a container |
| `POST /commands/start` | Start a stopped container |
| `POST /commands/scale` | Scale a service (`{ serviceId, replicas }`) |
| `POST /commands/pull` | Pull latest images (`{ serviceIds? }`) |
| `POST /commands/recreate` | Recreate containers (`{ serviceIds? }`) |
| `POST /commands/prune` | Prune stopped containers and dangling images |
| `PUT /config/env` | Update .env entries (`{ entries: Record<string,string> }`) |

### Task Relay

| Endpoint | Action |
|---|---|
| `POST /tasks/approve` | Relay task approval to Convex (`{ taskId }`) |
| `POST /tasks/dispatch` | Create a new task in Convex (`{ title, description }`) |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BRIDGE_PORT` | No | Port to listen on (default: `3457`) |
| `PROJECT_NAME` | Yes | Docker Compose project name |
| `PROJECT_DIR` | Yes | Path to project root inside container |
| `DOCKER_SOCKET` | No | Docker socket path (default: `/var/run/docker.sock`) |
| `BRIDGE_TOKEN` | Yes | Shared secret for API authentication |
| `CONVEX_URL` | No | Convex backend URL for heartbeat sync |
| `FLEET_INSTANCE_ID` | No | Fleet instance ID in Convex |

## Authentication

All endpoints (except `GET /health`) require a `BRIDGE_TOKEN` via the `Authorization: Bearer <token>` header.

In development mode (no `BRIDGE_TOKEN` set), all requests are allowed.

The token is auto-generated during stack generation and stored in the `.env` file.

## Heartbeat

When `CONVEX_URL` and `FLEET_INSTANCE_ID` are set, the bridge pushes a status heartbeat to Convex every 30 seconds:

- Overall stack status (`online` / `degraded` / `offline`)
- Per-service status map (container state + health)
- Config hash (SHA-256 of `.env` + `docker-compose.yml` for drift detection)

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm --filter @better-openclaw/bridge test

# Build
pnpm --filter @better-openclaw/bridge build
```

## Docker

The bridge is deployed as a Docker container with the Docker socket mounted:

```yaml
bridge:
  image: ghcr.io/bidewio/bridge:latest
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - .:/project:ro
  environment:
    - PROJECT_NAME=${COMPOSE_PROJECT_NAME}
    - PROJECT_DIR=/project
    - BRIDGE_TOKEN=${BRIDGE_TOKEN}
  restart: unless-stopped
```

## Security

- Port is not exposed to the host by default (internal Docker network only)
- All write operations require BRIDGE_TOKEN authentication
- `GET /config/env` redacts values for keys matching `PASSWORD`, `SECRET`, `TOKEN`, `KEY`, `CREDENTIAL`
- Docker socket provides full container management — restrict access accordingly
