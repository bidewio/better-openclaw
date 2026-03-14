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
	official: "node",
};

const PROVIDER_ENV_KEYS = ["OPENAI_API_KEY"];

export const codexFramework: AgentFrameworkDefinition = {
	id: "codex",
	name: "OpenAI Codex CLI",
	icon: "🟢",
	description: "OpenAI's lightweight coding agent with sandboxed execution",
	runtime: "node",
	canBePrimary: true,
	canBeCompanion: true,
	networkName: "codex-network",
	imageVariants: IMAGE_VARIANTS,
	defaultImageVariant: "official",

	buildGatewayService(
		_resolved: ResolverOutput,
		_options: FrameworkComposeOptions,
		dependsOn?: Record<string, { condition: string }>,
	): GatewayBuildResult {
		const allVolumes = new Set<string>();

		const gatewayEnv: Record<string, string> = {
			OPENAI_API_KEY: "${OPENAI_API_KEY}",
		};

		const gateway: Record<string, unknown> = {
			image: "node:24-alpine",
			environment: gatewayEnv,
			volumes: [
				"${CODEX_CONFIG_DIR:-./codex/config}:/home/node/.codex",
				"${CODEX_WORKSPACE_DIR:-./codex/workspace}:/workspace",
			],
			networks: [this.networkName],
			restart: "unless-stopped",
			stdin_open: true,
			tty: true,
			command: "npx @openai/codex@latest --headless",
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
		// Codex uses env-based config
		return null;
	},

	getBaseEnvVars(_options: FrameworkEnvOptions): EnvLine[] {
		return [
			{
				comment: "Host path to Codex config directory",
				key: "CODEX_CONFIG_DIR",
				exampleValue: "./codex/config",
				actualValue: "./codex/config",
			},
			{
				comment: "Host path to Codex workspace directory",
				key: "CODEX_WORKSPACE_DIR",
				exampleValue: "./codex/workspace",
				actualValue: "./codex/workspace",
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
		return "Codex Core";
	},
};
