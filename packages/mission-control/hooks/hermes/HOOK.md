---
name: hermes
description: "Sync Hermes Agent lifecycle events to Better OpenClaw Mission Control dashboard"
homepage: https://github.com/bidewio/better-openclaw
metadata:
  {
    "openclaw":
      {
        "emoji": "☤",
        "events": ["gateway:startup"],
        "install": [{ "id": "user", "kind": "user", "label": "User-installed hook" }],
      },
  }
---

# Hermes Agent → Mission Control Integration

Bridges Hermes Agent lifecycle events to the Better OpenClaw Mission Control Convex backend for real-time task tracking and observability.

## How It Works

1. Hermes Agent processes a conversation turn (via CLI, Telegram, Discord, etc.)
2. The bridge captures lifecycle events (start, tool calls, file writes, completion, errors)
3. Events are POSTed to `POST /hermes/event` on the Mission Control Convex backend
4. Mission Control creates/updates tasks, logs messages, tracks tool usage and documents

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MISSION_CONTROL_URL` | `http://127.0.0.1:3211/hermes/event` | Mission Control webhook endpoint |
| `HERMES_API_URL` | `http://127.0.0.1:8642` | Hermes Agent API server |

### For Convex Cloud (Production)

```
MISSION_CONTROL_URL=https://your-project.convex.site/hermes/event
```

## Integration Methods

### Method 1: Hermes MCP Tool

Add better-openclaw as an MCP server in Hermes, which gives the agent access to the bridge:

```bash
hermes mcp add better-openclaw -- npx -y @better-openclaw/mcp
```

### Method 2: Programmatic Bridge (TypeScript/Node.js)

```typescript
import { createHermesBridge } from "./handler";

const bridge = createHermesBridge({
  webhookUrl: "https://your-project.convex.site/hermes/event",
});

// On conversation start
await bridge.onStart("run-123", {
  prompt: "Fix the login bug",
  model: "anthropic/claude-sonnet-4-5-20250929",
  platform: "telegram",
});

// On tool usage
await bridge.onToolCall("run-123", {
  toolName: "terminal",
  durationMs: 1500,
});

// On file write
await bridge.onDocument("run-123", {
  path: "src/auth.ts",
  content: "// fixed code...",
});

// On completion
await bridge.onEnd("run-123", {
  response: "Fixed the login bug by updating the session handler.",
});
```

### Method 3: Python Integration (Hermes Plugin)

```python
import httpx
import time
import uuid

WEBHOOK_URL = "https://your-project.convex.site/hermes/event"

def post_event(payload):
    httpx.post(WEBHOOK_URL, json=payload, timeout=5)

# On start
run_id = str(uuid.uuid4())
post_event({
    "runId": run_id,
    "action": "start",
    "agentId": "Hermes Agent",
    "prompt": "Fix the login bug",
    "source": "hermes",
    "model": "anthropic/claude-sonnet-4-5-20250929",
    "platform": "telegram",
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
})

# On tool call
post_event({
    "runId": run_id,
    "action": "progress",
    "agentId": "Hermes Agent",
    "message": "Using tool: terminal",
    "eventType": "tool_call",
    "toolName": "terminal",
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
})

# On completion
post_event({
    "runId": run_id,
    "action": "end",
    "agentId": "Hermes Agent",
    "response": "Fixed the login bug.",
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
})
```

## What It Tracks

| Event | Action | Mission Control Effect |
|-------|--------|----------------------|
| Conversation start | `start` | Creates task (status: in_progress) |
| Tool invocation | `progress` | Logs message + flags coding tools |
| File write | `document` | Creates document entry with type detection |
| Completion | `end` | Marks task done/review + logs duration |
| Error | `error` | Marks task for review with error details |

## Observability

When token/cost data is included in `progress` events, the bridge also records `agentEvents` for the observability dashboard:

```json
{
  "runId": "...",
  "action": "progress",
  "toolName": "terminal",
  "durationMs": 1500,
  "inputTokens": 2048,
  "outputTokens": 512
}
```

These appear in Mission Control's metrics: tool usage breakdown, cost timeline, and agent event history.
