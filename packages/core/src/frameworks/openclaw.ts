import { randomBytes } from "node:crypto";
import { generateOpenClawConfig } from "../generators/openclaw-json.js";
import type { DeploymentType, ResolverOutput } from "../types.js";
import type {
	AgentFrameworkDefinition,
	EnvLine,
	FrameworkComposeOptions,
	FrameworkConfigOptions,
	FrameworkConfigResult,
	FrameworkEnvOptions,
	GatewayBuildResult,
} from "./types.js";

// ─── Image Variants ─────────────────────────────────────────────────────────

const IMAGE_VARIANTS: Record<string, string> = {
	official: "ghcr.io/openclaw/openclaw",
	coolify: "coollabsio/openclaw",
	alpine: "alpine/openclaw",
};

function getOpenclawImage(variant: string, version: string): string {
	const base = IMAGE_VARIANTS[variant] ?? IMAGE_VARIANTS.official;
	const tag = variant === "official" ? version : "latest";
	return `${base}:${tag}`;
}

// ─── Provider API Keys ──────────────────────────────────────────────────────

const PROVIDER_ENV_KEYS = [
	"OPENAI_API_KEY",
	"ANTHROPIC_API_KEY",
	"GOOGLE_API_KEY",
	"XAI_API_KEY",
	"DEEPSEEK_API_KEY",
	"GROQ_API_KEY",
	"OPENROUTER_API_KEY",
	"MISTRAL_API_KEY",
	"TOGETHER_API_KEY",
	"OLLAMA_API_KEY",
	"NVIDIA_API_KEY",
];

function resolveDeploymentType(value: string): DeploymentType {
	if (value === "docker" || value === "bare-metal" || value === "local") {
		return value;
	}
	return "docker";
}

// ─── OpenClaw Framework Definition ──────────────────────────────────────────

