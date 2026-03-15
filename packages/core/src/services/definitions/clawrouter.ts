import type { ServiceDefinition } from "../../types.js";

export const clawrouterDefinition: ServiceDefinition = {
	id: "clawrouter",
	name: "ClawRouter",
	description:
		"Smart LLM router that classifies queries and routes to the cheapest capable model across 41+ options (OpenAI, Anthropic, Google, DeepSeek, xAI, and more). Exposes an OpenAI-compatible proxy with intelligent cost optimization.",
	category: "ai",
	icon: "🔀",

	gitSource: {
		repoUrl: "https://github.com/diopisemou/ClawRouter.git",
		branch: "main",
		postCloneCommands: [],
	},
	buildContext: {
		dockerfile: "Dockerfile",
		context: ".",
	},

	ports: [
		{
			host: 8402,
			container: 8402,
			description: "ClawRouter proxy (OpenAI-compatible API)",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "clawrouter-data",
			containerPath: "/root/.openclaw/blockrun",
			description: "Wallet, usage logs, and configuration",
		},
	],
	environment: [
		{
			key: "CLAWROUTER_DIRECT_KEY_MODE",
			defaultValue: "true",
			secret: false,
			description: "Bypass x402 payments and use provider API keys directly",
			required: false,
		},
		{
			key: "BLOCKRUN_PROXY_PORT",
			defaultValue: "8402",
			secret: false,
			description: "Proxy listen port",
			required: false,
		},
		{
			key: "OPENAI_API_KEY",
			defaultValue: "${OPENAI_API_KEY}",
			secret: true,
			description: "OpenAI API key (for direct-key routing)",
			required: false,
		},
		{
			key: "ANTHROPIC_API_KEY",
			defaultValue: "${ANTHROPIC_API_KEY}",
			secret: true,
			description: "Anthropic API key (for direct-key routing)",
			required: false,
		},
		{
			key: "GOOGLE_API_KEY",
			defaultValue: "${GOOGLE_API_KEY}",
			secret: true,
			description: "Google API key (for direct-key routing)",
			required: false,
		},
		{
			key: "XAI_API_KEY",
			defaultValue: "${XAI_API_KEY}",
			secret: true,
			description: "xAI API key (for direct-key routing)",
			required: false,
		},
		{
			key: "DEEPSEEK_API_KEY",
			defaultValue: "${DEEPSEEK_API_KEY}",
			secret: true,
			description: "DeepSeek API key (for direct-key routing)",
			required: false,
		},
		{
			key: "GROQ_API_KEY",
			defaultValue: "${GROQ_API_KEY}",
			secret: true,
			description: "Groq API key (for direct-key routing)",
			required: false,
		},
		{
			key: "MISTRAL_API_KEY",
			defaultValue: "${MISTRAL_API_KEY}",
			secret: true,
			description: "Mistral API key (for direct-key routing)",
			required: false,
		},
		{
			key: "TOGETHER_API_KEY",
			defaultValue: "${TOGETHER_API_KEY}",
			secret: true,
			description: "Together AI API key (for direct-key routing)",
			required: false,
		},
	],
	healthcheck: {
		test: "wget -q --spider http://localhost:8402/health || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "15s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [
		{
			key: "CLAWROUTER_URL",
			defaultValue: "http://clawrouter:8402",
			secret: false,
			description: "ClawRouter proxy URL for OpenClaw agents",
			required: true,
		},
	],

	docsUrl: "https://github.com/diopisemou/ClawRouter",
	tags: ["llm", "router", "proxy", "cost-optimization", "smart-routing"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 128,
	gpuRequired: false,
	proxyPath: "/clawrouter",
};
