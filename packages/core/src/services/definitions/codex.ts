import type { ServiceDefinition } from "../../types.js";

export const codexDefinition: ServiceDefinition = {
	id: "codex",
	name: "OpenAI Codex CLI",
	description:
		"OpenAI's lightweight coding agent that runs in the terminal. Uses OpenAI models to understand context, suggest edits, and execute commands in a sandboxed environment.",
	category: "agent-framework",
	icon: "🟢",

	image: "node",
	imageTag: "24-alpine",
	ports: [],
	volumes: [
		{
			name: "codex-config",
			containerPath: "/home/node/.codex",
			description: "Codex CLI configuration and cache",
		},
	],
	environment: [
		{
			key: "OPENAI_API_KEY",
			defaultValue: "",
			secret: true,
			description: "OpenAI API key for Codex",
			required: true,
		},
	],
	command: "npx @openai/codex@latest --headless",
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://github.com/openai/codex",
	tags: ["ai-coding", "openai", "agent"],
	maturity: "beta",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 256,
	gpuRequired: false,
};