export const openclawFramework: AgentFrameworkDefinition = {
	id: "openclaw",
	name: "OpenClaw",
	icon: "🦀",
	description: "Full-featured AI agent gateway with CLI, bridge, and skill system",
	runtime: "node",
	canBePrimary: true,
	canBeCompanion: false,
	networkName: "openclaw-network",
	imageVariants: IMAGE_VARIANTS,
	defaultImageVariant: "official",

	buildGatewayService(
		resolved: ResolverOutput,
		options: FrameworkComposeOptions,
		dependsOn?: Record<string, { condition: string }>,
	): GatewayBuildResult {
		const allVolumes = new Set<string>();

		// Gateway environment
		const gatewayEnv: Record<string, string> = {
			HOME: "/home/node",
			TERM: "xterm-256color",
			OPENCLAW_GATEWAY_TOKEN: "${OPENCLAW_GATEWAY_TOKEN}",
			OPENCLAW_ALLOW_INSECURE_PRIVATE_WS: "${OPENCLAW_ALLOW_INSECURE_PRIVATE_WS:-}",
			// Claude web-provider session vars (optional, user fills in .env)
			CLAUDE_AI_SESSION_KEY: "${CLAUDE_AI_SESSION_KEY:-}",
			CLAUDE_WEB_SESSION_KEY: "${CLAUDE_WEB_SESSION_KEY:-}",
			CLAUDE_WEB_COOKIE: "${CLAUDE_WEB_COOKIE:-}",
			// Container user/group ID for bind-mount ownership
			PUID: "${PUID:-1000}",
			PGID: "${PGID:-1000}",
		};

		// Add AI provider API keys to gateway environment
		for (const key of PROVIDER_ENV_KEYS) {
			gatewayEnv[key] = `\${${key}}`;
		}

		// Add notification webhook env vars to gateway environment
		const notifyEnvKeys = [
			"NOTIFY_DISCORD",
			"NOTIFY_SLACK",
			"NOTIFY_TELEGRAM_TOKEN",
			"NOTIFY_TELEGRAM_CHAT",
			"NOTIFY_EMAIL_TO",
			"NOTIFY_EMAIL_FROM",
			"NOTIFY_EMAIL_SMTP",
			"NOTIFY_NTFY_TOPIC",
			"NOTIFY_PUSHOVER_TOKEN",
			"NOTIFY_PUSHOVER_USER",
			"NOTIFY_GOTIFY_URL",
			"NOTIFY_GOTIFY_TOKEN",
		];
		for (const key of notifyEnvKeys) {
			gatewayEnv[key] = `\${${key}:-}`;
		}

		// Gateway volumes (bind-mount style matching real docker-setup.sh)
		const gatewayVolumes: string[] = [
			"${OPENCLAW_CONFIG_DIR:-./openclaw/config}:/home/node/.openclaw",
			"${OPENCLAW_WORKSPACE_DIR:-./openclaw/workspace}:/home/node/.openclaw/workspace",
		];

		// Collect env vars and volume mounts from companion services
		for (const { definition: def } of resolved.services) {
			for (const env of def.openclawEnvVars) {
				gatewayEnv[env.key] = env.secret ? `\${${env.key}}` : env.defaultValue;
			}
			if (def.openclawVolumeMounts) {
				for (const vol of def.openclawVolumeMounts) {
					const isBindMount =
						vol.name.startsWith("./") || vol.name.startsWith("/") || vol.name.startsWith("~");
					if (!isBindMount) {
						allVolumes.add(vol.name);
					}
					gatewayVolumes.push(`${vol.name}:${vol.containerPath}`);
				}
			}
		}

		// Gateway service
		const defaultImage = getOpenclawImage(
			options.frameworkImageVariant ?? "official",
			options.frameworkVersion,
		);
		const gateway: Record<string, unknown> = {
			image: `\${OPENCLAW_IMAGE:-${defaultImage}}`,
			environment: gatewayEnv,
			volumes: gatewayVolumes,
			ports: ["${OPENCLAW_GATEWAY_PORT:-18789}:18789", "${OPENCLAW_BRIDGE_PORT:-18790}:18790"],
			networks: [this.networkName],
			init: true,
			restart: "unless-stopped",
			command: [
				"node",
				"dist/index.js",
				"gateway",
				"--bind",
				"${OPENCLAW_GATEWAY_BIND:-lan}",
				"--port",
				"18789",
				"--allow-unconfigured",
			],
			healthcheck: {
				test: [
					"CMD",
					"node",
					"-e",
					"fetch('http://127.0.0.1:18789/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
				],
				interval: "30s",
				timeout: "5s",
				retries: 5,
				start_period: "20s",
			},
		};

		// Traefik labels for the gateway
		const gwTraefikLabels = options.traefikLabels?.get("openclaw-gateway");
		if (gwTraefikLabels) {
			gateway.labels = gwTraefikLabels;
		}

		if (options.bareMetalNativeHost) {
			gateway.extra_hosts = ["host.docker.internal:host-gateway"];
		}

		if (dependsOn && Object.keys(dependsOn).length > 0) {
			gateway.depends_on = dependsOn;
		}

		// CLI companion service (matching real OpenClaw docker-compose.yml)
		const cliEnv: Record<string, string> = {
			HOME: "/home/node",
			TERM: "xterm-256color",
			OPENCLAW_GATEWAY_TOKEN: "${OPENCLAW_GATEWAY_TOKEN}",
			OPENCLAW_ALLOW_INSECURE_PRIVATE_WS: "${OPENCLAW_ALLOW_INSECURE_PRIVATE_WS:-}",
			BROWSER: "echo",
			CLAUDE_AI_SESSION_KEY: "${CLAUDE_AI_SESSION_KEY:-}",
			CLAUDE_WEB_SESSION_KEY: "${CLAUDE_WEB_SESSION_KEY:-}",
			CLAUDE_WEB_COOKIE: "${CLAUDE_WEB_COOKIE:-}",
		};

		for (const key of PROVIDER_ENV_KEYS) {
			cliEnv[key] = `\${${key}}`;
		}

		const cliService: Record<string, unknown> = {
			image: `\${OPENCLAW_IMAGE:-${defaultImage}}`,
			network_mode: "service:openclaw-gateway",
			cap_drop: ["NET_RAW", "NET_ADMIN"],
			security_opt: ["no-new-privileges:true"],
			environment: cliEnv,
			volumes: [
				"${OPENCLAW_CONFIG_DIR:-./openclaw/config}:/home/node/.openclaw",
				"${OPENCLAW_WORKSPACE_DIR:-./openclaw/workspace}:/home/node/.openclaw/workspace",
			],
			stdin_open: true,
			tty: true,
			init: true,
			entrypoint: ["node", "dist/index.js"],
			depends_on: ["openclaw-gateway"],
		};

		return { gatewayService: gateway, cliService, allVolumes };
	},

	generateConfig(resolved: ResolverOutput, options: FrameworkConfigOptions): FrameworkConfigResult {
		const content = generateOpenClawConfig(resolved, {
			deploymentType: resolveDeploymentType(options.deploymentType),
			gatewayPort: options.gatewayPort,
			openclawVersion: options.frameworkVersion,
			notificationProviders: options.notificationProviders,
		});
		return {
			path: "openclaw/config/openclaw.json",
			content,
		};
	},

	getBaseEnvVars(options: FrameworkEnvOptions): EnvLine[] {
		const version = options.frameworkVersion ?? "latest";
		const gatewayToken = options.generateSecrets ? randomBytes(24).toString("hex") : "";

		const imageVariantMap: Record<string, string> = {
			official: "",
			coolify: "coollabsio/openclaw:latest",
			alpine: "alpine/openclaw:latest",
		};
		const imageValue = imageVariantMap[options.frameworkImageVariant ?? "official"] ?? "";

		return [
			{
				comment: "OpenClaw version to deploy",
				key: "OPENCLAW_VERSION",
				exampleValue: version,
				actualValue: version,
			},
			{
				comment: "Authentication token for the OpenClaw gateway API",
				key: "OPENCLAW_GATEWAY_TOKEN",
				exampleValue: "your_gateway_token_here",
				actualValue: gatewayToken,
			},
			{
				comment: "Port the OpenClaw gateway listens on",
				key: "OPENCLAW_GATEWAY_PORT",
				exampleValue: "18789",
				actualValue: "18789",
			},
			{
				comment: "Port for the OpenClaw ACP bridge (WebSocket)",
				key: "OPENCLAW_BRIDGE_PORT",
				exampleValue: "18790",
				actualValue: "18790",
			},
			{
				comment:
					"Gateway network bind mode: 'lan' (all interfaces, required for Docker). Use 'loopback' only for native (non-Docker) installs with Tailscale serve/funnel",
				key: "OPENCLAW_GATEWAY_BIND",
				exampleValue: "lan",
				actualValue: "lan",
			},
			{
				comment: "Host path to OpenClaw configuration directory",
				key: "OPENCLAW_CONFIG_DIR",
				exampleValue: "./openclaw/config",
				actualValue: "./openclaw/config",
			},
			{
				comment: "Host path to OpenClaw workspace directory",
				key: "OPENCLAW_WORKSPACE_DIR",
				exampleValue: "./openclaw/workspace",
				actualValue: "./openclaw/workspace",
			},
			{
				comment: `OpenClaw Docker image variant: ${options.frameworkImageVariant ?? "official"} (official, coolify, alpine)`,
				key: "OPENCLAW_IMAGE",
				exampleValue: "",
				actualValue: imageValue,
			},
			{
				comment:
					"Extra bind mounts for gateway and CLI containers (comma-separated, format: source:target[:options])",
				key: "OPENCLAW_EXTRA_MOUNTS",
				exampleValue: "",
				actualValue: "",
			},
			{
				comment: "Named volume or host path for /home/node persistence across container restarts",
				key: "OPENCLAW_HOME_VOLUME",
				exampleValue: "",
				actualValue: "",
			},
			{
				comment: "Extra apt packages to install during Docker image build (space-separated)",
				key: "OPENCLAW_DOCKER_APT_PACKAGES",
				exampleValue: "",
				actualValue: "",
			},
			{
				comment: "Alternative auth: gateway password (use token OR password, not both)",
				key: "OPENCLAW_GATEWAY_PASSWORD",
				exampleValue: "",
				actualValue: "",
			},
			{
				comment: "Override state directory path (default: ~/.openclaw)",
				key: "OPENCLAW_STATE_DIR",
				exampleValue: "",
				actualValue: "",
			},
			{
				comment: "Override config file path (default: ~/.openclaw/openclaw.json)",
				key: "OPENCLAW_CONFIG_PATH",
				exampleValue: "",
				actualValue: "",
			},
			{
				comment: "Import missing keys from login shell profile (set to 1 to enable)",
				key: "OPENCLAW_LOAD_SHELL_ENV",
				exampleValue: "",
				actualValue: "",
			},
		];
	},

	getMandatoryServices(): string[] {
		return ["convex", "mission-control", "tailscale"];
	},

	getRecommendedServices(): string[] {
		return ["clawrouter", "bridge"];
	},

	getProviderEnvKeys(): string[] {
		return [...PROVIDER_ENV_KEYS];
	},

	getEnvSectionName(): string {
		return "OpenClaw Core";
	},
};
