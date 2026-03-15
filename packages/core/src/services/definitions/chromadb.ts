import type { ServiceDefinition } from "../../types.js";

export const chromadbDefinition: ServiceDefinition = {
	id: "chromadb",
	name: "ChromaDB",
	description:
		"Open-source AI-native vector database for building embeddings-based applications with simple APIs for storing, searching, and filtering vectors.",
	category: "vector-db",
	icon: "🎨",

	image: "chromadb/chroma",
	imageTag: "1.5.1",
	ports: [
		{
			host: 8100,
			container: 8000,
			description: "ChromaDB HTTP API",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "chroma-data",
			containerPath: "/chroma/chroma",
			description: "Persistent ChromaDB vector storage",
		},
	],
	environment: [],
	healthcheck: {
		test: "curl -sf http://localhost:8000/api/v1/heartbeat || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "10s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "chromadb-memory", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "CHROMADB_HOST",
			defaultValue: "chromadb",
			secret: false,
			description: "ChromaDB hostname for OpenClaw",
			required: true,
		},
		{
			key: "CHROMADB_PORT",
			defaultValue: "8000",
			secret: false,
			description: "ChromaDB port for OpenClaw",
			required: true,
		},
	],

	docsUrl: "https://docs.trychroma.com/",
	tags: ["vector", "embeddings", "ai-native", "similarity-search"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
};
