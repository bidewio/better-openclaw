import type { ServiceDefinition } from "../../types.js";

export const ntfyDefinition: ServiceDefinition = {
	id: "ntfy",
	name: "ntfy",
	description:
		"Simple HTTP-based pub-sub notification service that lets you send push notifications to phones and desktops via PUT/POST requests.",
	category: "communication",
	icon: "📣",

	image: "binwiederhier/ntfy",
	imageTag: "v2.20.1",
	ports: [
		{
			host: 8084,
			container: 80,
			description: "ntfy web interface and API",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "ntfy-cache",
			containerPath: "/var/cache/ntfy",
			description: "ntfy message cache and attachment storage",
		},
	],
	environment: [],
	command: "serve",
	healthcheck: {
		test: "wget -q --spider http://localhost:80/v1/health || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [
		{
			key: "NTFY_HOST",
			defaultValue: "ntfy",
			secret: false,
			description: "ntfy hostname for OpenClaw",
			required: true,
		},
		{
			key: "NTFY_PORT",
			defaultValue: "80",
			secret: false,
			description: "ntfy port for OpenClaw",
			required: true,
		},
	],

	docsUrl: "https://docs.ntfy.sh/",
	tags: ["notifications", "pub-sub", "push", "http"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: ["gotify"],

	minMemoryMB: 64,
	gpuRequired: false,
};
