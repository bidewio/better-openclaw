import type { ServiceDefinition } from "../../types.js";

export const ollamaDefinition: ServiceDefinition = {
	id: "ollama",
	name: "Ollama",
	description:
		"Run large language models locally with an easy-to-use API. Supports a wide range of open-source models like Llama, Mistral, and more.",
	category: "ai",
	icon: "🦙",

	image: "ollama/ollama",
	imageTag: "0.17.0",
	ports: [
		{
			host: 11434,
			container: 11434,
			description: "Ollama REST API",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "ollama-data",
			containerPath: "/root/.ollama",
			description: "Persistent Ollama model storage and configuration",
		},
	],
	environment: [],
	healthcheck: {
		test: "curl -f http://localhost:11434/ || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "30s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "ollama-local-llm", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "OLLAMA_HOST",
			defaultValue: "ollama",
			secret: false,
			description: "Ollama hostname for OpenClaw",
			required: true,
		},
		{
			key: "OLLAMA_PORT",
			defaultValue: "11434",
			secret: false,
			description: "Ollama API port for OpenClaw",
			required: true,
		},
	],

	docsUrl: "https://github.com/ollama/ollama",
	tags: ["llm", "local-ai", "inference", "language-model"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 2048,
	gpuRequired: false,
	capDropCompatible: false,
	proxyPath: "/ollama",
};
