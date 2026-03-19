import type { ServiceDefinition } from "../../types.js";

export const memuDefinition: ServiceDefinition = {
	id: "memu",
	name: "MemU",
	description:
		"Persistent memory framework for 24/7 proactive AI agents by NevaMind AI. Receives multimodal inputs, extracts structured memory, and organizes into a hierarchical knowledge graph backed by pgvector.",
	category: "agent-framework",
	icon: "🧠",

	image: "nevamindai/memu-server",
	imageTag: "latest",
	ports: [
		{
			host: 8020,
			container: 8000,
			description: "MemU REST API",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "memu-data",
			containerPath: "/app/data",
			description: "MemU persistent data",
		},
	],
	environment: [
		{
			key: "OPENAI_API_KEY",
			defaultValue: "",
			secret: true,
			description: "OpenAI API key for embeddings and LLM",
			required: false,
		},
		{
			key: "OPENROUTER_API_KEY",
			defaultValue: "",
			secret: true,
			description: "OpenRouter API key (alternative provider)",
			required: false,
		},
		{
			key: "MEMU_DB_HOST",
			defaultValue: "postgresql",
			secret: false,
			description: "PostgreSQL host (must have pgvector extension)",
			required: true,
		},
		{
			key: "MEMU_DB_PASSWORD",
			defaultValue: "${MEMU_DB_PASSWORD}",
			secret: true,
			description: "MemU database password",
			required: true,
		},
	],
	healthcheck: {
		test: "curl -sf http://localhost:8000/health || exit 1",
		interval: "30s",
		timeout: "5s",
		retries: 3,
	},
	dependsOn: ["postgresql"],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "memu-memory", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "MEMU_HOST",
			defaultValue: "memu",
			secret: false,
			description: "MemU hostname for gateway integration",
			required: false,
		},
		{
			key: "MEMU_PORT",
			defaultValue: "8000",
			secret: false,
			description: "MemU API port",
			required: false,
		},
	],

	docsUrl: "https://github.com/NevaMind-AI/memU",
	tags: ["agent", "memory", "knowledge-graph", "pgvector", "proactive"],
	maturity: "beta",

	requires: ["postgresql"],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
};
