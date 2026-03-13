import type { ServiceDefinition } from "../../types.js";

export const n8nDefinition: ServiceDefinition = {
	id: "n8n",
	name: "n8n",
	description:
		"Workflow automation platform for connecting services, building integrations, and automating tasks with a visual node-based editor.",
	category: "automation",
	icon: "🔄",

	image: "docker.n8n.io/n8nio/n8n",
	imageTag: "1.123.21",
	ports: [
		{
			host: 5678,
			container: 5678,
			description: "n8n web interface and API",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "n8n-data",
			containerPath: "/home/node/.n8n",
			description: "Persistent n8n data and workflows",
		},
	],
	environment: [
		{
			key: "N8N_BASIC_AUTH_ACTIVE",
			defaultValue: "true",
			secret: false,
			description: "Enable basic authentication for n8n",
			required: true,
		},
		{
			key: "N8N_BASIC_AUTH_USER",
			defaultValue: "admin",
			secret: false,
			description: "Basic auth username for n8n",
			required: true,
		},
		{
			key: "N8N_BASIC_AUTH_PASSWORD",
			defaultValue: "",
			secret: true,
			description: "Basic auth password for n8n",
			required: true,
		},
		{
			key: "DB_TYPE",
			defaultValue: "postgresdb",
			secret: false,
			description: "Database type for n8n persistence",
			required: true,
		},
		{
			key: "DB_POSTGRESDB_HOST",
			defaultValue: "postgresql",
			secret: false,
			description: "PostgreSQL hostname",
			required: true,
		},
		{
			key: "DB_POSTGRESDB_PORT",
			defaultValue: "5432",
			secret: false,
			description: "PostgreSQL port",
			required: true,
		},
		{
			key: "DB_POSTGRESDB_DATABASE",
			defaultValue: "n8n",
			secret: false,
			description: "PostgreSQL database name for n8n",
			required: true,
		},
		{
			key: "DB_POSTGRESDB_USER",
			defaultValue: "n8n",
			secret: false,
			description: "PostgreSQL user for n8n",
			required: true,
		},
		{
			key: "DB_POSTGRESDB_PASSWORD",
			defaultValue: "${N8N_DB_PASSWORD}",
			secret: true,
			description: "PostgreSQL password for n8n (references Postgres password)",
			required: true,
		},
		{
			key: "N8N_PORT",
			defaultValue: "5678",
			secret: false,
			description: "Port n8n listens on",
			required: true,
		},
		{
			key: "WEBHOOK_URL",
			defaultValue: "http://n8n:5678/",
			secret: false,
			description: "Base URL for n8n webhooks",
			required: true,
		},
	],
	healthcheck: {
		test: "wget -q --spider http://localhost:5678/healthz || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "30s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "n8n-trigger", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "N8N_HOST",
			defaultValue: "n8n",
			secret: false,
			description: "n8n hostname for OpenClaw",
			required: true,
		},
		{
			key: "N8N_PORT",
			defaultValue: "5678",
			secret: false,
			description: "n8n port for OpenClaw",
			required: true,
		},
		{
			key: "N8N_WEBHOOK_URL",
			defaultValue: "http://n8n:5678/",
			secret: false,
			description: "n8n webhook URL for OpenClaw",
			required: true,
		},
	],

	docsUrl: "https://docs.n8n.io/",
	tags: ["workflow", "automation", "webhook", "integration"],
	maturity: "stable",

	requires: ["postgresql"],
	recommends: ["redis"],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
	capDropCompatible: true,
	proxyPath: "/n8n",
	envQuirks: [
		{
			key: "DB_POSTGRESDB_PASSWORD",
			issue: "must_sync" as const,
			fix: { type: "sync_with" as const, syncKey: "N8N_DB_PASSWORD" },
		},
	],
};
