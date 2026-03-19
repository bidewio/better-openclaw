import type { BlogPost } from "../types";

export const post: BlogPost = {
	slug: "multi-framework-agent-support",
	title: "Multi-Framework Support: Choose Your AI Agent Orchestrator",
	description:
		"Better OpenClaw now supports 8 agent frameworks. Choose OpenClaw, CoPaw, NanoClaw, NanoBot, ZeroClaw, MemU, Claude Code, or Codex as your primary orchestrator, with optional companion frameworks for hybrid stacks.",
	date: "2026-03-13",
	readTime: "8 min read",
	category: "AI Agents",
	tags: [
		"multi-agent",
		"frameworks",
		"openclaw",
		"copaw",
		"zeroclaw",
		"claude-code",
		"codex",
		"docker",
	],
	content: `
		<p>Until now, Better OpenClaw generated stacks exclusively for the OpenClaw agent framework. That changes today. <strong>v1.3.0 introduces multi-framework support</strong> with 8 pluggable agent frameworks, companion framework multi-select, and framework-aware stack generation across the CLI, Web UI, MCP tools, and REST API.</p>

		<h2>The Problem: Framework Lock-In</h2>

		<p>The AI agent ecosystem is exploding. OpenClaw is powerful, but it's not the only game in town. Teams using CoPaw for cooperative multi-agent workflows, ZeroClaw for zero-config simplicity, or MemU for memory-first architectures were stuck writing Docker Compose files by hand. Better OpenClaw's infrastructure generation&mdash;dependency resolution, port management, secret generation, health checks, reverse proxy configs&mdash;was locked to a single framework.</p>

		<p>We wanted to fix this without forking the codebase 8 times.</p>

		<h2>8 Supported Frameworks</h2>

		<p>Here's what's available:</p>

		<table>
			<thead>
				<tr>
					<th>Framework</th>
					<th>ID</th>
					<th>Best For</th>
				</tr>
			</thead>
			<tbody>
				<tr><td><strong>OpenClaw</strong></td><td><code>openclaw</code></td><td>Full-featured stacks with gateway, mission control, and Tailscale networking</td></tr>
				<tr><td><strong>CoPaw</strong></td><td><code>copaw</code></td><td>Cooperative multi-agent workflows with shared memory</td></tr>
				<tr><td><strong>NanoClaw</strong></td><td><code>nanoclaw</code></td><td>Lightweight single-agent runtime for resource-constrained environments</td></tr>
				<tr><td><strong>NanoBot</strong></td><td><code>nanobot</code></td><td>Minimal bot framework with plugin architecture</td></tr>
				<tr><td><strong>ZeroClaw</strong></td><td><code>zeroclaw</code></td><td>Zero-config agent framework with convention-over-configuration</td></tr>
				<tr><td><strong>MemU</strong></td><td><code>memu</code></td><td>Memory-first agent framework with persistent context (requires PostgreSQL)</td></tr>
				<tr><td><strong>Claude Code</strong></td><td><code>claude-code</code></td><td>Anthropic's CLI agent for software engineering tasks</td></tr>
				<tr><td><strong>Codex</strong></td><td><code>codex</code></td><td>OpenAI's CLI agent for code generation and editing</td></tr>
			</tbody>
		</table>

		<p>Each framework gets its own gateway container, CLI services, network configuration, and environment variables. Non-OpenClaw frameworks automatically skip Convex, Mission Control, and Tailscale&mdash;services that are specific to the OpenClaw ecosystem.</p>

		<h2>How to Choose a Framework</h2>

		<h3>CLI</h3>

		<p>The interactive wizard now includes a framework selection step. Or use flags for non-interactive mode:</p>

		<pre><code>
# Use ZeroClaw as primary
npx create-better-openclaw my-stack --primary-framework zeroclaw --yes

# Run multiple frameworks side-by-side
npx create-better-openclaw my-stack \\
  --services postgresql,redis \\
  --primary-framework memu \\
  --companion-frameworks copaw,nanoclaw \\
  --yes
		</code></pre>

		<h3>Web UI</h3>

		<p>The new <strong>FrameworkSelector</strong> component in the visual stack builder at <code>/new</code> lets you pick a primary framework (single-select) and companion frameworks (multi-select) with a visual grid. Dependencies update in real-time as you switch frameworks.</p>

		<h3>MCP Tools</h3>

		<p>The <code>generate-stack</code> MCP tool now accepts <code>primaryFramework</code> and <code>companionFrameworks</code> parameters. AI agents can generate stacks for any framework through natural conversation:</p>

		<blockquote>
			<p>"Create a ZeroClaw stack with PostgreSQL and Redis"</p>
		</blockquote>

		<h3>REST API</h3>

		<p>Both <code>POST /validate</code> and <code>POST /generate</code> endpoints now accept the framework parameters:</p>

		<pre><code>
curl -X POST http://localhost:3456/api/v1/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectName": "my-stack",
    "services": ["postgresql", "redis"],
    "primaryFramework": "zeroclaw",
    "companionFrameworks": ["copaw"]
  }'
		</code></pre>

		<h2>Companion Frameworks</h2>

		<p>The real power comes from <strong>hybrid stacks</strong>. Select a primary framework for your main orchestration and add companion frameworks that run alongside it. Each companion gets its own gateway container and CLI service, sharing the same backing infrastructure (databases, caches, search engines).</p>

		<p>Use cases for companion frameworks:</p>

		<ul>
			<li>Run Claude Code for coding tasks while MemU handles long-term memory and context</li>
			<li>Use OpenClaw as your primary with NanoClaw running lightweight side agents</li>
			<li>Deploy CoPaw for multi-agent coordination alongside Codex for code generation</li>
		</ul>

		<h2>Technical Architecture</h2>

		<p>Under the hood, multi-framework support uses a <strong>registry pattern</strong>. Each framework is defined by an <code>AgentFrameworkDefinition</code> interface in <code>core/src/frameworks/</code>:</p>

		<ul>
			<li><strong>Mandatory services</strong>: Framework-specific required services (e.g., MemU requires PostgreSQL)</li>
			<li><strong>Excluded services</strong>: Services to skip for non-OpenClaw frameworks (Convex, Mission Control, Tailscale)</li>
			<li><strong>Gateway/CLI config</strong>: Per-framework container names, images, ports, and environment variables</li>
			<li><strong>Network naming</strong>: Each framework gets its own Docker network name derived from its ID</li>
		</ul>

		<p>The resolver, composer, and README generator are all framework-aware. When you select a framework, the entire stack adapts&mdash;from dependency resolution to the generated documentation.</p>

		<h2>Getting Started</h2>

		<p>Update to the latest version and try it out:</p>

		<pre><code>
npx create-better-openclaw@latest my-stack
		</code></pre>

		<p>The wizard will ask you to choose your framework. Or jump straight in with a non-OpenClaw framework:</p>

		<pre><code>
npx create-better-openclaw my-stack \\
  --preset researcher \\
  --primary-framework zeroclaw \\
  --yes
		</code></pre>

		<p>All 94+ services, 10 skill packs, and 9 presets work across all 8 frameworks. Your infrastructure, your choice of orchestrator.</p>
	`,
};
