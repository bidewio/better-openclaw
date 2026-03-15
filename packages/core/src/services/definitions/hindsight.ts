import type { ServiceDefinition } from "../../types.js";

export const hindsightDefinition: ServiceDefinition = {
	id: "hindsight",
	name: "Hindsight",
	description:
		"Open-source agent memory system with Retain/Recall/Reflect operations, multi-strategy retrieval (semantic, keyword, graph, temporal), and MCP server support.",
	category: "ai",
	icon: "🧠",

	image: "ghcr.io/vectorize-io/hindsight",
	imageTag: "latest",
	ports: [
		{
			host: 8889,
			container: 8888,
			description: "Hindsight API and MCP endpoint",
			exposed: true,
		},
		{
			host: 9998,
			container: 9999,
			description: "Hindsight admin web UI",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "hindsight-data",
			containerPath: "/home/hindsight/.pg0",
			description: "Embedded PostgreSQL data (used when no external DB configured)",
		},
	],
	environment: [
		{
			key: "HINDSIGHT_API_LLM_PROVIDER",
			defaultValue: "openai",
			secret: false,
			description: "LLM provider (openai, anthropic, gemini, groq, ollama, lmstudio)",
			required: true,
		},
		{
			key: "HINDSIGHT_API_LLM_API_KEY",
			defaultValue: "",
			secret: true,
			description: "API key for the configured LLM provider",
			required: true,
		},
		{
			key: "HINDSIGHT_API_LLM_MODEL",
			defaultValue: "o3-mini",
			secret: false,
			description:
				"LLM model to use for memory operations (e.g., o3-mini, claude-sonnet-4-20250514)",
			required: true,
		},
		{
			key: "HINDSIGHT_API_DATABASE_URL",
			defaultValue: "postgresql://hindsight:${HINDSIGHT_DB_PASSWORD}@postgresql:5432/hindsight",
			secret: false,
			description: "PostgreSQL connection string (leave empty to use embedded pg0 for dev)",
			required: false,
		},
		{
			key: "HINDSIGHT_API_MCP_ENABLED",
			defaultValue: "true",
			secret: false,
			description: "Enable MCP server for agent tool integration",
			required: false,
		},
		{
			key: "HINDSIGHT_API_SKIP_LLM_VERIFICATION",
			defaultValue: "false",
			secret: false,
			description: "Skip LLM connection verification on startup",
			required: false,
		},
	],
	healthcheck: {
		test: "wget -q --spider http://localhost:8888/metrics || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 5,
		startPeriod: "30s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "hindsight-memory", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "HINDSIGHT_HOST",
			defaultValue: "hindsight",
			secret: false,
			description: "Hindsight hostname for agent memory operations",
			required: false,
		},
		{
			key: "HINDSIGHT_API_PORT",
			defaultValue: "8888",
			secret: false,
			description: "Hindsight API port",
			required: false,
		},
	],

	docsUrl: "https://hindsight.vectorize.io/",
	tags: ["agent-memory", "mcp", "recall", "knowledge-graph", "semantic-search"],
	maturity: "beta",

	requires: ["postgresql"],
	recommends: ["ollama"],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
	capDropCompatible: true,
	proxyPath: "/hindsight",
	envQuirks: [
		{
			key: "HINDSIGHT_API_LLM_API_KEY",
			issue: "min_length" as const,
			fix: { type: "generate_base64url" as const, minBytes: 16 },
		},
		{
			key: "HINDSIGHT_API_DATABASE_URL",
			issue: "must_sync" as const,
			fix: { type: "sync_with" as const, syncKey: "HINDSIGHT_DB_PASSWORD" },
		},
	],
};
