import type { ServiceDefinition } from "../../types.js";

export const vaultwardenDefinition: ServiceDefinition = {
	id: "vaultwarden",
	name: "Vaultwarden",
	description:
		"Unofficial Bitwarden compatible server written in Rust, perfect for self-hosted deployments.",
	category: "security",
	icon: "🔐",

	image: "vaultwarden/server",
	imageTag: "1.35.4-alpine",
	ports: [
		{
			host: 8843,
			container: 80,
			description: "Vaultwarden Web Interface / API",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "vaultwarden_data",
			containerPath: "/data",
			description: "Persistent Vaultwarden data storage",
		},
	],
	environment: [
		{
			key: "WEBSOCKET_ENABLED",
			defaultValue: "true",
			secret: false,
			description: "Enable WebSocket notifications",
			required: false,
		},
		{
			key: "SIGNUPS_ALLOWED",
			defaultValue: "true",
			secret: false,
			description: "Allow new user signups",
			required: false,
		},
	],
	healthcheck: {
		test: "curl --fail http://localhost:80/alive || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "15s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://github.com/dani-garcia/vaultwarden/wiki",
	tags: ["security", "passwords", "bitwarden", "secrets"],
	maturity: "stable",

	requires: [],
	recommends: ["caddy", "traefik"],
	conflictsWith: [],

	minMemoryMB: 128,
	gpuRequired: false,
};
