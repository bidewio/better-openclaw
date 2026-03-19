import type { ServiceDefinition } from "../../types.js";

export const weaviateDefinition: ServiceDefinition = {
	id: "weaviate",
	name: "Weaviate",
	description:
		"Cloud-native vector database for scalable AI applications with built-in vectorization modules, hybrid search, and GraphQL API.",
	category: "vector-db",
	icon: "🔷",

	image: "semitechnologies/weaviate",
	imageTag: "v1.36.0",
	ports: [
		{
			host: 8082,
			container: 8080,
			description: "Weaviate REST and GraphQL API",
			exposed: true,
		},
		{
			host: 50051,
			container: 50051,
			description: "Weaviate gRPC API",
			exposed: false,
		},
	],
	volumes: [
		{
			name: "weaviate-data",
			containerPath: "/var/lib/weaviate",
			description: "Persistent Weaviate vector and object storage",
		},
	],
	environment: [
		{
			key: "QUERY_DEFAULTS__LIMIT",
			defaultValue: "25",
			secret: false,
			description: "Default query result limit",
			required: true,
		},
		{
			key: "AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED",
			defaultValue: "true",
			secret: false,
			description: "Enable anonymous access (disable in production)",
			required: true,
		},
		{
			key: "PERSISTENCE_DATA_PATH",
			defaultValue: "/var/lib/weaviate",
			secret: false,
			description: "Path for persistent data storage",
			required: true,
		},
	],
	healthcheck: {
		test: "curl -sf http://localhost:8080/v1/.well-known/ready || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "15s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "weaviate-memory", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "WEAVIATE_HOST",
			defaultValue: "weaviate",
			secret: false,
			description: "Weaviate hostname for OpenClaw",
			required: true,
		},
		{
			key: "WEAVIATE_PORT",
			defaultValue: "8080",
			secret: false,
			description: "Weaviate port for OpenClaw",
			required: true,
		},
	],

	docsUrl: "https://weaviate.io/developers/weaviate",
	tags: ["vector", "graphql", "hybrid-search", "ai-native"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 1024,
	gpuRequired: false,
};
