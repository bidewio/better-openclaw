import type { ResolverOutput } from "../types.js";
import type {
	AgentFrameworkDefinition,
	EnvLine,
	FrameworkComposeOptions,
	FrameworkConfigOptions,
	FrameworkConfigResult,
	FrameworkEnvOptions,
	GatewayBuildResult,
} from "./types.js";

const IMAGE_VARIANTS: Record<string, string> = {
	official: "ghcr.io/zeeno-atl/claude-code",
};

function getClaudeCodeImage(_variant: string, version: string): string {
	const base = IMAGE_VARIANTS.official;
	const tag = version !== "latest" ? version : "1.0";
	return `${base}:${tag}`;
}

const PROVIDER_ENV_KEYS = ["ANTHROPIC_API_KEY"];

export const claudeCodeFramework: AgentFrameworkDefinition = {
	id: "claude-code",
	name: "Claude Code",
	icon: "🟣",
	description: "Anthropic's agentic coding assistant with full codebase understanding",
	runtime: "node",
	canBePrimary: true,
	canBeCompanion: true,
	networkName: "claude-code-network",
	imageVariants: IMAGE_VARIANTS,
	defaultImageVariant: "official",

	buildGatewayService(
		_resolved: ResolverOutput,
		options: FrameworkComposeOptions,
		dependsOn?: Record<string, { condition: string }>,
	): GatewayBuildResult {
		const allVolumes = new Set<string>();
		const defaultImage = getClaudeCodeImage(
			options.frameworkImageVariant ?? "official",
			options.frameworkVersion,
		);

		const gatewayEnv: Record<string, string> = {
			ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}",
		};

		const gateway: Record<string, unknown> = {
			image: `\${CLAUDE_CODE_IMAGE:-${defaultImage}}`,
			environment: gatewayEnv,
			volumes: [
				"${CLAUDE_CODE_CONFIG_DIR:-./claude-code/config}:/home/coder/.claude",
				"${CLAUDE_CODE_WORKSPACE_DIR:-./claude-code/workspace}:/workspace",
			],
			networks: [this.networkName],
			restart: "unless-stopped",
			stdin_open: true,
			tty: true,
			command: "tail -f /dev/null",
		};

		if (dependsOn && Object.keys(dependsOn).length > 0) {
			gateway.depends_on = dependsOn;
		}

		return { gatewayService: gateway, cliService: null, allVolumes };
	},

	generateConfig(
		_resolved: ResolverOutput,
		_options: FrameworkConfigOptions,
	): FrameworkConfigResult | null {
		// Claude Code uses env-based config
		return null;
	},

	getBaseEnvVars(_options: FrameworkEnvOptions): EnvLine[] {
		return [
			{
				comment: "Claude Code Docker image override",
				key: "CLAUDE_CODE_IMAGE",
				exampleValue: "",
				actualValue: "",
			},
			{
				comment: "Host path to Claude Code config directory",
				key: "CLAUDE_CODE_CONFIG_DIR",
				exampleValue: "./claude-code/config",
				actualValue: "./claude-code/config",
			},
			{
				comment: "Host path to Claude Code workspace directory",
				key: "CLAUDE_CODE_WORKSPACE_DIR",
				exampleValue: "./claude-code/workspace",
				actualValue: "./claude-code/workspace",
			},
		];
	},

	getMandatoryServices(): string[] {
		return [];
	},

	getRecommendedServices(): string[] {
		return [];
	},

	getProviderEnvKeys(): string[] {
		return [...PROVIDER_ENV_KEYS];
	},

	getEnvSectionName(): string {
		return "Claude Code Core";
	},
};
