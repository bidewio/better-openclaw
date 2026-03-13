import type { ServiceDefinition } from "../../types.js";

export const opensandboxDefinition: ServiceDefinition = {
	id: "opensandbox",
	name: "OpenSandbox",
	description:
		"Secure containerized code execution for AI agents. Multi-language sandboxes (Python, JS/TS, Java, Go, Bash) with file operations, resource limits, and network isolation.",
	category: "dev-tools",
	icon: "📦",

	image: "opensandbox/server",
	imageTag: "v1.0.6",
	ports: [
		{
			host: 8080,
			container: 8080,
			description: "OpenSandbox Lifecycle API (FastAPI)",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "/var/run/docker.sock",
			containerPath: "/var/run/docker.sock",
			description:
				"Docker socket (required for managing sandbox containers)",
		},
		{
			name: "./sandbox.toml",
			containerPath: "/root/.sandbox.toml:ro",
			description: "OpenSandbox configuration file (read-only bind mount)",
		},
	],
	environment: [
		{
			key: "OPEN_SANDBOX_API_KEY",
			defaultValue: "",
			secret: true,
			description:
				"API key for OpenSandbox lifecycle API authentication (min 32 chars)",
			required: true,
		},
		{
			key: "OPENSANDBOX_LOG_LEVEL",
			defaultValue: "INFO",
			secret: false,
			description: "Log verbosity (DEBUG, INFO, WARNING, ERROR)",
			required: false,
		},
		{
			key: "OPENSANDBOX_RUNTIME_TYPE",
			defaultValue: "docker",
			secret: false,
			description: "Runtime backend (always docker for VPS deployments)",
			required: false,
		},
		{
			key: "OPENSANDBOX_EXECD_IMAGE",
			defaultValue: "opensandbox/execd:v1.0.6",
			secret: false,
			description:
				"Execution daemon image injected into sandbox containers",
			required: false,
		},
		{
			key: "OPENSANDBOX_NETWORK_MODE",
			defaultValue: "bridge",
			secret: false,
			description:
				"Container networking mode (always bridge for isolation)",
			required: false,
		},
		{
			key: "OPENSANDBOX_PIDS_LIMIT",
			defaultValue: "512",
			secret: false,
			description: "Max PIDs per sandbox (fork bomb protection)",
			required: false,
		},
		{
			key: "OPENSANDBOX_NO_NEW_PRIVILEGES",
			defaultValue: "true",
			secret: false,
			description: "Security: prevent privilege escalation in sandboxes",
			required: false,
		},
		{
			key: "OPENSANDBOX_SECURE_RUNTIME",
			defaultValue: "gvisor",
			secret: false,
			description: "Secure container runtime (gVisor for sandbox isolation)",
			required: false,
		},
	],
	healthcheck: {
		test: "curl --fail http://localhost:8080/health || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "15s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "code-sandbox", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "OPENSANDBOX_HOST",
			defaultValue: "opensandbox",
			secret: false,
			description: "OpenSandbox hostname for OpenClaw",
			required: true,
		},
		{
			key: "OPENSANDBOX_PORT",
			defaultValue: "8080",
			secret: false,
			description: "OpenSandbox port for OpenClaw",
			required: true,
		},
		{
			key: "OPENSANDBOX_API_KEY",
			defaultValue: "${OPEN_SANDBOX_API_KEY}",
			secret: true,
			description: "OpenSandbox API key for OpenClaw",
			required: true,
		},
	],

	docsUrl: "https://github.com/anthropics/OpenSandbox",
	tags: [
		"sandbox",
		"code-execution",
		"security",
		"ai-agent",
		"isolation",
	],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 768,
	gpuRequired: false,
	capDropCompatible: true,
	proxyPath: "/sandbox",
	envQuirks: [
		{
			key: "OPEN_SANDBOX_API_KEY",
			issue: "min_length",
			fix: { type: "generate_base64url", minBytes: 32 },
		},
	],
};
