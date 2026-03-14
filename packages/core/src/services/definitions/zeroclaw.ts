import type { ServiceDefinition } from "../../types.js";

export const zeroclawDefinition: ServiceDefinition = {
	id: "zeroclaw",
	name: "ZeroClaw",
	description:
		"Rust-based autonomous AI agent. 3.4MB binary, cold start under 10ms. 400x faster startup and 99% lower memory footprint than alternatives. Security-first design.",
	category: "agent-framework",
	icon: "⚡",

	image: "ghcr.io/zeroclaw-labs/zeroclaw",
	imageTag: "latest",
	ports: [
		{
			host: 3000,
			container: 42617,
			description: "ZeroClaw gateway (internal 42617 mapped to host 3000)",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "zeroclaw-data",
			containerPath: "/zeroclaw-data",
			description: "ZeroClaw persistent data and config",
		},
	],
	environment: [
		{
			key: "API_KEY",
			defaultValue: "",
			secret: true,
			description: "LLM provider API key",
			required: true,
		},
		{
			key: "PROVIDER",
			defaultValue: "openrouter",
			secret: false,
			description: "LLM provider name (openrouter, anthropic, openai, etc.)",
			required: false,
		},
		{
			key: "ZEROCLAW_GATEWAY_PORT",
			defaultValue: "42617",
			secret: false,
			description: "Internal gateway port",
			required: false,
		},
		{
			key: "ZEROCLAW_ALLOW_PUBLIC_BIND",
			defaultValue: "true",
			secret: false,
			description: "Bind to all interfaces (required for Docker)",
			required: false,
		},
	],
	healthcheck: {
		test: "zeroclaw status",
		interval: "60s",
		timeout: "10s",
		retries: 3,
	},
	deploy: {
		resources: {
			limits: { cpus: "2", memory: "2G" },
			reservations: { cpus: "0.5", memory: "512M" },
		},
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [
		{
			key: "ZEROCLAW_HOST",
			defaultValue: "zeroclaw",
			secret: false,
			description: "ZeroClaw hostname for gateway integration",
			required: false,
		},
		{
			key: "ZEROCLAW_PORT",
			defaultValue: "42617",
			secret: false,
			description: "ZeroClaw internal gateway port",
			required: false,
		},
	],

	docsUrl: "https://github.com/zeroclaw-labs/zeroclaw",
	tags: ["agent", "rust", "fast", "lightweight", "security"],
	maturity: "beta",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 64,
	gpuRequired: false,
};
