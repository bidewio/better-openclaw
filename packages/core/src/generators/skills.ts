import Handlebars from "handlebars";
import type { ResolverOutput } from "../types.js";

/**
 * Basic skill templates keyed by skillId.
 *
 * Templates use Handlebars `{{VAR}}` syntax. Variables are resolved from the
 * service's `openclawEnvVars` array at generation time.
 */
const skillTemplates: Record<string, string> = {
	"agent-browse": `---
name: agent-browse
description: "AI-optimized browser automation with snapshot + ref workflow for deterministic element targeting"
metadata:
  openclaw:
    emoji: "🌍"
---

# Agent Browser

AI-optimized headless browser available at \`{{AGENT_BROWSER_HOST}}\` with CDP on port \`{{AGENT_BROWSER_CDP_PORT}}\` and live viewport streaming on port \`{{AGENT_BROWSER_STREAM_PORT}}\`.

## Core Workflow: Snapshot → Reason → Act

Agent Browser uses a **ref-based workflow** designed for LLMs. Each interactive element gets a deterministic ref like \`@e1\`, \`@e2\` that you can target directly — no CSS selectors needed.

1. **Navigate:** \`agent-browser open https://example.com\`
2. **Snapshot:** \`agent-browser snapshot\` → returns accessibility tree with refs
3. **Reason:** Identify the target element by its ref (e.g. \`@e5\` is the search input)
4. **Act:** \`agent-browser click @e5\` or \`agent-browser type @e5 "search query"\`
5. **Verify:** \`agent-browser screenshot\` to capture the result

## Key Commands

| Command | Description |
|---------|-------------|
| \`agent-browser open <url>\` | Navigate to a URL |
| \`agent-browser snapshot\` | Get accessibility tree with @refs |
| \`agent-browser click @ref\` | Click an element by ref |
| \`agent-browser type @ref "text"\` | Type text into an input |
| \`agent-browser select @ref "value"\` | Select a dropdown option |
| \`agent-browser screenshot [--path file.png]\` | Capture viewport screenshot |
| \`agent-browser scroll down\\|up\` | Scroll the viewport |
| \`agent-browser wait <selector\\|ms>\` | Wait for element or time |
| \`agent-browser extract\` | Extract page content as clean text |
| \`agent-browser pdf [--path file.pdf]\` | Save page as PDF |

## Snapshot Output Example

\`\`\`
@e1 heading "Welcome to Example"
@e2 link "Sign In" [href="/login"]
@e3 input[text] "Search..." [placeholder]
@e4 button "Search"
@e5 link "Learn More" [href="/docs"]
\`\`\`

Each \`@ref\` is stable within a page state — use it directly: \`agent-browser click @e2\`

## Content Boundaries

Output is wrapped in boundary markers (\`---CONTENT_START---\` / \`---CONTENT_END---\`) to prevent prompt injection from page content. This is enabled by default.

## Session Persistence

\`\`\`bash
# Save/restore login state across sessions
agent-browser --session-name my-app open https://app.example.com
agent-browser --session-name my-app snapshot
\`\`\`

## Live Viewport Streaming

WebSocket stream at \`ws://{{AGENT_BROWSER_HOST}}:{{AGENT_BROWSER_STREAM_PORT}}\` for real-time viewport watching (pair browsing). Receives JPEG frames with metadata.

## Security

- **Domain allowlist:** Set \`AGENT_BROWSER_ALLOWED_DOMAINS\` to restrict navigation
- **Action policies:** JSON policy files to require confirmation for specific action categories
- **Content boundaries:** Prevent LLM prompt injection from page content
`,

	"redis-cache": `---
name: redis-cache
description: "Cache data and manage key-value state using Redis"
metadata:
  openclaw:
    emoji: "🔴"
---

# Redis Cache

Use Redis as a high-performance in-memory cache and key-value store.

## Connection Details

- **Host:** \`{{REDIS_HOST}}\`
- **Port:** \`{{REDIS_PORT}}\`

## Example Commands

### Set a value
\`\`\`bash
redis-cli -h {{REDIS_HOST}} -p {{REDIS_PORT}} -a $REDIS_PASSWORD SET mykey "myvalue"
\`\`\`

### Get a value
\`\`\`bash
redis-cli -h {{REDIS_HOST}} -p {{REDIS_PORT}} -a $REDIS_PASSWORD GET mykey
\`\`\`

### List all keys
\`\`\`bash
redis-cli -h {{REDIS_HOST}} -p {{REDIS_PORT}} -a $REDIS_PASSWORD KEYS "*"
\`\`\`

## Usage Notes

- Use Redis for caching frequently accessed data, session storage, and pub/sub messaging.
- Data is persisted to disk via RDB snapshots in the mounted volume.
- Password authentication is required.
`,

	"qdrant-memory": `---
name: qdrant-memory
description: "Store and retrieve vector embeddings for semantic search and RAG"
metadata:
  openclaw:
    emoji: "🧠"
---

# Qdrant Memory

Use Qdrant as a vector database for storing embeddings, enabling semantic search and retrieval-augmented generation (RAG).

## Connection Details

- **Host:** \`{{QDRANT_HOST}}\`
- **Port:** \`{{QDRANT_PORT}}\` (REST API)

## Example API Calls

### Create a collection
\`\`\`bash
curl -X PUT "http://{{QDRANT_HOST}}:{{QDRANT_PORT}}/collections/my_collection" \\
  -H "Content-Type: application/json" \\
  -d '{"vectors": {"size": 384, "distance": "Cosine"}}'
\`\`\`

### Upsert points
\`\`\`bash
curl -X PUT "http://{{QDRANT_HOST}}:{{QDRANT_PORT}}/collections/my_collection/points" \\
  -H "Content-Type: application/json" \\
  -d '{"points": [{"id": 1, "vector": [0.1, 0.2, ...], "payload": {"text": "hello"}}]}'
\`\`\`

### Search similar vectors
\`\`\`bash
curl -X POST "http://{{QDRANT_HOST}}:{{QDRANT_PORT}}/collections/my_collection/points/search" \\
  -H "Content-Type: application/json" \\
  -d '{"vector": [0.1, 0.2, ...], "limit": 5}'
\`\`\`

## Usage Notes

- Use 384-dimensional vectors for MiniLM-based embeddings or 1536 for OpenAI ada-002.
- Qdrant supports filtering, batch operations, and named vectors.
`,

	"n8n-trigger": `---
name: n8n-trigger
description: "Trigger and manage automation workflows using n8n"
metadata:
  openclaw:
    emoji: "🔄"
---

# n8n Workflow Trigger

Use n8n to create, trigger, and manage automation workflows via its REST API.

## Connection Details

- **Host:** \`{{N8N_HOST}}\`
- **Port:** \`{{N8N_PORT}}\`
- **Webhook URL:** \`{{N8N_WEBHOOK_URL}}\`

## Example API Calls

### Trigger a webhook workflow
\`\`\`bash
curl -X POST "{{N8N_WEBHOOK_URL}}webhook/<your-webhook-id>" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello from OpenClaw"}'
\`\`\`

### List workflows
\`\`\`bash
curl -X GET "http://{{N8N_HOST}}:{{N8N_PORT}}/api/v1/workflows" \\
  -H "Content-Type: application/json"
\`\`\`

### Activate a workflow
\`\`\`bash
curl -X PATCH "http://{{N8N_HOST}}:{{N8N_PORT}}/api/v1/workflows/<id>" \\
  -H "Content-Type: application/json" \\
  -d '{"active": true}'
\`\`\`

## Usage Notes

- Create workflows in the n8n UI at http://{{N8N_HOST}}:{{N8N_PORT}}.
- Webhook nodes allow external triggers from OpenClaw.
- n8n stores workflow state in PostgreSQL.
`,

	"ffmpeg-process": `---
name: ffmpeg-process
description: "Process media files using FFmpeg for transcoding, conversion, and manipulation"
metadata:
  openclaw:
    emoji: "🎬"
---

# FFmpeg Media Processing

Use FFmpeg for video/audio transcoding, format conversion, and media manipulation.

## Shared Directory

- **Media directory:** \`{{FFMPEG_SHARED_DIR}}\`

## Example Commands

### Convert video to MP4
\`\`\`bash
docker exec ffmpeg ffmpeg -i /data/input.avi -c:v libx264 -c:a aac /data/output.mp4
\`\`\`

### Extract audio from video
\`\`\`bash
docker exec ffmpeg ffmpeg -i /data/video.mp4 -vn -acodec libmp3lame /data/audio.mp3
\`\`\`

### Create thumbnail from video
\`\`\`bash
docker exec ffmpeg ffmpeg -i /data/video.mp4 -ss 00:00:05 -vframes 1 /data/thumb.jpg
\`\`\`

### Resize video
\`\`\`bash
docker exec ffmpeg ffmpeg -i /data/input.mp4 -vf scale=1280:720 /data/output_720p.mp4
\`\`\`

## Usage Notes

- Place input files in the shared media directory.
- FFmpeg runs as a sidecar container sharing a volume with OpenClaw.
- Output files appear in the same shared directory.
`,

	"minio-storage": `---
name: minio-storage
description: "Store and retrieve files using S3-compatible object storage"
metadata:
  openclaw:
    emoji: "💾"
---

# MinIO Object Storage

Use MinIO as S3-compatible object storage for files, assets, and backups.

## Connection Details

- **Host:** \`{{MINIO_HOST}}\`
- **API Port:** \`{{MINIO_PORT}}\`
- **Access Key:** Uses \`MINIO_ACCESS_KEY\` env var
- **Secret Key:** Uses \`MINIO_SECRET_KEY\` env var

## Example API Calls

### Create a bucket
\`\`\`bash
mc alias set local http://{{MINIO_HOST}}:{{MINIO_PORT}} $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
mc mb local/my-bucket
\`\`\`

### Upload a file
\`\`\`bash
mc cp /path/to/file.txt local/my-bucket/file.txt
\`\`\`

### Download a file
\`\`\`bash
mc cp local/my-bucket/file.txt /path/to/local/file.txt
\`\`\`

### List bucket contents
\`\`\`bash
mc ls local/my-bucket/
\`\`\`

## Usage Notes

- MinIO is fully S3-compatible—use any S3 SDK or CLI.
- Access the web console at http://{{MINIO_HOST}}:9001 for a visual file browser.
- Create separate buckets for different data types (assets, backups, uploads).
`,

	"browserless-browse": `---
name: browserless-browse
description: "Automate browser interactions, scrape web pages, and generate PDFs"
metadata:
  openclaw:
    emoji: "🌐"
---

# Browserless Browser Automation

Use Browserless for headless Chrome browser automation, web scraping, screenshots, and PDF generation.

## Connection Details

- **Host:** \`{{BROWSERLESS_HOST}}\`
- **Port:** \`{{BROWSERLESS_PORT}}\`
- **Token:** Uses \`BROWSERLESS_TOKEN\` env var

## Example API Calls

### Take a screenshot
\`\`\`bash
curl -X POST "http://{{BROWSERLESS_HOST}}:{{BROWSERLESS_PORT}}/screenshot?token=$BROWSERLESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com", "options": {"fullPage": true}}' \\
  --output screenshot.png
\`\`\`

### Generate a PDF
\`\`\`bash
curl -X POST "http://{{BROWSERLESS_HOST}}:{{BROWSERLESS_PORT}}/pdf?token=$BROWSERLESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}' \\
  --output page.pdf
\`\`\`

### Scrape page content
\`\`\`bash
curl -X POST "http://{{BROWSERLESS_HOST}}:{{BROWSERLESS_PORT}}/content?token=$BROWSERLESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'
\`\`\`

## Usage Notes

- Browserless manages a pool of Chrome instances (max concurrent sessions configured via env).
- Token authentication is required for all API calls.
- Supports Puppeteer and Playwright WebSocket connections.
`,

	"searxng-search": `---
name: searxng-search
description: "Search the web using a privacy-respecting metasearch engine"
metadata:
  openclaw:
    emoji: "🔍"
---

# SearXNG Web Search

Use SearXNG as a privacy-respecting metasearch engine to query the web.

## Connection Details

- **Host:** \`{{SEARXNG_HOST}}\`
- **Port:** \`{{SEARXNG_PORT}}\`

## Example API Calls

### Search the web
\`\`\`bash
curl "http://{{SEARXNG_HOST}}:{{SEARXNG_PORT}}/search?q=your+search+query&format=json"
\`\`\`

### Search with category filter
\`\`\`bash
curl "http://{{SEARXNG_HOST}}:{{SEARXNG_PORT}}/search?q=openai&categories=it&format=json"
\`\`\`

### Search with language filter
\`\`\`bash
curl "http://{{SEARXNG_HOST}}:{{SEARXNG_PORT}}/search?q=hello&language=en&format=json"
\`\`\`

## Usage Notes

- Always use \`format=json\` for machine-readable results.
- Available categories: general, images, videos, news, map, music, it, science, files.
- SearXNG aggregates results from many search engines without tracking.
`,

	"whisper-transcribe": `---
name: whisper-transcribe
description: "Transcribe audio files to text using Faster Whisper"
metadata:
  openclaw:
    emoji: "🎙️"
---

# Whisper Transcription

Use the Faster Whisper server for speech-to-text transcription.

## Connection Details

- **Host:** \`{{WHISPER_HOST}}\`
- **Port:** \`{{WHISPER_PORT}}\`

## Example API Calls

### Transcribe an audio file
\`\`\`bash
curl -X POST "http://{{WHISPER_HOST}}:{{WHISPER_PORT}}/v1/audio/transcriptions" \\
  -F "file=@/path/to/audio.mp3" \\
  -F "model=base"
\`\`\`

### Transcribe with language hint
\`\`\`bash
curl -X POST "http://{{WHISPER_HOST}}:{{WHISPER_PORT}}/v1/audio/transcriptions" \\
  -F "file=@/path/to/audio.wav" \\
  -F "model=base" \\
  -F "language=en"
\`\`\`

### Get available models
\`\`\`bash
curl "http://{{WHISPER_HOST}}:{{WHISPER_PORT}}/v1/models"
\`\`\`

## Usage Notes

- Supports MP3, WAV, FLAC, and other common audio formats.
- Model sizes: tiny, base, small, medium, large (larger = more accurate but slower).
- GPU acceleration significantly improves transcription speed.
`,

	"ollama-local-llm": `---
name: ollama-local-llm
description: "Run local language models for text generation, chat, and embeddings"
metadata:
  openclaw:
    emoji: "🦙"
---

# Ollama Local LLM

Use Ollama to run large language models locally for text generation, chat, and embeddings.

## Connection Details

- **Host:** \`{{OLLAMA_HOST}}\`
- **Port:** \`{{OLLAMA_PORT}}\`

## Example API Calls

### Generate text
\`\`\`bash
curl -X POST "http://{{OLLAMA_HOST}}:{{OLLAMA_PORT}}/api/generate" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "llama3.2", "prompt": "Explain quantum computing in simple terms"}'
\`\`\`

### Chat completion
\`\`\`bash
curl -X POST "http://{{OLLAMA_HOST}}:{{OLLAMA_PORT}}/api/chat" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "llama3.2", "messages": [{"role": "user", "content": "Hello!"}]}'
\`\`\`

### Pull a model
\`\`\`bash
curl -X POST "http://{{OLLAMA_HOST}}:{{OLLAMA_PORT}}/api/pull" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "llama3.2"}'
\`\`\`

### Generate embeddings
\`\`\`bash
curl -X POST "http://{{OLLAMA_HOST}}:{{OLLAMA_PORT}}/api/embeddings" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "nomic-embed-text", "prompt": "Hello world"}'
\`\`\`

## Usage Notes

- Pull models before first use (they are cached in the persistent volume).
- Recommended models: llama3.2 (general), codellama (code), nomic-embed-text (embeddings).
- GPU passthrough dramatically improves inference speed.
- The Ollama API is OpenAI-compatible at /v1/ endpoints.
`,

	"remotion-render": `---
name: remotion-render
description: "Create and render videos programmatically using React"
metadata:
  openclaw:
    emoji: "🎥"
---

# Remotion Video Rendering

Use Remotion Studio to create and render videos programmatically with React.

## Connection Details

- **Host:** \`{{REMOTION_HOST}}\`
- **Port:** \`{{REMOTION_PORT}}\`

## Example Usage

### Access the Studio UI
Open \`http://{{REMOTION_HOST}}:{{REMOTION_PORT}}\` in your browser to use the Remotion Studio visual editor.

### Render a video via CLI
\`\`\`bash
docker exec remotion npx remotion render src/index.tsx MyComposition out/video.mp4
\`\`\`

### Render with custom props
\`\`\`bash
docker exec remotion npx remotion render src/index.tsx MyComposition out/video.mp4 \\
  --props='{"title": "Hello World"}'
\`\`\`

## Usage Notes

- Define video compositions in React components.
- Remotion supports MP4, WebM, and GIF output formats.
- Use the Studio UI for previewing before rendering.
- Combine with FFmpeg for post-processing.
`,

	"lightpanda-browse": `---
name: lightpanda-browse
description: "Browse the web using the ultra-fast LightPanda headless browser via CDP"
metadata:
  openclaw:
    emoji: "🐼"
---

# LightPanda Browse

LightPanda is an ultra-fast headless browser available via CDP WebSocket at \`ws://{{LIGHTPANDA_HOST}}:{{LIGHTPANDA_PORT}}\`.

## Connect via Puppeteer

\`\`\`javascript
const browser = await puppeteer.connect({
  browserWSEndpoint: "ws://{{LIGHTPANDA_HOST}}:{{LIGHTPANDA_PORT}}"
});
const page = await browser.newPage();
await page.goto('https://example.com');
const content = await page.evaluate(() => document.body.innerText);
\`\`\`

## Key Advantages

- 9x less memory than Chrome (ideal for parallel scraping)
- 11x faster page loading
- Instant startup
- Full CDP compatibility with Puppeteer and Playwright
`,

	"steel-browse": `---
name: steel-browse
description: "Browse the web using Steel Browser API with session management and anti-detection"
metadata:
  openclaw:
    emoji: "🔥"
---

# Steel Browser

Steel provides a REST API at \`http://{{STEEL_HOST}}:{{STEEL_PORT}}\` for AI agent web automation.

## Create a Session

\`\`\`bash
curl -X POST http://{{STEEL_HOST}}:{{STEEL_PORT}}/v1/sessions \\
  -H "Content-Type: application/json" \\
  -d '{"blockAds": true}'
\`\`\`

## Scrape a Page

\`\`\`bash
curl -X POST http://{{STEEL_HOST}}:{{STEEL_PORT}}/v1/scrape \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com", "format": "markdown"}'
\`\`\`

## Features

- Session management with persistent cookies
- Anti-detection and stealth plugins
- Proxy support and IP rotation
- Auto CAPTCHA solving
- Puppeteer/Playwright/Selenium compatible
`,

	"code-sandbox": `---
name: code-sandbox
description: "Execute code safely in an isolated OpenSandbox container"
metadata:
  openclaw:
    emoji: "📦"
---

# Code Sandbox

Execute code safely in an isolated OpenSandbox container.

## Description

This skill provides secure, containerized code execution for AI agents. Code runs in ephemeral Docker containers with resource limits, network isolation, and automatic cleanup.

## Connection Details

- **Host:** \`{{OPENSANDBOX_HOST}}\`
- **Port:** \`{{OPENSANDBOX_PORT}}\`
- **Auth:** API key (auto-configured)

## Supported Languages

- Python 3.12
- JavaScript / TypeScript (Node.js 22)
- Java 21
- Go 1.24
- Bash

## Available Actions

### execute_code

Run a code snippet in a fresh sandbox.

**Parameters:**
- \`language\` (required): Programming language ("python", "javascript", "typescript", "java", "go", "bash")
- \`code\` (required): The code to execute
- \`timeout_seconds\` (optional): Max execution time (default: 60, max: 300)

**Returns:** stdout, stderr, exit_code, execution_time_ms

### execute_shell

Run a shell command in an existing or new sandbox.

**Parameters:**
- \`command\` (required): Shell command to execute
- \`sandbox_id\` (optional): Reuse an existing sandbox (for multi-step workflows)
- \`background\` (optional): Run in background (default: false)

**Returns:** stdout, stderr, exit_code

### upload_file

Upload a file to a sandbox for processing.

**Parameters:**
- \`sandbox_id\` (required): Target sandbox
- \`path\` (required): Destination path inside sandbox
- \`content\` (required): File content (text or base64 for binary)

### download_file

Download a file from a sandbox.

**Parameters:**
- \`sandbox_id\` (required): Source sandbox
- \`path\` (required): File path inside sandbox

**Returns:** File content

### list_sandboxes

List active sandboxes on this instance.

**Returns:** Array of { id, status, image, created_at, expires_at }

### terminate_sandbox

Terminate a running sandbox immediately.

**Parameters:**
- \`sandbox_id\` (required): Sandbox to terminate

### create_desktop

Create a GUI desktop sandbox with VNC access (for Homespace live preview).

**Parameters:**
- \`image\` (optional): Desktop image (default: "opensandbox/desktop:latest", also: "opensandbox/chrome:latest", "opensandbox/vscode:latest")
- \`resolution\` (optional): Screen resolution (default: "1280x800x24")

**Returns:** sandbox_id, vnc_endpoint (port 5900), novnc_url (port 6080 WebSocket), devtools_url (port 9222, chrome only)

### get_preview_url

Get the browser-accessible noVNC URL for an existing desktop sandbox.

**Parameters:**
- \`sandbox_id\` (required): Desktop sandbox ID

**Returns:** novnc_url (embeddable in iframe), vnc_endpoint, status

## Examples

### Run Python code

\`\`\`bash
curl -X POST http://{{OPENSANDBOX_HOST}}:{{OPENSANDBOX_PORT}}/v1/sandboxes \\
  -H "Authorization: Bearer $OPENSANDBOX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"image": "opensandbox/code-interpreter:python"}'
\`\`\`

### Execute code in a sandbox

\`\`\`bash
curl -X POST http://{{OPENSANDBOX_HOST}}:{{OPENSANDBOX_PORT}}/v1/sandboxes/{id}/code \\
  -H "Authorization: Bearer $OPENSANDBOX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"language": "python", "code": "print(42 * 42)"}'
\`\`\`

## Configuration

- **Default timeout:** 60 seconds
- **Max concurrent sandboxes:** Determined by VPS RAM
- **Idle cleanup:** Sandboxes with no activity for 30 minutes are auto-terminated
- **Network:** Bridge mode (isolated from host services)
- **Security:** gVisor runtime, capability dropping, PID limits

## Limitations

- No persistent storage between sandbox sessions (ephemeral by design)
- No GPU access (CPU-only execution)
- No outbound network access by default (egress blocked)
- Max 512 PIDs per sandbox (fork bomb protection)
- Memory capped per sandbox (default 512MB)
`,

	"mem0-memory": `---
name: mem0-memory
description: "Store and retrieve long-term memories for AI agents using Mem0"
metadata:
  openclaw:
    emoji: "🧠"
---

# Mem0 AI Memory

Use Mem0 as a long-term memory layer for AI agents. Mem0 automatically extracts, stores, and retrieves memories across conversations using pgvector embeddings and Neo4j knowledge graphs.

## Connection Details

- **Host:** \`{{MEM0_HOST}}\`
- **Port:** \`{{MEM0_PORT}}\`

## Example API Calls

### Add a memory
\`\`\`bash
curl -X POST "http://{{MEM0_HOST}}:{{MEM0_PORT}}/v1/memories/" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "I prefer dark mode in all applications"}], "user_id": "agent-1"}'
\`\`\`

### Search memories
\`\`\`bash
curl -X POST "http://{{MEM0_HOST}}:{{MEM0_PORT}}/v1/memories/search/" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "What are the user preferences?", "user_id": "agent-1"}'
\`\`\`

### Get all memories for a user
\`\`\`bash
curl "http://{{MEM0_HOST}}:{{MEM0_PORT}}/v1/memories/?user_id=agent-1"
\`\`\`

### Delete a memory
\`\`\`bash
curl -X DELETE "http://{{MEM0_HOST}}:{{MEM0_PORT}}/v1/memories/<memory_id>/"
\`\`\`

## Usage Notes

- Mem0 automatically extracts facts and preferences from conversation messages.
- Memories are stored as vector embeddings in pgvector and as entity relationships in Neo4j.
- Use \`user_id\` to isolate memories per agent or per conversation context.
- Mem0 handles deduplication and conflict resolution automatically.
`,

	"memu-memory": `---
name: memu-memory
description: "Persistent memory framework for proactive AI agents using MemU"
metadata:
  openclaw:
    emoji: "🧠"
---

# MemU Persistent Memory

Use MemU as a persistent memory framework for 24/7 proactive AI agents. MemU extracts structured memory from multimodal inputs and organizes it into a hierarchical knowledge graph.

## Connection Details

- **Host:** \`{{MEMU_HOST}}\`
- **Port:** \`{{MEMU_PORT}}\`

## Example API Calls

### Store a memory
\`\`\`bash
curl -X POST "http://{{MEMU_HOST}}:{{MEMU_PORT}}/api/v1/memories" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "User prefers TypeScript over JavaScript", "agent_id": "agent-1", "type": "preference"}'
\`\`\`

### Recall memories
\`\`\`bash
curl -X POST "http://{{MEMU_HOST}}:{{MEMU_PORT}}/api/v1/recall" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "What programming languages does the user prefer?", "agent_id": "agent-1"}'
\`\`\`

### Get memory graph
\`\`\`bash
curl "http://{{MEMU_HOST}}:{{MEMU_PORT}}/api/v1/graph?agent_id=agent-1"
\`\`\`

## Usage Notes

- MemU organizes memories into a hierarchical knowledge graph backed by pgvector.
- Supports multimodal inputs (text, images, structured data).
- Use \`agent_id\` to partition memories across different agents.
`,

	"hindsight-memory": `---
name: hindsight-memory
description: "Agent memory with Retain/Recall/Reflect operations using Hindsight"
metadata:
  openclaw:
    emoji: "🧠"
---

# Hindsight Agent Memory

Use Hindsight for agent memory with three core operations: Retain (store), Recall (retrieve), and Reflect (synthesize). Supports multi-strategy retrieval including semantic, keyword, graph, and temporal search.

## Connection Details

- **Host:** \`{{HINDSIGHT_HOST}}\`
- **Port:** \`{{HINDSIGHT_API_PORT}}\`

## Example API Calls

### Retain (store a memory)
\`\`\`bash
curl -X POST "http://{{HINDSIGHT_HOST}}:{{HINDSIGHT_API_PORT}}/api/v1/retain" \\
  -H "Content-Type: application/json" \\
  -d '{"namespace": "agent-1", "content": "The deployment uses Kubernetes on AWS EKS", "metadata": {"source": "conversation"}}'
\`\`\`

### Recall (retrieve memories)
\`\`\`bash
curl -X POST "http://{{HINDSIGHT_HOST}}:{{HINDSIGHT_API_PORT}}/api/v1/recall" \\
  -H "Content-Type: application/json" \\
  -d '{"namespace": "agent-1", "query": "What infrastructure is used?", "strategies": ["semantic", "keyword"], "limit": 5}'
\`\`\`

### Reflect (synthesize memories)
\`\`\`bash
curl -X POST "http://{{HINDSIGHT_HOST}}:{{HINDSIGHT_API_PORT}}/api/v1/reflect" \\
  -H "Content-Type: application/json" \\
  -d '{"namespace": "agent-1", "query": "Summarize all infrastructure decisions"}'
\`\`\`

## MCP Integration

Hindsight also exposes an MCP server. Configure your agent to connect via:
\`\`\`
http://{{HINDSIGHT_HOST}}:{{HINDSIGHT_API_PORT}}/mcp
\`\`\`

## Usage Notes

- Use namespaces to isolate memories per agent, project, or session.
- Retrieval strategies: semantic (embedding similarity), keyword (BM25), graph (entity relationships), temporal (time-based).
- The Reflect operation uses LLM-powered synthesis to generate insights from stored memories.
`,

	"chromadb-memory": `---
name: chromadb-memory
description: "Store and retrieve vector embeddings using ChromaDB"
metadata:
  openclaw:
    emoji: "🎨"
---

# ChromaDB Vector Memory

Use ChromaDB as a vector database for storing embeddings, enabling semantic search and retrieval-augmented generation (RAG).

## Connection Details

- **Host:** \`{{CHROMADB_HOST}}\`
- **Port:** \`{{CHROMADB_PORT}}\`

## Example API Calls

### Create a collection
\`\`\`bash
curl -X POST "http://{{CHROMADB_HOST}}:{{CHROMADB_PORT}}/api/v1/collections" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my_collection", "metadata": {"hnsw:space": "cosine"}}'
\`\`\`

### Add documents
\`\`\`bash
curl -X POST "http://{{CHROMADB_HOST}}:{{CHROMADB_PORT}}/api/v1/collections/<collection_id>/add" \\
  -H "Content-Type: application/json" \\
  -d '{"ids": ["doc1"], "documents": ["Hello world"], "metadatas": [{"source": "test"}]}'
\`\`\`

### Query similar documents
\`\`\`bash
curl -X POST "http://{{CHROMADB_HOST}}:{{CHROMADB_PORT}}/api/v1/collections/<collection_id>/query" \\
  -H "Content-Type: application/json" \\
  -d '{"query_texts": ["greeting"], "n_results": 5}'
\`\`\`

## Usage Notes

- ChromaDB can auto-generate embeddings from documents if configured with an embedding function.
- Supports metadata filtering on queries for precise retrieval.
- Collections are isolated namespaces for different data domains.
`,

	"weaviate-memory": `---
name: weaviate-memory
description: "Store and search vectors with hybrid search using Weaviate"
metadata:
  openclaw:
    emoji: "🔷"
---

# Weaviate Vector Memory

Use Weaviate for vector storage with built-in hybrid search (combining vector similarity and keyword/BM25 search) and a GraphQL API.

## Connection Details

- **Host:** \`{{WEAVIATE_HOST}}\`
- **Port:** \`{{WEAVIATE_PORT}}\`

## Example API Calls

### Create a class (schema)
\`\`\`bash
curl -X POST "http://{{WEAVIATE_HOST}}:{{WEAVIATE_PORT}}/v1/schema" \\
  -H "Content-Type: application/json" \\
  -d '{"class": "Document", "vectorizer": "none", "properties": [{"name": "content", "dataType": ["text"]}]}'
\`\`\`

### Add an object with vector
\`\`\`bash
curl -X POST "http://{{WEAVIATE_HOST}}:{{WEAVIATE_PORT}}/v1/objects" \\
  -H "Content-Type: application/json" \\
  -d '{"class": "Document", "properties": {"content": "Hello world"}, "vector": [0.1, 0.2, 0.3]}'
\`\`\`

### Hybrid search (vector + keyword)
\`\`\`bash
curl -X POST "http://{{WEAVIATE_HOST}}:{{WEAVIATE_PORT}}/v1/graphql" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "{ Get { Document(hybrid: { query: \\"hello\\" alpha: 0.5 }) { content _additional { score } } } }"}'
\`\`\`

## Usage Notes

- Weaviate supports hybrid search combining BM25 keyword search with vector similarity.
- Use the alpha parameter to balance between keyword (0.0) and vector (1.0) search.
- GraphQL API provides flexible querying with filters, aggregations, and cross-references.
`,
};

