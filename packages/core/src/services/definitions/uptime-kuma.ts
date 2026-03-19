import type { ServiceDefinition } from "../../types.js";

export const uptimeKumaDefinition: ServiceDefinition = {
	id: "uptime-kuma",
	name: "Uptime Kuma",
	description:
		"Self-hosted monitoring tool for tracking uptime of websites, APIs, and services with a sleek dashboard and multi-notification support.",
	category: "monitoring",
	icon: "📡",

	image: "louislam/uptime-kuma",
	imageTag: "2",
	ports: [
		{
			host: 3001,
			container: 3001,
			description: "Uptime Kuma web interface",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "uptime-kuma-data",
			containerPath: "/app/data",
			description: "Persistent Uptime Kuma data and configuration",
		},
	],
	environment: [],
	healthcheck: {
		test: "curl -sf http://localhost:3001 || exit 1",
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

	docsUrl: "https://github.com/louislam/uptime-kuma/wiki",
	tags: ["uptime", "monitoring", "status-page", "alerts"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 256,
	gpuRequired: false,
	capDropCompatible: false,
	proxyPath: "/uptime-kuma",
	firstBootCapabilities: ["CHOWN", "SETGID", "SETUID"],
};
