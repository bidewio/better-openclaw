import type { ServiceDefinition } from "../../types.js";

export const meilisearchDefinition: ServiceDefinition = {
	id: "meilisearch",
	name: "Meilisearch",
	description:
		"Lightning-fast, typo-tolerant full-text search engine with an intuitive API, perfect for building instant search experiences.",
	category: "search",
	icon: "🔎",

	image: "getmeili/meilisearch",
	imageTag: "v1.40.0",
	ports: [
		{
			host: 7700,
			container: 7700,
			description: "Meilisearch HTTP API",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "meilisearch-data",
			containerPath: "/meili_data",
			description: "Persistent Meilisearch index and data storage",
		},
	],
	environment: [
		{
			key: "MEILI_MASTER_KEY",
			defaultValue: "",
			secret: true,
			description: "Master key for Meilisearch API authentication",
			required: true,
		},
	],
	healthcheck: {
		test: "curl -sf http://localhost:7700/health || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 5,
		startPeriod: "15s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [
		{
			key: "MEILISEARCH_HOST",
			defaultValue: "meilisearch",
			secret: false,
			description: "Meilisearch hostname for OpenClaw",
			required: true,
		},
		{
			key: "MEILISEARCH_PORT",
			defaultValue: "7700",
			secret: false,
			description: "Meilisearch port for OpenClaw",
			required: true,
		},
		{
			key: "MEILISEARCH_MASTER_KEY",
			defaultValue: "${MEILI_MASTER_KEY}",
			secret: true,
			description: "Meilisearch master key for OpenClaw (references service key)",
			required: true,
		},
	],

	docsUrl: "https://www.meilisearch.com/docs",
	tags: ["full-text-search", "instant-search", "typo-tolerant"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 256,
	gpuRequired: false,
	capDropCompatible: true,
	proxyPath: "/meilisearch",
	envQuirks: [
		{
			key: "MEILI_MASTER_KEY",
			issue: "min_length" as const,
			fix: { type: "generate_base64url" as const, minBytes: 24 },
		},
	],
};
