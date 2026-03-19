import type { BlogPost } from "../types";

export const post: BlogPost = {
	slug: "opensandbox-secure-ai-code-execution",
	title: "OpenSandbox: Secure AI Code Execution for Self-Hosted Agents",
	description:
		"How OpenSandbox brings isolated, containerized code execution to your self-hosted AI stack. Run Python, JavaScript, Go, and Bash safely with resource limits, network isolation, and VNC desktop preview.",
	date: "2026-03-13",
	readTime: "12 min read",
	category: "AI Agents",
	tags: [
		"opensandbox",
		"code-execution",
		"security",
		"docker",
		"sandbox",
		"ai-agents",
		"isolation",
		"vnc",
	],
	content: `
		<p>AI agents that generate code face a fundamental problem: <strong>where do you safely run it?</strong> When an LLM produces a Python script to analyze your data or a shell command to scaffold a project, executing that code on your host machine is a security nightmare. One malicious or buggy output could wipe files, exfiltrate data, or consume all your resources.</p>

		<p>This is why we're adding <strong>OpenSandbox</strong> to Better OpenClaw as a first-class service. OpenSandbox (Apache 2.0, by Alibaba) provides lifecycle-managed, containerized execution environments that your AI agents can use to safely run code, manipulate files, and even preview GUI applications&mdash;all within resource-limited, network-isolated Docker containers.</p>

		<h2>The Problem: Code Generation Without Execution</h2>

		<p>Today's self-hosted AI stacks have a gap. Your OpenClaw instance can run LLMs, search the web, automate workflows, and manage knowledge bases. But when a skill generates code, it has nowhere safe to execute it. The options are grim:</p>

		<ul>
			<li><strong>Run on the host</strong> &mdash; Dangerous. Generated code has full access to your VPS.</li>
			<li><strong>Don't run it at all</strong> &mdash; The agent shows code but can't verify it works.</li>
			<li><strong>Use a SaaS sandbox (E2B, CodeSandbox)</strong> &mdash; Adds external dependencies and per-minute costs that conflict with the self-hosted value proposition.</li>
		</ul>

		<p>OpenSandbox eliminates this gap entirely by running as a Docker container alongside your existing stack.</p>

		<h2>How OpenSandbox Works</h2>

		<p>OpenSandbox runs a lightweight FastAPI control plane that manages sandbox containers through the Docker socket. Each sandbox is an ephemeral Docker container with an injected execution daemon (<code>execd</code>) that provides a uniform API for code execution, shell commands, and file operations.</p>

<div class="my-10 relative rounded-2xl overflow-hidden border border-border/50 bg-[#0a0a0a] p-6 shadow-2xl">
  <h3 class="mt-0 pt-0 text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-emerald-500 mb-4">OpenSandbox Architecture</h3>
  <div class="font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre">
OpenClaw Gateway (:18789)
    |
    +-- Skill: "Run this Python script"
    |       |
    v       v
OpenSandbox Server (:8080)  &lt;-- lifecycle API
    |
    +-- POST /v1/sandboxes --&gt; create container
    +-- Container: [base image + execd :44772]
    |       +-- /code   --&gt; execute Python/JS/Go/Bash
    |       +-- /command --&gt; shell commands
    |       +-- /files   --&gt; file operations
    |
    +-- Bridge network (isolated from host)
    +-- TTL auto-expiration (30min idle)
  </div>
</div>

		<h2>What You Can Do With It</h2>

		<h3>Safe AI Code Execution</h3>

		<p>The primary use case. When your OpenClaw agent generates code, it creates an ephemeral sandbox, executes the code, captures the output, and returns the results&mdash;then cleans up automatically.</p>

		<pre><code>User: "Write a Python script to analyze my CSV file"
Agent: generates script
     &rarr; creates sandbox (opensandbox/code-interpreter:python)
     &rarr; uploads CSV, executes script
     &rarr; returns stdout/stderr + exit code
     &rarr; sandbox auto-terminates after 30min idle</code></pre>

		<h3>Multi-Language Support</h3>

		<p>OpenSandbox supports <strong>Python 3.12</strong>, <strong>JavaScript/TypeScript (Node.js 22)</strong>, <strong>Java 21</strong>, <strong>Go 1.24</strong>, and <strong>Bash</strong> out of the box. Each language runs in a pre-built image optimized for size and startup speed.</p>

		<h3>Desktop Preview with noVNC</h3>

		<p>This is where it gets interesting. OpenSandbox ships GUI-capable images that run a full XFCE desktop with noVNC, enabling browser-accessible live preview of agent work. Your agent can create a React app, start the dev server, and you watch it happen in real-time through an embedded iframe.</p>

		<p>Available GUI images:</p>

		<ul>
			<li><code>opensandbox/desktop:latest</code> &mdash; Full XFCE desktop with noVNC (port 6080)</li>
			<li><code>opensandbox/chrome:latest</code> &mdash; Chromium + DevTools Protocol (port 9222)</li>
			<li><code>opensandbox/vscode:latest</code> &mdash; VS Code Web (code-server) for in-browser editing</li>
		</ul>

		<h3>Multi-Step Workflows</h3>

		<p>Sandboxes persist across multiple API calls (until idle timeout), enabling workflows like:</p>

		<ol>
			<li>Create a sandbox</li>
			<li>Upload project files</li>
			<li>Install dependencies (<code>npm install</code>)</li>
			<li>Run tests (<code>npm test</code>)</li>
			<li>Download the results</li>
			<li>Terminate the sandbox</li>
		</ol>

		<h2>Security Model</h2>

		<p>Running untrusted code demands defense-in-depth. OpenSandbox provides multiple layers:</p>

		<ul>
			<li><strong>Container isolation</strong> &mdash; Each sandbox is a separate Docker container with its own filesystem and network namespace</li>
			<li><strong>gVisor runtime</strong> &mdash; Sandboxes run under gVisor for kernel-level syscall filtering</li>
			<li><strong>Capability dropping</strong> &mdash; NET_ADMIN, SYS_ADMIN, SYS_PTRACE, MKNOD, NET_RAW, and SYS_RAWIO are all dropped</li>
			<li><strong>PID limits</strong> &mdash; Max 512 PIDs per sandbox (fork bomb protection)</li>
			<li><strong>Memory caps</strong> &mdash; 512MB default per sandbox</li>
			<li><strong>Network isolation</strong> &mdash; Bridge mode, no outbound access by default</li>
			<li><strong>No privilege escalation</strong> &mdash; <code>no_new_privileges: true</code></li>
			<li><strong>API key authentication</strong> &mdash; 32-byte cryptographic key for the lifecycle API</li>
		</ul>

		<h2>Deploying with Better OpenClaw</h2>

		<p>OpenSandbox is available as an optional addon service. Add it to your stack with a single selection in the CLI wizard or API call:</p>

		<pre><code># CLI
openclaw generate --services opensandbox,n8n,grafana

# API
POST /api/v1/generate
{
  "services": ["opensandbox", "n8n", "grafana"]
}</code></pre>

		<p>Better OpenClaw handles everything: Docker Compose generation with the Docker socket mount and config file, API key generation, reverse proxy route at <code>/sandbox</code>, health check polling, and pre-pulling the 8 required images across 3 priority tiers.</p>

		<h2>Resource Requirements</h2>

		<p>The OpenSandbox server itself is lightweight (~256MB RAM). Each sandbox adds ~512MB (configurable). The practical limits depend on your VPS:</p>

		<table>
			<thead><tr><th>VPS RAM</th><th>Max Concurrent Sandboxes</th></tr></thead>
			<tbody>
				<tr><td>4 GB</td><td>1 sandbox</td></tr>
				<tr><td>8 GB</td><td>3 sandboxes</td></tr>
				<tr><td>16 GB</td><td>8 sandboxes</td></tr>
				<tr><td>32 GB</td><td>20+ sandboxes</td></tr>
			</tbody>
		</table>

		<p>Pre-pulled images require ~8GB of disk space total. On constrained VPS plans, Better OpenClaw prioritizes essential images (server, execd, desktop, chrome) and defers optional ones.</p>

		<h2>Why Self-Hosted Beats SaaS Sandboxes</h2>

		<p>Services like E2B charge $0.05/min per sandbox. For a team running 100 sandboxes per day at 5 minutes each, that's $250/month&mdash;on top of your existing VPS costs. OpenSandbox runs on your hardware for free. The only cost is the VPS resources you're already paying for.</p>

		<p>More importantly, your code and data never leave your infrastructure. No third-party sees your proprietary scripts, API keys, or datasets. This is especially critical for enterprises with data residency requirements.</p>

		<h2>What's Next</h2>

		<p>OpenSandbox integration is available starting in Better OpenClaw v1.0.26. The initial release includes the core <code>code-sandbox</code> skill with 8 actions (code execution, shell commands, file operations, desktop sandbox creation, and VNC preview). Future work includes Homespace live preview integration, Chrome DevTools protocol support, and sandbox resource monitoring in the dashboard.</p>

		<p>If you're building AI agents that generate code, OpenSandbox gives them a safe place to run it&mdash;without leaving your infrastructure.</p>
	`,
};
