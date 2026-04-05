import type { ServiceDefinition } from "../../types.js";

export const caddyDefinition: ServiceDefinition = {
	id: "caddy",
	name: "Caddy",
	description:
		"Modern, fast reverse proxy and web server with automatic HTTPS via Let's Encrypt, HTTP/3 support, and simple configuration.",
	category: "proxy",
	icon: "🔒",

	image: "caddy",
	imageTag: "2.11.2",
	ports: [
		{
			host: 80,
			container: 80,
			description: "HTTP traffic",
			exposed: true,
		},
		{
			host: 443,
			container: 443,
			description: "HTTPS traffic",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "caddy-data",
			containerPath: "/data",
			description: "Caddy TLS certificates and persistent data",
		},
		{
			name: "caddy-config",
			containerPath: "/config",
			description: "Caddy configuration storage",
		},
	],
	environment: [],
	healthcheck: {
		test: "curl -sf http://localhost:80 || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "5s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [
		{
			key: "CADDY_HOST",
			defaultValue: "caddy",
			secret: false,
			description: "Caddy reverse proxy hostname",
			required: false,
		},
		{
			key: "CADDY_HTTP_PORT",
			defaultValue: "80",
			secret: false,
			description: "Caddy HTTP port",
			required: false,
		},
	],

	docsUrl: "https://caddyserver.com/docs/",
	tags: ["reverse-proxy", "auto-https", "ssl"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: ["traefik"],

	minMemoryMB: 64,
	gpuRequired: false,
};
