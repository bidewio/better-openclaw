import type { ServiceDefinition } from "../../types.js";

export const agentBrowserDefinition: ServiceDefinition = {
	id: "agent-browser",
	name: "Agent Browser",
	description:
		"AI-optimized headless browser by Vercel Labs. Rust-native CLI with snapshot + ref workflow (@e1, @e2) for deterministic LLM element targeting, content boundaries for prompt injection safety, action policies, and live WebSocket viewport streaming.",
	category: "browser",
	icon: "🌍",

	// Thin Docker wrapper — npx downloads the pre-compiled Rust binary + Chrome for Testing
	image: "node",
	imageTag: "22-slim",
	command:
		'sh -c "npx -y agent-browser@latest install --yes 2>/dev/null; exec npx -y agent-browser@latest daemon --port 9222"',
	ports: [
		{
			host: 9224,
			container: 9222,
			description: "CDP protocol (Chrome DevTools Protocol)",
			exposed: true,
		},
		{
			host: 9223,
			container: 9223,
			description: "Viewport streaming WebSocket (pair browsing)",
			exposed: true,
			websocket: true,
		},
	],
	volumes: [
		{
			name: "agent-browser-data",
			containerPath: "/root/.agent-browser",
			description: "Agent Browser session state, auth vault, and configuration",
		},
	],
	environment: [
		{
			key: "AGENT_BROWSER_JSON",
			defaultValue: "true",
			secret: false,
			description: "JSON output mode for AI agent parsing",
			required: false,
		},
		{
			key: "AGENT_BROWSER_CONTENT_BOUNDARIES",
			defaultValue: "true",
			secret: false,
			description: "Wrap page output in boundary markers to prevent LLM prompt injection",
			required: false,
		},
		{
			key: "AGENT_BROWSER_DEFAULT_TIMEOUT",
			defaultValue: "25000",
			secret: false,
			description: "Default operation timeout in milliseconds",
			required: false,
		},
		{
			key: "AGENT_BROWSER_STREAM_PORT",
			defaultValue: "9223",
			secret: false,
			description: "WebSocket port for live viewport streaming (pair browsing)",
			required: false,
		},
		{
			key: "AGENT_BROWSER_IDLE_TIMEOUT_MS",
			defaultValue: "3600000",
			secret: false,
			description: "Auto-shutdown daemon after inactivity (ms, default 1 hour)",
			required: false,
		},
		{
			key: "AGENT_BROWSER_ALLOWED_DOMAINS",
			defaultValue: "",
			secret: false,
			description:
				"Comma-separated domain allowlist for security (e.g. example.com,*.github.com). Empty = all domains allowed",
			required: false,
		},
		{
			key: "AGENT_BROWSER_ENCRYPTION_KEY",
			defaultValue: "",
			secret: true,
			description: "64-character hex key for AES-256-GCM encryption of browser auth state",
			required: false,
		},
	],
	healthcheck: {
		test: "npx -y agent-browser@latest --version || exit 1",
		interval: "30s",
		timeout: "15s",
		retries: 3,
		startPeriod: "60s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "agent-browse", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "AGENT_BROWSER_HOST",
			defaultValue: "agent-browser",
			secret: false,
			description: "Agent Browser hostname for OpenClaw",
			required: true,
		},
		{
			key: "AGENT_BROWSER_CDP_PORT",
			defaultValue: "9224",
			secret: false,
			description: "Agent Browser CDP port for OpenClaw",
			required: true,
		},
		{
			key: "AGENT_BROWSER_STREAM_PORT",
			defaultValue: "9223",
			secret: false,
			description: "Agent Browser viewport streaming WebSocket port",
			required: true,
		},
	],

	docsUrl: "https://github.com/vercel/agent-browser",
	tags: [
		"ai-agent",
		"browser",
		"cdp",
		"rust",
		"snapshot",
		"refs",
		"automation",
		"streaming",
		"vercel",
		"headless",
	],
	maturity: "beta",

	requires: [],
	recommends: ["browserless"],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,

	// Bare-metal native recipes — agent-browser is designed to run on the host
	nativeSupported: true,
	nativeRecipes: [
		{
			platform: "linux",
			installSteps: [
				'command -v agent-browser >/dev/null 2>&1 || (npm install -g agent-browser && agent-browser install --yes)',
			],
			startCommand: "agent-browser daemon --port 9222 &",
			stopCommand: "pkill -f 'agent-browser daemon' 2>/dev/null",
		},
		{
			platform: "macos",
			installSteps: [
				'command -v agent-browser >/dev/null 2>&1 || (brew install agent-browser 2>/dev/null || npm install -g agent-browser) && agent-browser install --yes',
			],
			startCommand: "agent-browser daemon --port 9222 &",
			stopCommand: "pkill -f 'agent-browser daemon' 2>/dev/null",
		},
		{
			platform: "windows",
			installSteps: [
				"if (-not (Get-Command agent-browser -ErrorAction SilentlyContinue)) { npm install -g agent-browser; agent-browser install --yes }",
			],
			startCommand: "Start-Process -NoNewWindow agent-browser -ArgumentList 'daemon','--port','9222'",
			stopCommand: "Stop-Process -Name agent-browser -Force -ErrorAction SilentlyContinue",
		},
	],
};
