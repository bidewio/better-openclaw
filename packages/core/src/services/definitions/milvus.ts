import type { ServiceDefinition } from "../../types.js";

export const milvusDefinition: ServiceDefinition = {
	id: "milvus",
	name: "Milvus",
	description:
		"Open-source vector database built for scalable similarity search and AI applications.",
	category: "vector-db",
	icon: "🗄️",

	image: "milvusdb/milvus",
	imageTag: "v2.6.10",
	command: "milvus run standalone",
	ports: [
		{
			host: 19530,
			container: 19530,
			description: "Milvus gRPC/REST API",
			exposed: true,
		},
		{
			host: 9091,
			container: 9091,
			description: "Milvus Management/Prometheus Metrics",
			exposed: false,
		},
	],
	volumes: [
		{
			name: "milvus_volumes",
			containerPath: "/var/lib/milvus",
			description: "Milvus persistent data storage",
		},
	],
	environment: [
		{
			key: "ETCD_ENDPOINTS",
			defaultValue: "etcd:2379",
			secret: false,
			description:
				"etcd endpoints (standalone uses local if not provided, but explicit is better if split)",
			required: false, // Standalone defaults handles this, but good practice to show
		},
		{
			key: "MINIO_ADDRESS",
			defaultValue: "minio:9000",
			secret: false,
			description: "MinIO endpoint for object storage",
			required: false,
		},
	],
	healthcheck: {
		test: "curl -f http://localhost:9091/healthz || exit 1",
		interval: "30s",
		timeout: "20s",
		retries: 3,
		startPeriod: "60s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "milvus-vectors", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "MILVUS_URI",
			defaultValue: "http://milvus:19530",
			secret: false,
			description: "Milvus connection URI for OpenClaw",
			required: true,
		},
	],

	docsUrl: "https://milvus.io/docs",
	tags: ["vector-db", "similarity-search", "embeddings", "ai"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 2048,
	gpuRequired: false,
};
