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
	official: "smanx/nanobot",
	birdxs: "birdxs/nanobot",
};

function getNanobotImage(variant: string, version: string): string {
	const base = IMAGE_VARIANTS[variant] ?? IMAGE_VARIANTS.official;
	const tag = version !== "latest" ? version : "latest";
	return `${base}:${tag}`;
}

const PROVIDER_ENV_KEYS = [
	"OPENAI_API_KEY",
	"ANTHROPIC_API_KEY",
	"OPENROUTER_API_KEY",
	"DEEPSEEK_API_KEY",
	"MISTRAL_API_KEY",
];

export const nanobotFramework: AgentFrameworkDefinition = {
	id: "nanobot",
	name: "NanoBot",
	icon: "🤏",
	description: "Ultra-lightweight ~4K-line Python agent with 11 providers and 11 channels",
	runtime: "python",
	canBePrimary: true,
	canBeCompanion: true,
	networkName: "nanobot-network",
	imageVariants: IMAGE_VARIANTS,
	defaultImageVariant: "official",

	buildGatewayService(
		resolved: ResolverOutput,
		options: FrameworkComposeOptions,
		dependsOn?: Record<string, { condition: string }>,
	): GatewayBuildResult {
		const allVolumes = new Set<string>();
		const defaultImage = getNanobotImage(
			options.frameworkImageVariant ?? "official",
			options.frameworkVersion,
		);

		const gatewayEnv: Record<string, string> = {};
		for (const key of PROVIDER_ENV_KEYS) {
			gatewayEnv[key] = `\${${key}}`;
		}

		// Collect env vars from companion services
		for (const { definition: def } of resolved.services) {
			for (const env of def.openclawEnvVars) {
				gatewayEnv[env.key] = env.secret ? `\${${env.key}}` : env.defaultValue;
			}
		}

		const gateway: Record<string, unknown> = {
			image: `\${NANOBOT_IMAGE:-${defaultImage}}`,
			environment: gatewayEnv,
			volumes: ["${NANOBOT_CONFIG_DIR:-./nanobot/config}:/root/.nanobot"],
			ports: ["${NANOBOT_GATEWAY_PORT:-18790}:18790"],
			networks: [this.networkName],
			restart: "unless-stopped",
			deploy: {
				resources: {
					limits: { cpus: "1", memory: "1G" },
					reservations: { cpus: "0.25", memory: "256M" },
				},
			},
			healthcheck: {
				test: ["CMD", "curl", "-sf", "http://localhost:18790/health", "||", "exit", "1"],
				interval: "30s",
				timeout: "5s",
				retries: 3,
				start_period: "15s",
			},
		};

		if (dependsOn && Object.keys(dependsOn).length > 0) {
			gateway.depends_on = dependsOn;
		}

		// CLI service for one-off commands
		const cliService: Record<string, unknown> = {
			image: `\${NANOBOT_IMAGE:-${defaultImage}}`,
			environment: gatewayEnv,
			volumes: ["${NANOBOT_CONFIG_DIR:-./nanobot/config}:/root/.nanobot"],
			networks: [this.networkName],
			profiles: ["cli"],
			command: ["agent", "-m", "Hello!"],
		};

		return { gatewayService: gateway, cliService, allVolumes };
	},

	generateConfig(
		_resolved: ResolverOutput,
		_options: FrameworkConfigOptions,
	): FrameworkConfigResult | null {
		// NanoBot uses ~/.nanobot/config.json, generated via `nanobot init`
		return null;
	},

	getBaseEnvVars(options: FrameworkEnvOptions): EnvLine[] {
		const defaultImage = getNanobotImage(
			options.frameworkImageVariant ?? "official",
			options.frameworkVersion,
		);

		return [
			{
				comment: "NanoBot Docker image override",
				key: "NANOBOT_IMAGE",
				exampleValue: defaultImage,
				actualValue: "",
			},
			{
				comment: "NanoBot gateway port",
				key: "NANOBOT_GATEWAY_PORT",
				exampleValue: "18790",
				actualValue: "18790",
			},
			{
				comment: "Host path to NanoBot configuration directory",
				key: "NANOBOT_CONFIG_DIR",
				exampleValue: "./nanobot/config",
				actualValue: "./nanobot/config",
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
		return "NanoBot Core";
	},
};
