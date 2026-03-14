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
	official: "ghcr.io/zeroclaw-labs/zeroclaw",
};

function getZeroclawImage(_variant: string, version: string): string {
	const base = IMAGE_VARIANTS.official;
	const tag = version !== "latest" ? version : "latest";
	return `${base}:${tag}`;
}

const PROVIDER_ENV_KEYS = [
	"API_KEY",
	"OPENAI_API_KEY",
	"ANTHROPIC_API_KEY",
	"OPENROUTER_API_KEY",
];

export const zeroclawFramework: AgentFrameworkDefinition = {
	id: "zeroclaw",
	name: "ZeroClaw",
	icon: "⚡",
	description: "Rust-based 3.4MB agent binary with <10ms cold start",
	runtime: "rust",
	canBePrimary: true,
	canBeCompanion: true,
	networkName: "zeroclaw-network",
	imageVariants: IMAGE_VARIANTS,
	defaultImageVariant: "official",

	buildGatewayService(
		resolved: ResolverOutput,
		options: FrameworkComposeOptions,
		dependsOn?: Record<string, { condition: string }>,
	): GatewayBuildResult {
		const allVolumes = new Set<string>();
		const defaultImage = getZeroclawImage(
			options.frameworkImageVariant ?? "official",
			options.frameworkVersion,
		);

		const gatewayEnv: Record<string, string> = {
			API_KEY: "${API_KEY}",
			PROVIDER: "${ZEROCLAW_PROVIDER:-openrouter}",
			ZEROCLAW_GATEWAY_PORT: "${ZEROCLAW_GATEWAY_PORT:-42617}",
			ZEROCLAW_ALLOW_PUBLIC_BIND: "true",
		};

		// Collect env vars from companion services
		for (const { definition: def } of resolved.services) {
			for (const env of def.openclawEnvVars) {
				gatewayEnv[env.key] = env.secret ? `\${${env.key}}` : env.defaultValue;
			}
		}

		const gateway: Record<string, unknown> = {
			image: `\${ZEROCLAW_IMAGE:-${defaultImage}}`,
			environment: gatewayEnv,
			volumes: ["${ZEROCLAW_DATA_DIR:-./zeroclaw/data}:/zeroclaw-data"],
			ports: ["${ZEROCLAW_HOST_PORT:-3000}:${ZEROCLAW_GATEWAY_PORT:-42617}"],
			networks: [this.networkName],
			restart: "unless-stopped",
			deploy: {
				resources: {
					limits: { cpus: "2", memory: "2G" },
					reservations: { cpus: "0.5", memory: "512M" },
				},
			},
			healthcheck: {
				test: ["CMD", "zeroclaw", "status"],
				interval: "60s",
				timeout: "10s",
				retries: 3,
				start_period: "10s",
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
		// ZeroClaw uses config.toml; generated on first run or via env vars
		return null;
	},

	getBaseEnvVars(_options: FrameworkEnvOptions): EnvLine[] {
		return [
			{
				comment: "ZeroClaw Docker image override",
				key: "ZEROCLAW_IMAGE",
				exampleValue: "",
				actualValue: "",
			},
			{
				comment: "LLM provider name (openrouter, anthropic, openai, etc.)",
				key: "ZEROCLAW_PROVIDER",
				exampleValue: "openrouter",
				actualValue: "openrouter",
			},
			{
				comment: "Internal gateway port inside container",
				key: "ZEROCLAW_GATEWAY_PORT",
				exampleValue: "42617",
				actualValue: "42617",
			},
			{
				comment: "Host-facing port for ZeroClaw gateway",
				key: "ZEROCLAW_HOST_PORT",
				exampleValue: "3000",
				actualValue: "3000",
			},
			{
				comment: "Host path to ZeroClaw data directory",
				key: "ZEROCLAW_DATA_DIR",
				exampleValue: "./zeroclaw/data",
				actualValue: "./zeroclaw/data",
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
		return "ZeroClaw Core";
	},
};
