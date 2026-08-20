import { stringify } from "yaml";
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

// NOTE: The official image does not exist yet. Users should override via
// HERMES_IMAGE env var or use the "build" variant with a local clone.
const IMAGE_VARIANTS: Record<string, string> = {
	official: "ghcr.io/nousresearch/hermes-agent",
	build: "hermes-agent",
};

function getHermesImage(variant: string, _version: string): string {
	const base = IMAGE_VARIANTS[variant] ?? IMAGE_VARIANTS.official;
	const tag = variant === "build" ? "local" : "latest";
	return `${base}:${tag}`;
}

const PROVIDER_ENV_KEYS = [
	"OPENROUTER_API_KEY",
	"ANTHROPIC_API_KEY",
	"OPENAI_API_KEY",
	"DEEPSEEK_API_KEY",
	"GOOGLE_API_KEY",
	"GROQ_API_KEY",
	"MISTRAL_API_KEY",
	"KIMI_API_KEY",
	"MINIMAX_API_KEY",
];

export const hermesFramework: AgentFrameworkDefinition = {
	id: "hermes",
	name: "Hermes Agent",
	icon: "☤",
	description:
		"Nous Research's self-improving AI agent with learning loop, skills, and multi-platform messaging",
	runtime: "python",
	canBePrimary: true,
	canBeCompanion: true,
	networkName: "hermes-network",
	imageVariants: IMAGE_VARIANTS,
	defaultImageVariant: "official",

	buildGatewayService(
		resolved: ResolverOutput,
		options: FrameworkComposeOptions,
		dependsOn?: Record<string, { condition: string }>,
	): GatewayBuildResult {
		const allVolumes = new Set<string>();
		const defaultImage = getHermesImage(
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

		// Hermes-specific configuration
		gatewayEnv.API_SERVER_ENABLED = "true";
		gatewayEnv.API_SERVER_HOST = "0.0.0.0";
		gatewayEnv.API_SERVER_PORT = "8642";
		gatewayEnv.API_SERVER_KEY = "${HERMES_API_KEY}";
		gatewayEnv.HERMES_HOME = "/data";
		gatewayEnv.LLM_MODEL = "${LLM_MODEL:-anthropic/claude-sonnet-4-5-20250929}";
		gatewayEnv.TERMINAL_ENV = "local";

		// Messaging platform tokens (injected from .env)
		gatewayEnv.TELEGRAM_BOT_TOKEN = "${TELEGRAM_BOT_TOKEN:-}";
		gatewayEnv.DISCORD_BOT_TOKEN = "${DISCORD_BOT_TOKEN:-}";

		allVolumes.add("hermes-data");

		const gateway: Record<string, unknown> = {
			image: `\${HERMES_IMAGE:-${defaultImage}}`,
			environment: gatewayEnv,
			volumes: ["hermes-data:/data"],
			ports: ["${HERMES_API_PORT:-8642}:8642", "${HERMES_WEBHOOK_PORT:-8644}:8644"],
			networks: [this.networkName],
			restart: "unless-stopped",
			healthcheck: {
				test: ["CMD", "curl", "-sf", "http://localhost:8642/health"],
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

	buildCompanionService(
		_resolved: ResolverOutput,
		options: FrameworkComposeOptions,
	): Record<string, unknown> | null {
		const defaultImage = getHermesImage(
			options.frameworkImageVariant ?? "official",
			options.frameworkVersion,
		);

		const env: Record<string, string> = {};
		for (const key of PROVIDER_ENV_KEYS) {
			env[key] = `\${${key}}`;
		}

		env.API_SERVER_ENABLED = "true";
		env.API_SERVER_HOST = "0.0.0.0";
		env.API_SERVER_PORT = "8642";
		env.API_SERVER_KEY = "${HERMES_API_KEY}";
		env.HERMES_HOME = "/data";
		env.LLM_MODEL = "${LLM_MODEL:-anthropic/claude-sonnet-4-5-20250929}";
		env.TERMINAL_ENV = "local";

		return {
			image: `\${HERMES_IMAGE:-${defaultImage}}`,
			environment: env,
			volumes: ["hermes-companion-data:/data"],
			ports: ["${HERMES_API_PORT:-8642}:8642"],
			networks: [this.networkName],
			restart: "unless-stopped",
			healthcheck: {
				test: ["CMD", "curl", "-sf", "http://localhost:8642/health"],
				interval: "30s",
				timeout: "5s",
				retries: 5,
				start_period: "30s",
			},
		};
	},

	generateConfig(
		_resolved: ResolverOutput,
		_options: FrameworkConfigOptions,
	): FrameworkConfigResult | null {
		const config = {
			model: "${LLM_MODEL:-anthropic/claude-sonnet-4-5-20250929}",
			toolsets: ["hermes-cli"],
			agent: { max_turns: 90 },
			terminal: {
				backend: "local",
				timeout: 180,
			},
			api_server: {
				enabled: true,
				host: "0.0.0.0",
				port: 8642,
			},
			memory: {
				enabled: true,
			},
		};

		return {
			path: "hermes/config.yaml",
			content: stringify(config, { lineWidth: 120 }),
		};
	},

	getBaseEnvVars(options: FrameworkEnvOptions): EnvLine[] {
		const imageVariantMap: Record<string, string> = {
			official: "",
			build: "hermes-agent:local",
		};
		const imageValue = imageVariantMap[options.frameworkImageVariant ?? "official"] ?? "";

		return [
			{
				comment: "Hermes Agent Docker image override",
				key: "HERMES_IMAGE",
				exampleValue: "",
				actualValue: imageValue,
			},
			{
				comment: "Hermes API server port",
				key: "HERMES_API_PORT",
				exampleValue: "8642",
				actualValue: "8642",
			},
			{
				comment: "Hermes webhook receiver port",
				key: "HERMES_WEBHOOK_PORT",
				exampleValue: "8644",
				actualValue: "8644",
			},
			{
				comment: "Hermes API server authentication key",
				key: "HERMES_API_KEY",
				exampleValue: "change-me",
				actualValue: "",
			},
			{
				comment: "LLM model in provider/model format",
				key: "LLM_MODEL",
				exampleValue: "anthropic/claude-sonnet-4-5-20250929",
				actualValue: "anthropic/claude-sonnet-4-5-20250929",
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
		return "Hermes Agent Core";
	},
};
