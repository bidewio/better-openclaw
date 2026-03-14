import type { ServiceDefinition } from "../../types.js";
import { relaticleSharedEnv } from "./relaticle.js";

export const relaticleHorizonDefinition: ServiceDefinition = {
	id: "relaticle-horizon",
	name: "Relaticle (Horizon)",
	description:
		"Laravel Horizon queue worker for Relaticle CRM. Processes background jobs such as webhooks, email notifications, and asynchronous data operations.",
	category: "crm",
	icon: "⚙️",

	image: "ghcr.io/relaticle/relaticle",
	imageTag: "latest",
	ports: [],
	volumes: [
		{
			name: "relaticle-storage",
			containerPath: "/var/www/html/storage/app",
			description: "Shared file storage with main Relaticle service",
		},
	],
	environment: [...relaticleSharedEnv],
	command: "php /var/www/html/artisan horizon",
	healthcheck: {
		test: "php /var/www/html/artisan horizon:status | grep running || exit 1",
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

	docsUrl: "https://github.com/Relaticle/relaticle",
	tags: ["crm", "worker", "queue", "horizon"],
	maturity: "stable",

	requires: ["postgresql", "redis"],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 256,
	gpuRequired: false,
};
