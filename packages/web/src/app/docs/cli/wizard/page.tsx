import Link from "next/link";

export const metadata = {
	title: "Interactive Wizard — better-openclaw Docs",
	description:
		"Step-by-step guide to the better-openclaw interactive wizard. Each prompt explained in detail.",
};

export default function WizardPage() {
	return (
		<>
			<h1>Interactive Wizard</h1>
			<p>
				When you run <code>create-better-openclaw</code> without the <code>--yes</code> flag, the
				interactive wizard guides you through configuring your stack step by step. This page
				explains each prompt and how your choices affect the generated output.
			</p>

			<h2>Launching the Wizard</h2>
			<pre>
				<code>{`npx create-better-openclaw@latest my-stack`}</code>
			</pre>
			<p>
				The wizard runs in your terminal and asks a series of questions. You can press{" "}
				<kbd>Ctrl+C</kbd> at any point to cancel.
			</p>

			<hr />

			<h2>Step 1: Project Name</h2>
			<pre>
				<code>{`? Project name: › my-stack`}</code>
			</pre>
			<p>
				Enter the name for your project directory. This is also used as the Docker Compose project
				name. If you already passed a name as an argument (e.g.{" "}
				<code>create-better-openclaw my-stack</code>), this step is skipped.
			</p>
			<ul>
				<li>Must be a valid directory name (no spaces or special characters)</li>
				<li>Used as the Docker Compose project prefix</li>
				<li>Will create a directory with this name in the current folder</li>
			</ul>

			<h2>Step 2: Select a Preset (or Custom)</h2>
			<pre>
				<code>{`? Start from a preset or build custom?
  ● minimal     — OpenClaw + Redis (lightweight)
  ○ researcher  — OpenClaw + Qdrant + SearXNG + Browserless
  ○ devops      — OpenClaw + n8n + Grafana + Prometheus
  ○ local-ai    — OpenClaw + Ollama + Whisper (fully local)
  ○ full        — All services enabled
  ○ custom      — Pick services manually`}</code>
			</pre>
			<p>
				Presets include a curated set of services and skill packs. Selecting a preset skips the
				service and skill selection steps. Choose <strong>custom</strong> to handpick services
				individually.
			</p>

			<h2>Step 2b: Agent Framework</h2>
			<pre>
				<code>{`? Primary agent framework:
  ● openclaw   — Full-featured with gateway, mission control, and Tailscale
  ○ copaw      — Cooperative multi-agent with shared memory
  ○ nanoclaw   — Lightweight single-agent runtime
  ○ nanobot    — Minimal bot framework with plugin architecture
  ○ zeroclaw   — Zero-config convention-over-configuration
  ○ memu       — Memory-first with persistent context (PostgreSQL)
  ○ claude-code — Anthropic's CLI agent for software engineering
  ○ codex      — OpenAI's CLI agent for code generation`}</code>
			</pre>
			<p>
				Choose your primary agent orchestrator. OpenClaw is the default. Non-OpenClaw frameworks
				skip Convex, Mission Control, and Tailscale. You can optionally add companion frameworks to
				run side-by-side.
			</p>

			<h2>Step 3: Select Services (Custom Only)</h2>
			<pre>
				<code>{`? Select companion services (space to toggle, enter to confirm):
  ◉ redis          — In-memory cache and message broker
  ◉ qdrant         — Vector database for embeddings
  ◻ postgres       — Relational database
  ◻ n8n            — Workflow automation
  ◻ searxng        — Privacy-respecting search
  ◻ browserless    — Headless browser for web scraping
  ... (94+ services across 21 categories)`}</code>
			</pre>
			<p>
				This step only appears if you chose <strong>custom</strong> in Step 2. Services are
				organized by category. Use:
			</p>
			<ul>
				<li>
					<kbd>Space</kbd> to toggle a service on/off
				</li>
				<li>
					<kbd>↑</kbd> / <kbd>↓</kbd> to navigate
				</li>
				<li>
					<kbd>Enter</kbd> to confirm your selection
				</li>
			</ul>
			<p>
				The wizard automatically handles dependencies — if you select a service that requires Redis,
				Redis will be added automatically.
			</p>

			<h2>Step 4: Select Skill Packs</h2>
			<pre>
				<code>{`? Select skill packs to enable:
  ◉ researcher     — Web search, content extraction, citation
  ◻ automation     — n8n workflows, scheduled tasks
  ◻ memory         — Long-term memory with vector storage
  ◻ local-ai       — Local LLM inference with Ollama
  ◻ code           — Code execution sandbox
  ... (10 skill packs)`}</code>
			</pre>
			<p>
				Skill packs are curated bundles of OpenClaw skills that work with specific services. The
				wizard will warn you if a skill pack requires services that aren&apos;t selected. See the{" "}
				<Link href="/docs/skill-packs">Skill Packs reference</Link> for details.
			</p>

			<h2>Step 5: Reverse Proxy</h2>
			<pre>
				<code>{`? Configure a reverse proxy?
  ● none     — No proxy (development/local use)
  ○ caddy    — Automatic HTTPS with Let's Encrypt
  ○ traefik  — Dynamic routing with dashboard
  ○ nginx    — Traditional reverse proxy`}</code>
			</pre>
			<p>
				For local development, <code>none</code> is fine. For production deployments,{" "}
				<strong>Caddy</strong> is recommended for its automatic HTTPS. If you select a proxy,
				you&apos;ll be asked for a domain name next.
			</p>

			<h2>Step 6: Domain Name (Proxy Only)</h2>
			<pre>
				<code>{`? Domain name: › openclaw.example.com`}</code>
			</pre>
			<p>
				Only shown if you selected a reverse proxy. This domain is used in the proxy configuration
				and SSL certificate generation. You can change it later by editing the generated config
				files.
			</p>

			<h2>Step 7: GPU Passthrough</h2>
			<pre>
				<code>{`? Enable GPU passthrough for AI services? (y/N)`}</code>
			</pre>
			<p>
				Only shown if you selected GPU-capable services (Ollama, Whisper, etc.). Enabling this adds
				NVIDIA GPU device requests to the Docker Compose file. Requires the{" "}
				<code>nvidia-container-toolkit</code> to be installed on the host.
			</p>

			<h2>Step 8: Confirmation</h2>
			<pre>
				<code>{`  Stack Summary
  ─────────────
  Project:    my-stack
  Services:   openclaw, redis, qdrant, searxng (4)
  Skills:     researcher, memory (2)
  Proxy:      caddy → openclaw.example.com
  GPU:        disabled
  Output:     ./my-stack

? Generate this stack? (Y/n)`}</code>
			</pre>
			<p>
				Review the summary. Press <kbd>Enter</kbd> to confirm or <code>n</code> to go back and make
				changes.
			</p>

			<h2>Step 9: Generation</h2>
			<pre>
				<code>{`  ✔ Created docker-compose.yml (4 services)
  ✔ Created .env.example (23 variables)
  ✔ Created Caddyfile
  ✔ Created configs/openclaw/config.yaml
  ✔ Created scripts/ (5 helper scripts)
  ✔ Created README.md

  🦞 Stack generated in ./my-stack

  Next steps:
    cd my-stack
    cp .env.example .env   # Add your API keys
    docker compose up -d`}</code>
			</pre>
			<p>
				The wizard generates all files and provides next steps. Your stack is ready to configure and
				launch.
			</p>

			<hr />

			<h2>Tips</h2>
			<ul>
				<li>
					<strong>Arrow keys</strong> navigate between options
				</li>
				<li>
					<strong>Space</strong> toggles selection in multi-select prompts
				</li>
				<li>
					<strong>Type to filter</strong> in long lists (services, skills)
				</li>
				<li>
					<strong>Ctrl+C</strong> cancels at any point without creating files
				</li>
				<li>
					Run with <code>--dry-run</code> to preview without writing anything
				</li>
			</ul>

			<h2>Next Steps</h2>
			<ul>
				<li>
					<Link href="/docs/cli">CLI Reference</Link> — all flags for non-interactive use
				</li>
				<li>
					<Link href="/docs/services">Service Catalog</Link> — learn about each service
				</li>
				<li>
					<Link href="/docs/skill-packs">Skill Packs</Link> — curated skill bundles
				</li>
			</ul>
		</>
	);
}
