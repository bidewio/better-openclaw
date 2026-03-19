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
	official: "nevamindai/memu-server",
};

function getMemuImage(_variant: string, version: string): string {
	const base = IMAGE_VARIANTS.official;
	const tag = version !== "latest" ? version : "latest";
	return `${base}:${tag}`;
}

const PROVIDER_ENV_KEYS = ["OPENAI_API_KEY", "OPENROUTER_API_KEY"];

export const memuFramework: AgentFrameworkDefinition = {
	id: "memu",
	name: "MemU",
	icon: "🧠",
	description: "Persistent knowledge graph memory agent backed by pgvector",
	runtime: "python",
	canBePrimary: true,
	canBeCompanion: true,
	networkName: "memu-network",
	imageVariants: IMAGE_VARIANTS,
	defaultImageVariant: "official",

	buildGatewayService(
		resolved: ResolverOutput,
		options: FrameworkComposeOptions,
		dependsOn?: Record<string, { condition: string }>,
	): GatewayBuildResult {
		const allVolumes = new Set<string>();
		const defaultImage = getMemuImage(
			options.frameworkImageVariant ?? "official",
			options.frameworkVersion,
		);

		const gatewayEnv: Record<string, string> = {
			OPENAI_API_KEY: "${OPENAI_API_KEY}",
			OPENROUTER_API_KEY: "${OPENROUTER_API_KEY:-}",
			DATABASE_URL:
				"postgresql://${MEMU_DB_USER:-memu}:${MEMU_DB_PASSWORD}@postgresql:5432/${MEMU_DB_NAME:-memu}",
		};

		// Collect env vars from companion services
		for (const { definition: def } of resolved.services) {
			for (const env of def.openclawEnvVars) {
				gatewayEnv[env.key] = env.secret ? `\${${env.key}}` : env.defaultValue;
			}
		}

		// Ensure postgresql dependency
		const deps = { ...dependsOn };
		deps.postgresql = { condition: "service_healthy" };

		const gateway: Record<string, unknown> = {
			image: `\${MEMU_IMAGE:-${defaultImage}}`,
			environment: gatewayEnv,
			volumes: ["${MEMU_DATA_DIR:-./memu/data}:/app/data"],
			ports: ["${MEMU_PORT:-8020}:8000"],
			networks: [this.networkName],
			restart: "unless-stopped",
			depends_on: deps,
			healthcheck: {
				test: ["CMD", "curl", "-sf", "http://localhost:8000/health", "||", "exit", "1"],
				interval: "30s",
				timeout: "5s",
				retries: 5,
				start_period: "30s",
			},
		};

		return { gatewayService: gateway, cliService: null, allVolumes };
	},

	generateConfig(
		_resolved: ResolverOutput,
		_options: FrameworkConfigOptions,
	): FrameworkConfigResult | null {
		// MemU uses environment-based config
		return null;
	},

	getBaseEnvVars(_options: FrameworkEnvOptions): EnvLine[] {
		return [
			{
				comment: "MemU Docker image override",
				key: "MEMU_IMAGE",
				exampleValue: "",
				actualValue: "",
			},
			{
				comment: "MemU REST API port",
				key: "MEMU_PORT",
				exampleValue: "8020",
				actualValue: "8020",
			},
			{
				comment: "MemU PostgreSQL database name",
				key: "MEMU_DB_NAME",
				exampleValue: "memu",
				actualValue: "memu",
			},
			{
				comment: "MemU PostgreSQL user",
				key: "MEMU_DB_USER",
				exampleValue: "memu",
				actualValue: "memu",
			},
			{
				comment: "MemU PostgreSQL password",
				key: "MEMU_DB_PASSWORD",
				exampleValue: "changeme",
				actualValue: "",
			},
			{
				comment: "Host path to MemU data directory",
				key: "MEMU_DATA_DIR",
				exampleValue: "./memu/data",
				actualValue: "./memu/data",
			},
		];
	},

	getMandatoryServices(): string[] {
		return ["postgresql"];
	},

	getRecommendedServices(): string[] {
		return [];
	},

	getProviderEnvKeys(): string[] {
		return [...PROVIDER_ENV_KEYS];
	},

	getEnvSectionName(): string {
		return "MemU Core";
	},
};
