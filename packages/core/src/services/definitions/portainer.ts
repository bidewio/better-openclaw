import type { ServiceDefinition } from "../../types.js";

export const portainerDefinition: ServiceDefinition = {
	id: "portainer",
	name: "Portainer",
	description: "Docker management UI for monitoring and managing your entire stack visually.",
	category: "dev-tools",
	icon: "🐳",

	image: "portainer/portainer-ce",
	imageTag: "2.40.0",
	ports: [
		{
			host: 9443,
			container: 9443,
			description: "Portainer HTTPS UI",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "portainer-data",
			containerPath: "/data",
			description: "Portainer data",
		},
		{
			name: "portainer-docker-sock",
			containerPath: "/var/run/docker.sock",
			description: "Docker socket (must be bind-mounted to /var/run/docker.sock on host)",
		},
	],
	environment: [],
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://docs.portainer.io/",
	tags: ["docker", "management", "monitoring", "ui", "containers"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 64,
	gpuRequired: false,
};
