---
name: hermes-agent
description: "Interact with Hermes Agent's OpenAI-compatible API for multi-model conversations, skill management, and scheduled tasks"
metadata:
  openclaw:
    emoji: "☤"
---

# Hermes Agent

Self-improving AI agent by Nous Research with a built-in learning loop, skills system, and multi-platform messaging gateway. The API server is available at `http://{{HERMES_HOST}}:{{HERMES_API_PORT}}`.

## API Server (OpenAI-Compatible)

Hermes exposes an OpenAI-compatible API at port `{{HERMES_API_PORT}}`. Any tool or frontend that speaks the OpenAI Chat Completions format can connect directly.

### Chat Completions

```bash
curl http://{{HERMES_HOST}}:{{HERMES_API_PORT}}/v1/chat/completions \
  -H "Authorization: Bearer {{HERMES_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "default",
    "messages": [{"role": "user", "content": "Hello Hermes"}]
  }'
```

### Responses API (Stateful)

```bash
# Create a stateful response
curl -X POST http://{{HERMES_HOST}}:{{HERMES_API_PORT}}/v1/responses \
  -H "Authorization: Bearer {{HERMES_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{"model": "default", "input": "Research the latest AI papers"}'

# Retrieve a stored response
curl http://{{HERMES_HOST}}:{{HERMES_API_PORT}}/v1/responses/{response_id} \
  -H "Authorization: Bearer {{HERMES_API_KEY}}"
```

### Health Check

```bash
curl http://{{HERMES_HOST}}:{{HERMES_API_PORT}}/health
```

## Connecting OpenAI-Compatible Frontends

Hermes works with Open WebUI, LobeChat, LibreChat, and other OpenAI-compatible UIs:

- **Base URL:** `http://{{HERMES_HOST}}:{{HERMES_API_PORT}}/v1`
- **API Key:** Use the value of `HERMES_API_KEY`
- **Model:** `default` (routes to the configured LLM)

## Infrastructure Generation via MCP

Hermes supports MCP (Model Context Protocol) clients. Connect better-openclaw as an MCP server to generate Docker infrastructure from natural language:

```bash
# Inside the Hermes container or CLI
hermes mcp add better-openclaw -- npx -y @better-openclaw/mcp
```

Then ask Hermes:
> "Create a research stack with Qdrant, SearXNG, and Browserless"

Hermes will call `suggest-services` -> `resolve-dependencies` -> `validate-stack` -> `generate-stack` through the MCP bridge.

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `suggest-services` | Find services matching a natural language query |
| `resolve-dependencies` | Resolve service dependencies and detect conflicts |
| `validate-stack` | Validate a service combination before generation |
| `generate-stack` | Generate complete Docker Compose + env files |
| `list-skill-packs` | Browse curated skill pack bundles |

## Webhook Receiver

Hermes also listens for webhooks on port `{{HERMES_WEBHOOK_PORT}}` (default 8644). GitHub, GitLab, and custom webhooks can be configured to trigger agent actions.

## Tips for AI Agents

- Use the `/v1/chat/completions` endpoint for stateless single-turn interactions
- Use the `/v1/responses` endpoint when you need conversation continuity across requests
- The `model` field in requests is informational — Hermes routes to its configured LLM provider
- Set `HERMES_API_KEY` in your `.env` to secure the API server in production
- Hermes has its own persistent memory and skills — it learns and improves across sessions
