import type { ServiceDefinition } from "../../types.js";

export const nanobotDefinition: ServiceDefinition = {
	id: "nanobot",
	name: "NanoBot",
	description:
		"Ultra-lightweight ~4,000-line Python AI assistant (99% smaller than OpenClaw). Supports 11 LLM providers and 11 messaging channels including Telegram, Discord, and WhatsApp.",
	category: "agent-framework",
	icon: "🤏",

	image: "smanx/nanobot",
	imageTag: "latest",
	ports: [
		{
			host: 18790,
			container: 18790,
			description: "NanoBot gateway port",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "nanobot-config",
			containerPath: "/root/.nanobot",
			description: "NanoBot config, workspace, and channel data",
		},
	],
	environment: [
		{
			key: "ANTHROPIC_API_KEY",
			defaultValue: "",
			secret: true,
			description: "Anthropic API key",
			required: false,
		},
		{
			key: "OPENAI_API_KEY",
			defaultValue: "",
			secret: true,
			description: "OpenAI API key",
			required: false,
		},
		{
			key: "OPENROUTER_API_KEY",
			defaultValue: "",
			secret: true,
			description: "OpenRouter API key (supports many models)",
			required: false,
		},
	],
	healthcheck: {
		test: "curl -sf http://localhost:18790/health || exit 1",
		interval: "30s",
		timeout: "5s",
		retries: 3,
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [
		{
			key: "NANOBOT_HOST",
			defaultValue: "nanobot",
			secret: false,
			description: "NanoBot hostname for gateway integration",
			required: false,
		},
		{
			key: "NANOBOT_PORT",
			defaultValue: "18790",
			secret: false,
			description: "NanoBot gateway port",
			required: false,
		},
	],

	docsUrl: "https://github.com/HKUDS/nanobot",
	tags: ["agent", "lightweight", "python", "multi-channel", "multi-provider"],
	maturity: "beta",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 256,
	gpuRequired: false,
};
