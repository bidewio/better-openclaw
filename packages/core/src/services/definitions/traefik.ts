import type { ServiceDefinition } from "../../types.js";

export const traefikDefinition: ServiceDefinition = {
	id: "traefik",
	name: "Traefik",
	description:
		"Cloud-native reverse proxy and load balancer with automatic service discovery, Let's Encrypt integration, and a built-in dashboard.",
	category: "proxy",
	icon: "🔀",

	image: "traefik",
	imageTag: "v3.6.12",
	ports: [
		{
			host: 80,
			container: 80,
			description: "HTTP entrypoint",
			exposed: true,
		},
		{
			host: 443,
			container: 443,
			description: "HTTPS entrypoint",
			exposed: true,
		},
		{
			host: 8085,
			container: 8080,
			description: "Traefik dashboard",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "traefik-certs",
			containerPath: "/letsencrypt",
			description: "Let's Encrypt certificate storage",
		},
	],
	environment: [],
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://doc.traefik.io/traefik/",
	tags: ["reverse-proxy", "load-balancer", "service-discovery"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: ["caddy"],

	minMemoryMB: 64,
	gpuRequired: false,
};
