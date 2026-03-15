import Link from "next/link";

export const metadata = {
	title: "Quick Start — better-openclaw Docs",
	description:
		"Get up and running with better-openclaw in under 5 minutes. Install, configure, and launch your first AI agent stack.",
};

export default function QuickStartPage() {
	return (
		<>
			<h1>Quick Start</h1>
			<p>
				Build a production-ready AI agent stack in under 5 minutes. Choose from 8 agent frameworks
				(OpenClaw, CoPaw, NanoClaw, NanoBot, ZeroClaw, MemU, Claude Code, Codex), pick your
				services, and get a fully wired Docker Compose stack.
			</p>

			<h2>Prerequisites</h2>
			<p>Before you begin, make sure you have the following installed:</p>
			<table>
				<thead>
					<tr>
						<th>Requirement</th>
						<th>Minimum Version</th>
						<th>Check</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Node.js</td>
						<td>20.0+</td>
						<td>
							<code>node --version</code>
						</td>
					</tr>
					<tr>
						<td>Docker</td>
						<td>24.0+</td>
						<td>
							<code>docker --version</code>
						</td>
					</tr>
					<tr>
						<td>Docker Compose</td>
						<td>v2.20+</td>
						<td>
							<code>docker compose version</code>
						</td>
					</tr>
				</tbody>
			</table>
			<blockquote>
				<p>
					<strong>Tip:</strong> Docker Desktop includes Docker Compose by default. On Linux, install
					the <code>docker-compose-plugin</code> package.
				</p>
			</blockquote>

			<h2>Install the CLI</h2>
			<p>
				Choose your preferred package manager. No global install is needed — <code>npx</code>,{" "}
				<code>pnpm dlx</code>, and <code>bunx</code> all work out of the box.
			</p>

			<h3>Using pnpm (recommended)</h3>
			<pre>
				<code>{`pnpm create better-openclaw@latest my-stack`}</code>
			</pre>

			<h3>Using npx</h3>
			<pre>
				<code>{`npx create-better-openclaw@latest my-stack`}</code>
			</pre>

			<h3>Using bun</h3>
			<pre>
				<code>{`bun create better-openclaw@latest my-stack`}</code>
			</pre>

			<p>
				This will launch the <Link href="/docs/cli/wizard">interactive wizard</Link> and guide you
				through selecting services, skill packs, and configuration options.
			</p>

			<h2>Using a Preset</h2>
			<p>
				Presets are curated configurations for common use cases. Skip the wizard entirely with{" "}
				<code>--preset</code> and <code>--yes</code>:
			</p>
			<pre>
				<code>{`# Research stack: OpenClaw + Qdrant + SearXNG + Browserless
npx create-better-openclaw my-stack --preset researcher --yes

# DevOps stack: OpenClaw + n8n + Grafana + monitoring
npx create-better-openclaw my-stack --preset devops --yes

# Full stack: everything enabled
npx create-better-openclaw my-stack --preset full --yes`}</code>
			</pre>

			<p>Available presets:</p>
			<table>
				<thead>
					<tr>
						<th>Preset</th>
						<th>Services</th>
						<th>Use Case</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>minimal</code>
						</td>
						<td>OpenClaw + Redis</td>
						<td>Lightweight experimentation</td>
					</tr>
					<tr>
						<td>
							<code>researcher</code>
						</td>
						<td>OpenClaw + Qdrant + SearXNG + Browserless</td>
						<td>Web research and RAG</td>
					</tr>
					<tr>
						<td>
							<code>devops</code>
						</td>
						<td>OpenClaw + n8n + Grafana + Prometheus</td>
						<td>Automation and monitoring</td>
					</tr>
					<tr>
						<td>
							<code>local-ai</code>
						</td>
						<td>OpenClaw + Ollama + Whisper + Redis</td>
						<td>Fully local, air-gapped AI</td>
					</tr>
					<tr>
						<td>
							<code>full</code>
						</td>
						<td>All services</td>
						<td>Kitchen sink</td>
					</tr>
				</tbody>
			</table>

			<h2>Choosing a Framework</h2>
			<p>
				By default, stacks use OpenClaw as the agent framework. You can choose a different primary
				framework with <code>--primary-framework</code>, or add companion frameworks for hybrid
				stacks:
			</p>
			<pre>
				<code>{`# Use ZeroClaw instead of OpenClaw
npx create-better-openclaw my-stack --preset researcher --primary-framework zeroclaw --yes

# Run multiple frameworks side-by-side
npx create-better-openclaw my-stack --services postgresql,redis --primary-framework memu --companion-frameworks copaw --yes`}</code>
			</pre>
			<p>
				Available frameworks: <code>openclaw</code>, <code>copaw</code>, <code>nanoclaw</code>,{" "}
				<code>nanobot</code>, <code>zeroclaw</code>, <code>memu</code>, <code>claude-code</code>,{" "}
				<code>codex</code>. Non-OpenClaw frameworks skip Convex, Mission Control, and Tailscale
				automatically.
			</p>

			<h2>Start Your Stack</h2>
			<pre>
				<code>{`cd my-stack

# Copy and edit the environment file
cp .env.example .env
# Edit .env with your API keys (OpenAI, Anthropic, etc.)

# Start all services
docker compose up -d

# Watch OpenClaw boot
docker compose logs -f openclaw-gateway`}</code>
			</pre>
			<blockquote>
				<p>
					<strong>Direct Install:</strong> During the wizard, you can choose to install OpenClaw
					directly on your host instead of Docker. This generates a{" "}
					<code>scripts/install-openclaw.sh</code> that runs the official installer via curl.
					Companion services still run in Docker. See the{" "}
					<Link href="/docs/installation#direct-install">direct install guide</Link>.
				</p>
			</blockquote>

			<h2>What Gets Generated</h2>
			<p>The CLI generates a complete project directory with everything you need:</p>
			<pre>
				<code>{`my-stack/
├── docker-compose.yml    # All services orchestrated
├── .env.example          # All configuration variables
├── .env                  # Your local secrets (git-ignored)
├── Caddyfile             # Reverse proxy config (if selected)
├── configs/
│   ├── openclaw/
│   │   └── config.yaml   # OpenClaw gateway configuration
│   ├── qdrant/           # Qdrant settings
│   └── grafana/          # Grafana dashboards
├── data/                 # Persistent volume mounts
├── scripts/
│   ├── start.sh          # Start with health checks
│   ├── stop.sh           # Graceful shutdown
│   ├── update.sh         # Pull latest images
│   ├── backup.sh         # Backup all volumes
│   └── status.sh         # Service status overview
└── README.md             # Project-specific docs`}</code>
			</pre>

			<h2>Verify Everything Works</h2>
			<pre>
				<code>{`# Check all services are healthy
docker compose ps

# Test the OpenClaw gateway
curl http://localhost:8080/healthz

# Open the web UI (if enabled)
open http://localhost:3000`}</code>
			</pre>

			<h2>Next Steps</h2>
			<ul>
				<li>
					<Link href="/docs/installation">Detailed installation guide</Link> — global installs,
					troubleshooting
				</li>
				<li>
					<Link href="/docs/cli">CLI reference</Link> — all flags and options
				</li>
				<li>
					<Link href="/docs/services">Service catalog</Link> — browse all 94+ services
				</li>
				<li>
					<Link href="/docs/skill-packs">Skill packs</Link> — curated bundles for common tasks
				</li>
				<li>
					<Link href="/docs/deployment">Deployment guides</Link> — Docker, bare-metal (native +
					Docker), direct install, VPS, homelab
				</li>
				<li>
					<Link href="/docs/mcp">MCP Server</Link> — let AI agents generate stacks via natural
					language
				</li>
			</ul>
		</>
	);
}
