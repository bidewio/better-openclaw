import type { ServiceDefinition } from "../../types.js";

export const twentyWorkerDefinition: ServiceDefinition = {
	id: "twenty-worker",
	name: "Twenty (Worker)",
	description:
		"Background job processor for Twenty CRM. Handles asynchronous tasks such as email sync, webhook delivery, and data pipeline operations.",
	category: "crm",
	icon: "⚙️",

	image: "twentycrm/twenty",
	imageTag: "latest",
	ports: [],
	volumes: [],
	environment: [
		{
			key: "PG_DATABASE_URL",
			defaultValue: "postgresql://twenty:${TWENTY_DB_PASSWORD}@postgresql:5432/twenty",
			secret: true,
			description: "PostgreSQL connection URL",
			required: true,
		},
		{
			key: "REDIS_URL",
			defaultValue: "redis://:${REDIS_PASSWORD}@redis:6379",
			secret: true,
			description: "Redis connection URL",
			required: true,
		},
		{
			key: "APP_SECRET",
			defaultValue: "${TWENTY_APP_SECRET}",
			secret: true,
			description: "Application secret for signing tokens",
			required: true,
		},
		{
			key: "ENABLE_DB_MIGRATIONS",
			defaultValue: "false",
			secret: false,
			description: "Disable migrations (handled by main server)",
			required: false,
		},
	],
	command: "yarn worker:prod",
	healthcheck: {
		test: "ps aux | grep worker | grep -v grep || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 5,
		startPeriod: "30s",
	},
	dependsOn: ["postgresql", "redis"],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://twenty.com/developers/section/self-hosting",
	tags: ["crm", "sales", "customer", "worker"],
	maturity: "stable",

	requires: ["postgresql", "redis"],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
};
