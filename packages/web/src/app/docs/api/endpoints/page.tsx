import Link from "next/link";
import { docsStats } from "@/lib/docs-stats";

export const metadata = {
	title: "API Endpoints — better-openclaw Docs",
	description:
		"Complete REST API endpoint reference for better-openclaw. All 7 endpoints with request/response examples.",
};

const healthResponseExample = `{
  "ok": true,
  "data": {
    "status": "healthy",
    "version": "1.4.2",
    "uptime": 86400,
    "services": ${docsStats.serviceCount},
    "skillPacks": ${docsStats.skillPackCount},
    "presets": ${docsStats.presetCount}
  }
}`;

const skillsResponseExample = `{
  "ok": true,
  "data": {
    "total": ${docsStats.skillPackCount},
    "skillPacks": [
      {
        "id": "researcher",
        "name": "Researcher",
        "description": "Web search, content extraction, and citation skills",
        "requiredServices": ["searxng", "browserless"],
        "optionalServices": ["qdrant"],
        "skills": [
          "web-search",
          "content-extract",
          "citation-builder",
          "fact-check"
        ]
      }
      // ... more skill packs
    ]
  }
}`;

export default function EndpointsPage() {
	return (
		<>
			<h1>API Endpoints</h1>
			<p>
				Full reference for all REST API endpoints. All paths are relative to the base URL{" "}
				<code>/api/v1</code>. See the <Link href="/docs/api">API Overview</Link> for authentication
				and rate limiting details.
			</p>

			<hr />

			<h2 id="health">
				<code>GET /api/v1/health</code> — Health Check
			</h2>
			<p>Returns the API status. Use for monitoring and uptime checks.</p>
			<h3>Request</h3>
			<pre>
				<code>{`curl https://better-openclaw.dev/api/v1/health`}</code>
			</pre>
			<h3>
				Response <code>200 OK</code>
			</h3>
			<pre>
				<code>{healthResponseExample}</code>
			</pre>

			<hr />

			<h2 id="services">
				<code>GET /api/v1/services</code> — List Services
			</h2>
			<p>Returns all available companion services grouped by category.</p>
			<h3>Query Parameters</h3>
			<table>
				<thead>
					<tr>
						<th>Parameter</th>
						<th>Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>category</code>
						</td>
						<td>string</td>
						<td>Filter by category ID</td>
					</tr>
					<tr>
						<td>
							<code>tag</code>
						</td>
						<td>string</td>
						<td>Filter by tag</td>
					</tr>
					<tr>
						<td>
							<code>maturity</code>
						</td>
						<td>string</td>
						<td>
							Filter by maturity: <code>stable</code>, <code>beta</code>, <code>experimental</code>
						</td>
					</tr>
				</tbody>
			</table>
			<h3>Request</h3>
			<pre>
				<code>{`curl https://better-openclaw.dev/api/v1/services?category=database`}</code>
			</pre>
			<h3>
				Response <code>200 OK</code>
			</h3>
			<pre>
				<code>{`{
  "ok": true,
  "data": {
    "total": 8,
    "services": [
      {
        "id": "qdrant",
        "name": "Qdrant",
        "description": "Vector database for embeddings and similarity search",
        "category": "database",
        "image": "qdrant/qdrant",
        "imageTag": "latest",
        "maturity": "stable",
        "ports": [{ "host": 6333, "container": 6333 }],
        "requires": [],
        "conflictsWith": [],
        "minMemoryMB": 256,
        "tags": ["vector", "embeddings", "rag"]
      }
      // ... more services
    ]
  }
}`}</code>
			</pre>

			<hr />

			<h2 id="skills">
				<code>GET /api/v1/skills</code> — List Skill Packs
			</h2>
			<p>Returns all available skill packs with their descriptions and required services.</p>
			<h3>Request</h3>
			<pre>
				<code>{`curl https://better-openclaw.dev/api/v1/skills`}</code>
			</pre>
			<h3>
				Response <code>200 OK</code>
			</h3>
			<pre>
				<code>{skillsResponseExample}</code>
			</pre>

			<hr />

			<h2 id="presets">
				<code>GET /api/v1/presets</code> — List Presets
			</h2>
			<p>Returns all preset configurations.</p>
			<h3>Request</h3>
			<pre>
				<code>{`curl https://better-openclaw.dev/api/v1/presets`}</code>
			</pre>
			<h3>
				Response <code>200 OK</code>
			</h3>
			<pre>
				<code>{`{
  "ok": true,
  "data": {
    "presets": [
      {
        "id": "minimal",
        "name": "Minimal",
        "description": "OpenClaw + Redis for lightweight experimentation",
        "services": ["redis"],
        "skills": ["memory"]
      },
      {
        "id": "researcher",
        "name": "Researcher",
        "description": "Web research and RAG pipeline",
        "services": ["qdrant", "searxng", "browserless", "redis"],
        "skills": ["researcher", "memory"]
      }
      // ... more presets
    ]
  }
}`}</code>
			</pre>

			<hr />

			<h2 id="preset-detail">
				<code>GET /api/v1/presets/:name</code> — Get Preset Detail
			</h2>
			<p>
				Returns detailed information about a specific preset, including the full service and skill
				pack configuration.
			</p>
			<h3>Path Parameters</h3>
			<table>
				<thead>
					<tr>
						<th>Parameter</th>
						<th>Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>name</code>
						</td>
						<td>string</td>
						<td>
							Preset ID (e.g. <code>researcher</code>, <code>devops</code>)
						</td>
					</tr>
				</tbody>
			</table>
			<h3>Request</h3>
			<pre>
				<code>{`curl https://better-openclaw.dev/api/v1/presets/researcher`}</code>
			</pre>
			<h3>
				Response <code>200 OK</code>
			</h3>
			<pre>
				<code>{`{
  "ok": true,
  "data": {
    "id": "researcher",
    "name": "Researcher",
    "description": "Web research and RAG pipeline",
    "services": [
      { "id": "qdrant", "name": "Qdrant", "category": "database" },
      { "id": "searxng", "name": "SearXNG", "category": "search" },
      { "id": "browserless", "name": "Browserless", "category": "automation" },
      { "id": "redis", "name": "Redis", "category": "cache" }
    ],
    "skills": [
      { "id": "researcher", "name": "Researcher", "skillCount": 4 },
      { "id": "memory", "name": "Memory", "skillCount": 3 }
    ],
    "estimatedMemoryMB": 2048
  }
}`}</code>
			</pre>
			<h3>
				Response <code>404 Not Found</code>
			</h3>
			<pre>
				<code>{`{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Preset 'invalid-preset' does not exist"
  }
}`}</code>
			</pre>

			<hr />

			<h2 id="validate">
				<code>POST /api/v1/validate</code> — Validate Configuration
			</h2>
			<p>
				Validates a stack configuration without generating any files. Useful for checking for
				conflicts, missing dependencies, and invalid options before generating.
			</p>
			<h3>Request Body</h3>
			<table>
				<thead>
					<tr>
						<th>Field</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>services</code>
						</td>
						<td>string[]</td>
						<td>No</td>
						<td>Service IDs to include</td>
					</tr>
					<tr>
						<td>
							<code>skills</code>
						</td>
						<td>string[]</td>
						<td>No</td>
						<td>Skill pack IDs</td>
					</tr>
					<tr>
						<td>
							<code>preset</code>
						</td>
						<td>string</td>
						<td>No</td>
						<td>Preset name (alternative to services + skills)</td>
					</tr>
					<tr>
						<td>
							<code>proxy</code>
						</td>
						<td>string</td>
						<td>No</td>
						<td>
							Proxy type: <code>caddy</code>, <code>traefik</code>, <code>nginx</code>
						</td>
					</tr>
				</tbody>
			</table>
			<h3>Request</h3>
			<pre>
				<code>{`curl -X POST https://better-openclaw.dev/api/v1/validate \\
  -H "Authorization: Bearer $OPENCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "services": ["qdrant", "redis", "milvus"],
    "skills": ["researcher"]
  }'`}</code>
			</pre>
			<h3>
				Response <code>200 OK</code> (valid)
			</h3>
			<pre>
				<code>{`{
  "ok": true,
  "data": {
    "valid": true,
    "warnings": [
      {
        "code": "CONFLICT",
        "message": "qdrant and milvus are both vector databases; consider using only one"
      }
    ],
    "resolvedServices": ["openclaw", "qdrant", "redis", "milvus", "searxng", "browserless"],
    "resolvedSkills": ["researcher"],
    "estimatedMemoryMB": 3072
  }
}`}</code>
			</pre>
			<h3>
				Response <code>400 Bad Request</code> (invalid)
			</h3>
			<pre>
				<code>{`{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid configuration",
    "details": {
      "errors": [
        "Service 'invalid-service' does not exist",
        "Skill pack 'researcher' requires 'searxng' which is not selected"
      ]
    }
  }
}`}</code>
			</pre>

			<hr />

			<h2 id="generate">
				<code>POST /api/v1/generate</code> — Generate Stack
			</h2>
			<p>
				Generates a complete stack configuration and returns the files as a JSON bundle or
				downloadable archive.
			</p>
			<h3>Request Body</h3>
			<table>
				<thead>
					<tr>
						<th>Field</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>name</code>
						</td>
						<td>string</td>
						<td>Yes</td>
						<td>Project name</td>
					</tr>
					<tr>
						<td>
							<code>preset</code>
						</td>
						<td>string</td>
						<td>No</td>
						<td>Preset name</td>
					</tr>
					<tr>
						<td>
							<code>services</code>
						</td>
						<td>string[]</td>
						<td>No</td>
						<td>Service IDs (ignored if preset is set)</td>
					</tr>
					<tr>
						<td>
							<code>skills</code>
						</td>
						<td>string[]</td>
						<td>No</td>
						<td>Skill pack IDs (ignored if preset is set)</td>
					</tr>
					<tr>
						<td>
							<code>proxy</code>
						</td>
						<td>string</td>
						<td>No</td>
						<td>Proxy type</td>
					</tr>
					<tr>
						<td>
							<code>domain</code>
						</td>
						<td>string</td>
						<td>No</td>
						<td>Domain for proxy configuration</td>
					</tr>
					<tr>
						<td>
							<code>gpu</code>
						</td>
						<td>boolean</td>
						<td>No</td>
						<td>Enable GPU passthrough</td>
					</tr>
					<tr>
						<td>
							<code>platform</code>
						</td>
						<td>string</td>
						<td>No</td>
						<td>
							Target platform (e.g. <code>linux/arm64</code>)
						</td>
					</tr>
					<tr>
						<td>
							<code>deploymentType</code>
						</td>
						<td>string</td>
						<td>No</td>
						<td>
							<code>docker</code> (default) or <code>bare-metal</code>. Bare-metal produces a native
							+ Docker hybrid: install scripts in <code>native/</code> and <code>install.sh</code>/
							<code>install.ps1</code>; see{" "}
							<Link href="/docs/deployment#bare-metal">Deployment → Bare-metal</Link>.
						</td>
					</tr>
					<tr>
						<td>
							<code>format</code>
						</td>
						<td>string</td>
						<td>No</td>
						<td>
							Response format: <code>json</code> (default) or <code>tar</code>
						</td>
					</tr>
				</tbody>
			</table>
			<h3>Request</h3>
			<pre>
				<code>{`curl -X POST https://better-openclaw.dev/api/v1/generate \\
  -H "Authorization: Bearer $OPENCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-stack",
    "preset": "researcher",
    "proxy": "caddy",
    "domain": "ai.example.com"
  }'`}</code>
			</pre>
			<h3>
				Response <code>200 OK</code> (format: json)
			</h3>
			<pre>
				<code>{`{
  "ok": true,
  "data": {
    "name": "my-stack",
    "files": {
      "docker-compose.yml": "version: '3.8'\\nservices:\\n  ...",
      ".env.example": "# OpenClaw Configuration\\nOPENAI_API_KEY=\\n...",
      "Caddyfile": "ai.example.com {\\n  reverse_proxy openclaw:8080\\n}",
      "configs/openclaw/config.yaml": "gateway:\\n  port: 8080\\n...",
      "scripts/start.sh": "#!/bin/bash\\n...",
      "scripts/stop.sh": "#!/bin/bash\\n...",
      "scripts/update.sh": "#!/bin/bash\\n...",
      "scripts/backup.sh": "#!/bin/bash\\n...",
      "scripts/status.sh": "#!/bin/bash\\n...",
      "README.md": "# my-stack\\n..."
    },
    "summary": {
      "services": 5,
      "skills": 2,
      "proxy": "caddy",
      "estimatedMemoryMB": 2048
    }
  }
}`}</code>
			</pre>

			<h3>Download as Tar Archive</h3>
			<p>
				Set <code>format: &quot;tar&quot;</code> to get a downloadable <code>.tar.gz</code> archive
				instead of JSON:
			</p>
			<pre>
				<code>{`curl -X POST https://better-openclaw.dev/api/v1/generate \\
  -H "Authorization: Bearer $OPENCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-stack", "preset": "researcher", "format": "tar"}' \\
  -o my-stack.tar.gz`}</code>
			</pre>

			<hr />

			<h2>Next Steps</h2>
			<ul>
				<li>
					<Link href="/docs/api">API Overview</Link> — authentication and general concepts
				</li>
				<li>
					<Link href="/docs/services">Service Catalog</Link> — browse all services
				</li>
				<li>
					<Link href="/docs/cli">CLI Reference</Link> — generate stacks from the command line
				</li>
			</ul>
		</>
	);
}
