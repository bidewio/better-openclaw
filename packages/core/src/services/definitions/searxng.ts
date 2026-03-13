import type { ServiceDefinition } from "../../types.js";

export const searxngDefinition: ServiceDefinition = {
	id: "searxng",
	name: "SearXNG",
	description:
		"Privacy-respecting, self-hosted metasearch engine that aggregates results from multiple search engines without tracking.",
	category: "search",
	icon: "🔍",

	image: "searxng/searxng",
	imageTag: "2026.2.23-4964d664f",
	ports: [
		{
			host: 8080,
			container: 8080,
			description: "SearXNG web interface and API",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "searxng-data",
			containerPath: "/etc/searxng",
			description: "SearXNG configuration and settings",
		},
	],
	environment: [],
	healthcheck: {
		test: "wget -q --spider http://localhost:8080/ || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "15s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "searxng-search", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "SEARXNG_HOST",
			defaultValue: "searxng",
			secret: false,
			description: "SearXNG hostname for OpenClaw",
			required: true,
		},
		{
			key: "SEARXNG_PORT",
			defaultValue: "8080",
			secret: false,
			description: "SearXNG port for OpenClaw",
			required: true,
		},
	],

	docsUrl: "https://docs.searxng.org/",
	tags: ["search", "meta-search", "privacy"],
	maturity: "stable",

	requires: [],
	recommends: ["redis"],
	conflictsWith: [],

	minMemoryMB: 256,
	gpuRequired: false,
	capDropCompatible: false,
	proxyPath: "/searxng",
	firstBootCapabilities: ["CHOWN", "SETGID", "SETUID"],
};
