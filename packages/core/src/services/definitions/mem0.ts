import type { ServiceDefinition } from "../../types.js";

export const mem0Definition: ServiceDefinition = {
	id: "mem0",
	name: "Mem0",
	description:
		"AI memory layer for LLM applications. Provides long-term memory with automatic extraction, storage, and retrieval across conversations. Uses pgvector for embeddings and Neo4j for entity relationship graphs.",
	category: "ai",
	icon: "🧠",

	image: "mem0/mem0-api-server",
	imageTag: "latest",
	ports: [
		{
			host: 8889,
			container: 8000,
			description: "Mem0 REST API",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "mem0-history",
			containerPath: "/app/history",
			description: "Mem0 SQLite audit trail",
		},
	],
	environment: [
		{
			key: "OPENAI_API_KEY",
			defaultValue: "",
			secret: true,
			description: "OpenAI API key for LLM and embeddings",
			required: true,
		},
		{
			key: "POSTGRES_HOST",
			defaultValue: "postgresql",
			secret: false,
			description: "PostgreSQL host (must have pgvector extension)",
			required: true,
		},
		{
			key: "POSTGRES_PORT",
			defaultValue: "5432",
			secret: false,
			description: "PostgreSQL port",
			required: true,
		},
		{
			key: "POSTGRES_DB",
			defaultValue: "mem0",
			secret: false,
			description: "Mem0 database name",
			required: true,
		},
		{
			key: "POSTGRES_USER",
			defaultValue: "mem0",
			secret: false,
			description: "Mem0 database user",
			required: true,
		},
		{
			key: "POSTGRES_PASSWORD",
			defaultValue: "${MEM0_DB_PASSWORD}",
			secret: true,
			description: "Mem0 database password",
			required: true,
		},
		{
			key: "NEO4J_URI",
			defaultValue: "bolt://neo4j:7687",
			secret: false,
			description: "Neo4j connection URI for entity graphs",
			required: true,
		},
		{
			key: "NEO4J_USERNAME",
			defaultValue: "neo4j",
			secret: false,
			description: "Neo4j username",
			required: true,
		},
		{
			key: "NEO4J_PASSWORD",
			defaultValue: "${NEO4J_PASSWORD}",
			secret: true,
			description: "Neo4j password",
			required: true,
		},
	],
	healthcheck: {
		test: "curl -sf http://localhost:8000/docs || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 5,
		startPeriod: "30s",
	},
	dependsOn: ["postgresql", "neo4j"],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "mem0-memory", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "MEM0_HOST",
			defaultValue: "mem0",
			secret: false,
			description: "Mem0 hostname for gateway integration",
			required: false,
		},
		{
			key: "MEM0_PORT",
			defaultValue: "8000",
			secret: false,
			description: "Mem0 API port",
			required: false,
		},
	],

	docsUrl: "https://docs.mem0.ai/",
	tags: ["memory", "ai", "embeddings", "knowledge-graph", "pgvector", "neo4j"],
	maturity: "stable",

	requires: ["postgresql", "neo4j"],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
};
