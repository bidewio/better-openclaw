import type { ServiceDefinition } from "../../types.js";
import { relaticleSharedEnv } from "./relaticle.js";

export const relaticleSchedulerDefinition: ServiceDefinition = {
	id: "relaticle-scheduler",
	name: "Relaticle (Scheduler)",
	description:
		"Laravel task scheduler for Relaticle CRM. Runs periodic background tasks such as data cleanup, report generation, and scheduled notifications.",
	category: "crm",
	icon: "🕐",

	image: "ghcr.io/relaticle/relaticle",
	imageTag: "latest",
	ports: [],
	volumes: [],
	environment: [...relaticleSharedEnv],
	command: "php /var/www/html/artisan schedule:work",
	healthcheck: {
		test: "ps aux | grep 'schedule:work' | grep -v grep || exit 1",
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
	tags: ["crm", "worker", "scheduler", "cron"],
	maturity: "stable",

	requires: ["postgresql", "redis"],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 128,
	gpuRequired: false,
};
