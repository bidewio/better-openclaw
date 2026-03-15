import type { BlogPost } from "../types";

export const post: BlogPost = {
	slug: "vnc-gui-desktop-sandbox-integration",
	title: "Live Desktop Sandboxes: VNC/GUI Integration in Better OpenClaw",
	description:
		"How we integrated noVNC and KasmVNC desktop streaming into the Homespace dashboard. Embedded iframe viewers, Caddy WebSocket proxying, and Chrome DevTools — all managed through Convex.",
	date: "2026-03-14",
	readTime: "10 min read",
	category: "AI Agents",
	tags: [
		"opensandbox",
		"vnc",
		"gui",
		"desktop",
		"websocket",
		"caddy",
		"mission-control",
		"homespace",
	],
	content: `
		<p>Self-hosted AI agents can now do more than execute code in headless containers. With the latest Better OpenClaw update, your agents can spin up <strong>full GUI desktop environments</strong> and stream them directly into the Homespace dashboard via noVNC &mdash; no separate VNC client needed.</p>

		<p>This post walks through the architecture: how OpenSandbox's <code>create_desktop</code> action connects to the Homespace UI through Caddy's WebSocket proxy, Convex-backed session tracking, and an embedded SandboxViewer component that supports live VNC streaming, Chrome DevTools tabs, and fullscreen mode.</p>

		<h2>Why GUI Sandboxes Matter for AI Agents</h2>

		<p>Headless code execution covers most use cases, but some tasks genuinely need a display:</p>

		<ul>
			<li><strong>Browser automation</strong> &mdash; Watch your agent navigate a website in real time via Chrome or Firefox desktop sessions.</li>
			<li><strong>GUI application testing</strong> &mdash; Agents can launch, interact with, and screenshot desktop applications.</li>
			<li><strong>Data visualization</strong> &mdash; Matplotlib plots, Jupyter notebooks, and other tools that render to a display server.</li>
			<li><strong>Debugging</strong> &mdash; See exactly what the agent sees when it reports errors in a GUI context.</li>
		</ul>

		<h2>Architecture Overview</h2>

<div class="my-10 relative rounded-2xl overflow-hidden border border-border/50 bg-[#0a0a0a] p-6 shadow-2xl">
  <h3 class="mt-0 pt-0 text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-cyan-500 mb-4">VNC Desktop Streaming Flow</h3>
  <div class="font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre">
Agent Skill: create_desktop
    |
    v
OpenSandbox Server (:8080)
    |
    +-- Creates container with VNC server
    +-- Returns noVNC URL (WebSocket :6080)
    |
    v
Caddy Reverse Proxy
    +-- opensandbox.example.com
    +-- reverse_proxy opensandbox:8080 {
    |       flush_interval -1  &lt;-- critical for streaming
    |   }
    |
    v
Homespace Dashboard (SandboxViewer)
    +-- &lt;iframe src="noVNC URL" /&gt;
    +-- Status: creating | running | terminated | error
    +-- Controls: refresh, fullscreen, terminate
    +-- Chrome DevTools tab (optional)
  </div>
</div>

		<h2>Caddy WebSocket Proxy: <code>flush_interval -1</code></h2>

		<p>Caddy automatically handles WebSocket upgrades in its <code>reverse_proxy</code> directive. However, for <strong>streaming</strong> connections like noVNC and KasmVNC, you need one additional directive: <code>flush_interval -1</code>.</p>

		<p>Without it, Caddy buffers the HTTP response body before forwarding. This is fine for typical request/response patterns, but VNC streams continuous frame data over WebSocket. Buffering causes the remote desktop to appear frozen or laggy.</p>

		<pre><code># Auto-generated Caddyfile for OpenSandbox
opensandbox.example.com {
    reverse_proxy opensandbox:8080 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        flush_interval -1
    }
}</code></pre>

		<p>Better OpenClaw's Caddy generator now detects the <code>websocket: true</code> flag on port definitions and automatically injects this directive. The Desktop Environment service (KasmVNC on port 6901) and OpenSandbox (noVNC proxy on port 8080) both have this flag set.</p>

		<h2>Session Tracking with Convex</h2>

		<p>Sandbox sessions are tracked in a dedicated <code>sandboxSessions</code> table in Convex. When an agent creates a desktop sandbox, the webhook handler in <code>openclaw.ts</code> receives the event and upserts a session record:</p>

		<pre><code>// sandboxSessions table schema
{
    sandboxId: string,      // OpenSandbox UUID
    novncUrl: string,       // noVNC WebSocket URL
    vncEndpoint?: string,   // Direct VNC endpoint
    devtoolsUrl?: string,   // Chrome DevTools URL (chrome image only)
    image: string,          // Container image
    resolution?: string,    // Display resolution
    status: "creating" | "running" | "terminated" | "error",
    taskId?: Id,            // Associated task
    agentId?: Id,           // Agent that created it
    tenantId: string,       // Tenant isolation
}</code></pre>

		<p>Sessions are indexed by tenant, status, task, and sandbox ID for efficient querying. The Homespace UI subscribes to these queries reactively &mdash; when an agent creates a sandbox, the viewer appears automatically.</p>

		<h2>The SandboxViewer Component</h2>

		<p>The heart of the UI integration is the <code>SandboxViewer</code> React component. It renders an embedded <code>&lt;iframe&gt;</code> pointing to the noVNC URL, wrapped with controls and status indicators:</p>

		<ul>
			<li><strong>Status badge</strong> &mdash; Color-coded indicator (green = running, orange = creating, red = error).</li>
			<li><strong>Refresh</strong> &mdash; Reloads the noVNC iframe without killing the sandbox.</li>
			<li><strong>Fullscreen</strong> &mdash; Expands the viewer to fill the entire viewport.</li>
			<li><strong>Open in new tab</strong> &mdash; Opens the noVNC URL directly for a standalone experience.</li>
			<li><strong>Terminate</strong> &mdash; Stops the sandbox container via Convex mutation.</li>
		</ul>

		<p>The component supports a <code>compact</code> mode (300px height) for embedding inline in the TaskDetailPanel, and a full-size mode (500px) for the dedicated Sandboxes page.</p>

		<h2>Chrome DevTools Integration</h2>

		<p>When the sandbox image is <code>opensandbox/chrome</code>, the agent can return a <code>devtools_url</code> alongside the VNC URL. The SandboxViewer detects this and adds a tab bar to switch between the Desktop view (noVNC) and Chrome DevTools &mdash; both rendered in the same iframe slot.</p>

		<p>This is particularly useful for browser automation tasks where the agent needs to inspect network requests, console output, or DOM state while viewing the rendered page.</p>

		<h2>Where Sandboxes Appear</h2>

		<p>Desktop sandboxes are surfaced in three places in the Homespace dashboard:</p>

		<ol>
			<li><strong>Sandboxes page</strong> &mdash; A dedicated full-page view (via the nav bar) showing all sessions with a list sidebar and large viewer panel.</li>
			<li><strong>Task detail panel</strong> &mdash; Inline compact viewers appear in the "Desktop Sandboxes" section of any task that has active sessions.</li>
			<li><strong>Document preview tray</strong> &mdash; Documents of type <code>sandbox</code> render the SandboxViewer instead of text/code content.</li>
		</ol>

		<h2>Getting Started</h2>

		<p>To use desktop sandboxes in your stack, include <code>opensandbox</code> as a service and optionally add <code>desktop-environment</code> for KasmVNC:</p>

		<pre><code># CLI
npx create-better-openclaw my-stack --services opensandbox --proxy caddy --domain my-ai.dev

# With the code skill pack (auto-includes opensandbox)
npx create-better-openclaw my-stack --skills code --proxy caddy --domain my-ai.dev</code></pre>

		<p>Once running, your agents can use the <code>code-sandbox</code> skill's <code>create_desktop</code> action to spin up desktop sessions. The noVNC viewer will appear automatically in Mission Control.</p>

		<h2>What's Next</h2>

		<ul>
			<li><strong>Screenshot capture</strong> &mdash; Periodic screenshots saved as documents for async review.</li>
			<li><strong>Session recording</strong> &mdash; VNC session replay for debugging agent behavior.</li>
			<li><strong>Multi-display</strong> &mdash; Side-by-side desktop sessions for parallel agent tasks.</li>
		</ul>
	`,
};
