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

const PROVIDER_ENV_KEYS = ["ANTHROPIC_API_KEY"];

export const nanoclawFramework: AgentFrameworkDefinition = {
	id: "nanoclaw",
	name: "NanoClaw",
	icon: "🔒",
	description: "Security-first containerized agent with per-task isolation",
	runtime: "node",
	canBePrimary: true,
	canBeCompanion: true,
	networkName: "nanoclaw-network",
	imageVariants: IMAGE_VARIANTS,
	defaultImageVariant: "official",

	buildGatewayService(
		_resolved: ResolverOutput,
		_options: FrameworkComposeOptions,
		dependsOn?: Record<string, { condition: string }>,
	): GatewayBuildResult {
		const allVolumes = new Set<string>();

		const gatewayEnv: Record<string, string> = {
			ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}",
			ASSISTANT_NAME: "${NANOCLAW_ASSISTANT_NAME:-Andy}",
			CONTAINER_IMAGE: "${NANOCLAW_CONTAINER_IMAGE:-nanoclaw-agent:latest}",
			MAX_CONCURRENT_CONTAINERS: "${NANOCLAW_MAX_CONTAINERS:-5}",
		};

		const gateway: Record<string, unknown> = {
			build: {
				context: ".",
				dockerfile: "Dockerfile",
			},
			image: "nanoclaw:latest",
			environment: gatewayEnv,
			volumes: [
				"${NANOCLAW_STORE_DIR:-./nanoclaw/store}:/app/store",
				"${NANOCLAW_GROUPS_DIR:-./nanoclaw/groups}:/app/groups",
				"/var/run/docker.sock:/var/run/docker.sock",
			],
			networks: [this.networkName],
			restart: "unless-stopped",
			command: ["node", "dist/index.js"],
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
		// NanoClaw uses .env file only, no config files
		return null;
	},

	getBaseEnvVars(_options: FrameworkEnvOptions): EnvLine[] {
		return [
			{
				comment: "NanoClaw bot display name",
				key: "NANOCLAW_ASSISTANT_NAME",
				exampleValue: "Andy",
				actualValue: "Andy",
			},
			{
				comment: "Agent container image for ephemeral task containers",
				key: "NANOCLAW_CONTAINER_IMAGE",
				exampleValue: "nanoclaw-agent:latest",
				actualValue: "nanoclaw-agent:latest",
			},
			{
				comment: "Maximum parallel agent containers",
				key: "NANOCLAW_MAX_CONTAINERS",
				exampleValue: "5",
				actualValue: "5",
			},
			{
				comment: "Host path to NanoClaw SQLite store",
				key: "NANOCLAW_STORE_DIR",
				exampleValue: "./nanoclaw/store",
				actualValue: "./nanoclaw/store",
			},
			{
				comment: "Host path to NanoClaw group workspaces",
				key: "NANOCLAW_GROUPS_DIR",
				exampleValue: "./nanoclaw/groups",
				actualValue: "./nanoclaw/groups",
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
		return "NanoClaw Core";
	},
};
