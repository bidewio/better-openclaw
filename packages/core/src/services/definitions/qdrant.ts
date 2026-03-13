import type { ServiceDefinition } from "../../types.js";

export const qdrantDefinition: ServiceDefinition = {
	id: "qdrant",
	name: "Qdrant Vector DB",
	description:
		"High-performance vector similarity search engine for building RAG pipelines, semantic search, and AI-powered recommendation systems.",
	category: "vector-db",
	icon: "🧠",

	image: "qdrant/qdrant",
	imageTag: "v1.12.1",
	ports: [
		{
			host: 6333,
			container: 6333,
			description: "Qdrant REST API",
			exposed: true,
		},
		{
			host: 6334,
			container: 6334,
			description: "Qdrant gRPC API",
			exposed: false,
		},
	],
	volumes: [
		{
			name: "qdrant-data",
			containerPath: "/qdrant/storage",
			description: "Persistent Qdrant vector storage",
		},
	],
	environment: [
		{
			key: "QDRANT__SERVICE__GRPC_PORT",
			defaultValue: "6334",
			secret: false,
			description: "gRPC port for Qdrant service",
			required: true,
		},
	],
	healthcheck: {
		test: "bash -c 'echo > /dev/tcp/localhost/6333' || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "10s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "qdrant-memory", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "QDRANT_HOST",
			defaultValue: "qdrant",
			secret: false,
			description: "Qdrant hostname for OpenClaw",
			required: true,
		},
		{
			key: "QDRANT_PORT",
			defaultValue: "6333",
			secret: false,
			description: "Qdrant REST API port for OpenClaw",
			required: true,
		},
	],

	docsUrl: "https://qdrant.tech/documentation/",
	tags: ["vector", "rag", "embeddings", "semantic-search"],
	maturity: "stable",

	requires: [],
	recommends: ["redis"],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
	capDropCompatible: true,
	proxyPath: "/qdrant",
};
