import type { ServiceDefinition } from "../../types.js";

export const twentyDefinition: ServiceDefinition = {
	id: "twenty",
	name: "Twenty",
	description:
		"Modern open-source CRM with a beautiful UI, GraphQL API, customizable data models, and integrations for managing customer relationships.",
	category: "crm",
	icon: "🤝",

	image: "twentycrm/twenty",
	imageTag: "latest",
	ports: [
		{
			host: 3037,
			container: 3000,
			description: "Twenty CRM web UI",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "twenty-storage",
			containerPath: "/app/packages/twenty-server/.local-storage",
			description: "Twenty server local storage",
		},
	],
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
			key: "SERVER_URL",
			defaultValue: "http://localhost:3037",
			secret: false,
			description: "Server URL for API and webhooks",
			required: true,
		},
		{
			key: "FRONT_BASE_URL",
			defaultValue: "http://localhost:3037",
			secret: false,
			description: "Public frontend URL",
			required: true,
		},
		{
			key: "ENABLE_DB_MIGRATIONS",
			defaultValue: "true",
			secret: false,
			description: "Run database migrations on startup",
			required: false,
		},
	],
	healthcheck: {
		test: "curl -sf http://localhost:3000/healthz || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "30s",
	},
	dependsOn: ["postgresql", "redis", "twenty-worker"],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://twenty.com/developers/section/self-hosting",
	tags: ["crm", "sales", "customer", "contacts", "pipeline", "graphql"],
	maturity: "stable",

	requires: ["postgresql", "redis", "twenty-worker"],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
};
