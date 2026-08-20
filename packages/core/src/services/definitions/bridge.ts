import type { ServiceDefinition } from "../../types.js";

export const bridgeDefinition: ServiceDefinition = {
	id: "bridge",
	name: "Bridge Sidecar",
	description:
		"Stack management sidecar providing REST endpoints for inspecting service status, reading logs, and executing management commands (restart, stop, start, scale). Syncs live status to Mission Control via heartbeat.",
	category: "dev-tools",
	icon: "🌉",

	image: "ghcr.io/bidewio/bridge",
	imageTag: "latest",

	ports: [
		{
			host: 3457,
			container: 3457,
			description: "Bridge REST API",
			exposed: false,
		},
	],
	volumes: [
		{
			name: "bridge-docker-sock",
			containerPath: "/var/run/docker.sock",
			description:
				"Docker Engine socket for container management (must be bind-mounted to /var/run/docker.sock on host)",
		},
		{
			name: "bridge-project",
			containerPath: "/project",
			description:
				"Project root, read-only, for docker-compose.yml and .env access (bind-mount the project directory here)",
		},
	],
	environment: [
		{
			key: "PROJECT_NAME",
			defaultValue: "${PROJECT_NAME}",
			secret: false,
			description: "Docker Compose project name",
			required: true,
		},
		{
			key: "PROJECT_DIR",
			defaultValue: "/project",
			secret: false,
			description: "Path to the project directory inside the container",
			required: true,
		},
		{
			key: "BRIDGE_TOKEN",
			defaultValue: "",
			secret: true,
			description:
				"Shared secret for authenticating bridge API requests. Auto-generated during stack generation.",
			required: true,
		},
		{
			key: "CONVEX_URL",
			defaultValue: "",
			secret: false,
			description: "Convex backend URL for heartbeat sync (optional)",
			required: false,
		},
		{
			key: "FLEET_INSTANCE_ID",
			defaultValue: "",
			secret: false,
			description: "Fleet instance ID in Convex for heartbeat reporting (optional)",
			required: false,
		},
	],
	healthcheck: {
		test: "wget -q --spider http://localhost:3457/health || exit 1",
		interval: "10s",
		timeout: "5s",
		retries: 3,
		startPeriod: "10s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://github.com/bidewio/better-openclaw/tree/main/packages/bridge",
	selfHostedDocsUrl: "https://github.com/bidewio/better-openclaw/tree/main/packages/bridge",
	tags: ["management", "docker", "sidecar", "api", "monitoring"],
	maturity: "beta",

	requires: [],
	recommends: ["mission-control"],
	conflictsWith: [],
	mandatory: false,

	minMemoryMB: 64,
	gpuRequired: false,
};
