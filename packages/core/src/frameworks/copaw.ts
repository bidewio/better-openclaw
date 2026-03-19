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
	official: "agentscope/copaw",
	pre: "agentscope/copaw",
};

function getCopawImage(variant: string, _version: string): string {
	const base = IMAGE_VARIANTS[variant] ?? IMAGE_VARIANTS.official;
	const tag = variant === "pre" ? "pre" : "latest";
	return `${base}:${tag}`;
}

const PROVIDER_ENV_KEYS = [
	"DASHSCOPE_API_KEY",
	"OPENAI_API_KEY",
	"ANTHROPIC_API_KEY",
	"GOOGLE_API_KEY",
	"DEEPSEEK_API_KEY",
	"GROQ_API_KEY",
	"OPENROUTER_API_KEY",
	"MISTRAL_API_KEY",
	"TAVILY_API_KEY",
];

export const copawFramework: AgentFrameworkDefinition = {
	id: "copaw",
	name: "CoPaw",
	icon: "🐾",
	description: "Alibaba's personal agent workstation with ReMe memory and cron autonomy",
	runtime: "python",
	canBePrimary: true,
	canBeCompanion: true,
	networkName: "copaw-network",
	imageVariants: IMAGE_VARIANTS,
	defaultImageVariant: "official",

	buildGatewayService(
		resolved: ResolverOutput,
		options: FrameworkComposeOptions,
		dependsOn?: Record<string, { condition: string }>,
	): GatewayBuildResult {
		const allVolumes = new Set<string>();
		const defaultImage = getCopawImage(
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
			image: `\${COPAW_IMAGE:-${defaultImage}}`,
			environment: gatewayEnv,
			volumes: [
				"${COPAW_DATA_DIR:-./copaw/data}:/app/working",
				"${COPAW_SECRETS_DIR:-./copaw/secrets}:/app/working.secret",
			],
			ports: ["${COPAW_PORT:-8088}:8088"],
			networks: [this.networkName],
			restart: "unless-stopped",
			healthcheck: {
				test: ["CMD", "curl", "-sf", "http://localhost:8088/", "||", "exit", "1"],
				interval: "30s",
				timeout: "5s",
				retries: 5,
				start_period: "30s",
			},
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
		// CoPaw uses config.json in the working directory, generated on first run
		return null;
	},

	getBaseEnvVars(options: FrameworkEnvOptions): EnvLine[] {
		const imageVariantMap: Record<string, string> = {
			official: "",
			pre: "agentscope/copaw:pre",
		};
		const imageValue = imageVariantMap[options.frameworkImageVariant ?? "official"] ?? "";

		return [
			{
				comment: "CoPaw Docker image override",
				key: "COPAW_IMAGE",
				exampleValue: "",
				actualValue: imageValue,
			},
			{
				comment: "CoPaw web console port",
				key: "COPAW_PORT",
				exampleValue: "8088",
				actualValue: "8088",
			},
			{
				comment: "Host path to CoPaw data directory",
				key: "COPAW_DATA_DIR",
				exampleValue: "./copaw/data",
				actualValue: "./copaw/data",
			},
			{
				comment: "Host path to CoPaw secrets directory",
				key: "COPAW_SECRETS_DIR",
				exampleValue: "./copaw/secrets",
				actualValue: "./copaw/secrets",
			},
		];
	},

	getMandatoryServices(): string[] {
		return [];
	},

	getRecommendedServices(): string[] {
		return ["clawrouter"];
	},

	getProviderEnvKeys(): string[] {
		return [...PROVIDER_ENV_KEYS];
	},

	getEnvSectionName(): string {
		return "CoPaw Core";
	},
};
