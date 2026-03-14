import type { ServiceDefinition } from "../../types.js";

export const copawDefinition: ServiceDefinition = {
	id: "copaw",
	name: "CoPaw",
	description:
		"Alibaba's high-performance personal agent workstation with ReMe persistent memory, cron-based autonomy, and multi-channel support (Discord, Telegram, DingTalk, Feishu).",
	category: "agent-framework",
	icon: "🐾",

	image: "agentscope/copaw",
	imageTag: "latest",
	ports: [
		{
			host: 8088,
			container: 8088,
			description: "CoPaw web console",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "copaw-data",
			containerPath: "/app/working",
			description: "CoPaw config, memory, skills, and daily logs",
		},
		{
			name: "copaw-secrets",
			containerPath: "/app/working.secret",
			description: "CoPaw secret/credential storage",
		},
	],
	environment: [
		{
			key: "DASHSCOPE_API_KEY",
			defaultValue: "",
			secret: true,
			description: "Alibaba DashScope API key (primary provider)",
			required: false,
		},
		{
			key: "OPENAI_API_KEY",
			defaultValue: "",
			secret: true,
			description: "OpenAI API key (alternative provider)",
			required: false,
		},
		{
			key: "ANTHROPIC_API_KEY",
			defaultValue: "",
			secret: true,
			description: "Anthropic API key (alternative provider)",
			required: false,
		},
		{
			key: "TAVILY_API_KEY",
			defaultValue: "",
			secret: true,
			description: "Tavily API key for web search tool",
			required: false,
		},
	],
	healthcheck: {
		test: "curl -sf http://localhost:8088/ || exit 1",
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
			key: "COPAW_HOST",
			defaultValue: "copaw",
			secret: false,
			description: "CoPaw hostname for gateway integration",
			required: false,
		},
		{
			key: "COPAW_PORT",
			defaultValue: "8088",
			secret: false,
			description: "CoPaw web console port",
			required: false,
		},
	],

	docsUrl: "https://copaw.bot/",
	tags: ["agent", "memory", "cron", "alibaba", "multi-channel"],
	maturity: "beta",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
};
