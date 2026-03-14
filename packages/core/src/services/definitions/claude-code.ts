import type { ServiceDefinition } from "../../types.js";

export const claudeCodeDefinition: ServiceDefinition = {
	id: "claude-code",
	name: "Claude Code",
	description:
		"Anthropic's agentic coding assistant that runs in the terminal. Claude Code understands your entire codebase, executes commands, and helps with complex multi-file edits.",
	category: "agent-framework",
	icon: "🟣",

	image: "ghcr.io/zeeno-atl/claude-code",
	imageTag: "1.0",
	ports: [],
	volumes: [
		{
			name: "claude-code-config",
			containerPath: "/home/coder/.claude",
			description: "Claude Code config and auth",
		},
	],
	environment: [
		{
			key: "ANTHROPIC_API_KEY",
			defaultValue: "",
			secret: true,
			description: "Anthropic API key for Claude Code",
			required: true,
		},
	],
	command: "tail -f /dev/null",
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [
		{
			key: "CLAUDE_CODE_WORKSPACE",
			defaultValue: "/home/node/.openclaw/workspace",
			secret: false,
			description: "Shared workspace path with Claude Code",
			required: false,
		},
	],

	docsUrl: "https://docs.anthropic.com/en/docs/claude-code",
	tags: ["ai-coding", "claude", "anthropic", "agent"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
};