/**
 * Generates SKILL.md files for each service that has skills defined.
 *
 * Returns a map of file paths (relative to project root) to file contents.
 * Handlebars is used to replace `{{VAR}}` placeholders with actual values
 * from each service's `openclawEnvVars`.
 */
export function generateSkillFiles(resolved: ResolverOutput): Record<string, string> {
	const files: Record<string, string> = {};

	for (const { definition } of resolved.services) {
		if (definition.skills.length === 0) continue;

		// Build a variable map from openclawEnvVars for Handlebars
		const vars: Record<string, string> = {};
		for (const envVar of definition.openclawEnvVars) {
			// Resolve ${REFERENCES} to the default value (just strip the ${} wrapper)
			const val = envVar.defaultValue.startsWith("${")
				? envVar.defaultValue.slice(2, -1)
				: envVar.defaultValue;
			vars[envVar.key] = val;
		}

		for (const skill of definition.skills) {
			const template = skillTemplates[skill.skillId];
			if (!template) {
				// Generate a generic skill file if no template exists
				const generic = generateGenericSkill(
					skill.skillId,
					definition.name,
					definition.icon,
					definition.description,
					vars,
				);
				files[`openclaw/workspace/skills/${skill.skillId}/SKILL.md`] = generic;
				continue;
			}

			const compiled = Handlebars.compile(template, { noEscape: true });
			const rendered = compiled(vars);
			files[`openclaw/workspace/skills/${skill.skillId}/SKILL.md`] = rendered;
		}
	}

	return files;
}

/**
 * Generate a generic SKILL.md for skills that don't have a dedicated template.
 */
function generateGenericSkill(
	skillId: string,
	serviceName: string,
	icon: string,
	description: string,
	vars: Record<string, string>,
): string {
	const title = skillId
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");

	const envSection = Object.entries(vars)
		.map(([key, value]) => `- **${key}:** \`${value}\``)
		.join("\n");

	return `---
name: ${skillId}
description: "${description}"
metadata:
  openclaw:
    emoji: "${icon}"
---

# ${title}

Interact with ${serviceName} through this skill.

## Connection Details

${envSection || "No specific connection variables configured."}

## Usage Notes

- This skill provides OpenClaw access to ${serviceName}.
- Refer to the service documentation for available API endpoints.
`;
}
