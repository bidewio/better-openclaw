import type { ServiceDefinition } from "../../types.js";

const relaticleSharedEnv = [
	{
		key: "APP_KEY",
		defaultValue: "${RELATICLE_APP_KEY}",
		secret: true,
		description: "Laravel application encryption key",
		required: true,
	},
	{
		key: "APP_URL",
		defaultValue: "http://localhost:8080",
		secret: false,
		description: "Public URL of the Relaticle instance",
		required: true,
	},
	{
		key: "APP_ENV",
		defaultValue: "production",
		secret: false,
		description: "Application environment",
		required: true,
	},
	{
		key: "DB_CONNECTION",
		defaultValue: "pgsql",
		secret: false,
		description: "Database driver",
		required: true,
	},
	{
		key: "DB_HOST",
		defaultValue: "postgresql",
		secret: false,
		description: "PostgreSQL hostname",
		required: true,
	},
	{
		key: "DB_PORT",
		defaultValue: "5432",
		secret: false,
		description: "PostgreSQL port",
		required: true,
	},
	{
		key: "DB_DATABASE",
		defaultValue: "relaticle",
		secret: false,
		description: "Database name",
		required: true,
	},
	{
		key: "DB_USERNAME",
		defaultValue: "relaticle",
		secret: false,
		description: "Database username",
		required: true,
	},
	{
		key: "DB_PASSWORD",
		defaultValue: "${RELATICLE_DB_PASSWORD}",
		secret: true,
		description: "Database password",
		required: true,
	},
	{
		key: "REDIS_HOST",
		defaultValue: "redis",
		secret: false,
		description: "Redis hostname",
		required: true,
	},
	{
		key: "REDIS_PORT",
		defaultValue: "6379",
		secret: false,
		description: "Redis port",
		required: true,
	},
	{
		key: "REDIS_PASSWORD",
		defaultValue: "${REDIS_PASSWORD}",
		secret: true,
		description: "Redis password",
		required: false,
	},
] as const;

export const relaticleDefinition: ServiceDefinition = {
	id: "relaticle",
	name: "Relaticle",
	description:
		"Next-generation open-source CRM platform built with Laravel and Filament, featuring customizable pipelines, contacts, companies, and task management.",
	category: "crm",
	icon: "📇",

	image: "ghcr.io/relaticle/relaticle",
	imageTag: "latest",
	ports: [
		{
			host: 8080,
			container: 8080,
			description: "Relaticle web UI",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "relaticle-storage",
			containerPath: "/var/www/html/storage/app",
			description: "Persistent file storage for uploads and attachments",
		},
	],
	environment: [...relaticleSharedEnv],
	healthcheck: {
		test: "curl -sf http://localhost:8080/up || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 5,
		startPeriod: "45s",
	},
	dependsOn: ["postgresql", "redis", "relaticle-horizon", "relaticle-scheduler"],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://github.com/Relaticle/relaticle",
	tags: ["crm", "sales", "contacts", "pipeline", "customer", "laravel"],
	maturity: "stable",

	requires: ["postgresql", "redis", "relaticle-horizon", "relaticle-scheduler"],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
};

export { relaticleSharedEnv };
