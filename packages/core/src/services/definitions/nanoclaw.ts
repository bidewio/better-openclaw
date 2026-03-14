import type { ServiceDefinition } from "../../types.js";

export const nanoclawDefinition: ServiceDefinition = {
	id: "nanoclaw",
	name: "NanoClaw",
	description:
		"Security-first containerized AI agent (~3,900 lines). Each task runs in an isolated Docker container. Native WhatsApp, Telegram, Discord, Slack, and Gmail support.",
	category: "agent-framework",
	icon: "🔒",

	image: "node",
	imageTag: "22-slim",
	buildContext: {
		context: "https://github.com/qwibitai/nanoclaw.git",
		dockerfile: "container/Dockerfile",
	},
	ports: [],
	volumes: [
		{
			name: "nanoclaw-store",
			containerPath: "/app/store",
			description: "NanoClaw SQLite database and session data",
		},
		{
			name: "nanoclaw-groups",
			containerPath: "/app/groups",
			description: "NanoClaw group workspaces",
		},
	],
	environment: [
		{
			key: "ANTHROPIC_API_KEY",
			defaultValue: "",
			secret: true,
			description: "Anthropic API key for Claude (required)",
			required: true,
		},
		{
			key: "ASSISTANT_NAME",
			defaultValue: "Andy",
			secret: false,
			description: "Bot display name",
			required: false,
		},
		{
			key: "CONTAINER_IMAGE",
			defaultValue: "nanoclaw-agent:latest",
			secret: false,
			description: "Agent container image for ephemeral task containers",
			required: false,
		},
		{
			key: "MAX_CONCURRENT_CONTAINERS",
			defaultValue: "5",
			secret: false,
			description: "Maximum parallel agent containers",
			required: false,
		},
	],
	command: "node dist/index.js",
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://nanoclaw.dev/",
	tags: ["agent", "security", "whatsapp", "containerized", "claude"],
	maturity: "beta",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 256,
	gpuRequired: false,
};
