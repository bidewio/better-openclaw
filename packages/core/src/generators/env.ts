import { randomBytes } from "node:crypto";
import { getFrameworkById } from "../frameworks/index.js";
import type { AgentFrameworkId } from "../frameworks/types.js";
import type { ResolverOutput } from "../types.js";
import { getDbRequirements } from "./postgres-init.js";

/**
 * Options for environment file generation.
 */
export interface EnvGeneratorOptions {
	generateSecrets: boolean;
	domain?: string;
	openclawVersion?: string;
	/** When set, host-like vars (e.g. REDIS_HOST) for these services use host.docker.internal so gateway in Docker can reach native services on host. */
	nativeServiceIds?: Set<string>;
	/** Compose file names for COMPOSE_FILE env var (enables `docker compose up` without -f flags). */
	composeFiles?: string[];
	/** Compose profiles for COMPOSE_PROFILES env var (enables `docker compose up` without --profile flags). */
	composeProfiles?: string[];
	/** OpenClaw image variant (official, coolify, alpine). */
	openclawImage?: "official" | "coolify" | "alpine";
	/** Primary agent framework (defaults to "openclaw"). */
	primaryFramework?: AgentFrameworkId;
	/** Deploy target (e.g. "nemoclaw" for NVIDIA hardened sandbox). */
	deployTarget?: string;
	/** Selected notification providers for task completion/error alerts. */
	notificationProviders?: string[];
}

/**
 * Generates `.env.example` and `.env` file contents from resolved services.
 *
 * - `.env.example`: every env var with descriptive comments, placeholders for secrets
 * - `.env`: same vars but secrets filled with cryptographically random values when generateSecrets is true
 */
export function generateEnvFiles(
	resolved: ResolverOutput,
	options: EnvGeneratorOptions,
): { envExample: string; env: string } {
	const version = options.openclawVersion ?? "latest";
	const lines: { comment: string; key: string; exampleValue: string; actualValue: string }[] = [];

	// Track all env var values for resolving references later
	const envVarValues = new Map<string, string>();

	// ── Docker Compose convenience vars ─────────────────────────────────────
	// These let you run `docker compose up -d` without -f and --profile flags.

	if (options.composeFiles && options.composeFiles.length > 0) {
		const separator = process.platform === "win32" ? ";" : ":";
		const composeFileValue = options.composeFiles.join(separator);
		lines.push({
			comment: formatComment(
				"Compose files to load (allows plain `docker compose up -d`)",
				"Docker Compose",
				false,
				false,
			),
			key: "COMPOSE_FILE",
			exampleValue: composeFileValue,
			actualValue: composeFileValue,
		});
	}

	if (options.composeProfiles && options.composeProfiles.length > 0) {
		const profilesValue = options.composeProfiles.join(",");
		lines.push({
			comment: formatComment(
				"Profiles to activate (allows plain `docker compose up -d`)",
				"Docker Compose",
				false,
				false,
			),
			key: "COMPOSE_PROFILES",
			exampleValue: profilesValue,
			actualValue: profilesValue,
		});
	}

	// ── Container User/Group ID ─────────────────────────────────────────────

	lines.push({
		comment:
			"\n# ═══════════════════════════════════════════════════════════════════════════════\n# Container User/Group ID (bind-mount ownership)\n# ═══════════════════════════════════════════════════════════════════════════════",
		key: "",
		exampleValue: "",
		actualValue: "",
	});

	lines.push({
		comment: formatComment(
			"Host user ID — ensures bind-mounted files have correct ownership (auto-detected by start.sh)",
			"Docker",
			false,
			false,
		),
		key: "PUID",
		exampleValue: "1000",
		actualValue: "1000",
	});

	lines.push({
		comment: formatComment(
			"Host group ID — ensures bind-mounted files have correct ownership (auto-detected by start.sh)",
			"Docker",
			false,
			false,
		),
		key: "PGID",
		exampleValue: "1000",
		actualValue: "1000",
	});

	// ── Framework-Specific Base Variables ────────────────────────────────────

	const framework = getFrameworkById(options.primaryFramework ?? "openclaw");
	if (framework) {
		const sectionName = framework.getEnvSectionName();
		const fwEnvVars = framework.getBaseEnvVars({
			generateSecrets: options.generateSecrets,
			domain: options.domain,
			frameworkVersion: version,
			frameworkImageVariant: options.openclawImage ?? "official",
		});

		for (const envLine of fwEnvVars) {
			lines.push({
				comment: formatComment(
					envLine.comment,
					sectionName,
					false,
					envLine.key.includes("TOKEN") || envLine.key.includes("PASSWORD"),
				),
				key: envLine.key,
				exampleValue: envLine.exampleValue,
				actualValue: envLine.actualValue,
			});
		}
	}

	if (options.domain) {
		const sectionName = framework?.getEnvSectionName() ?? "Core";
		lines.push({
			comment: formatComment("Primary domain for service routing", sectionName, false, false),
			key: "OPENCLAW_DOMAIN",
			exampleValue: "example.com",
			actualValue: options.domain,
		});
	}

	// ── Tools API Keys (web search, fetch) ──────────────────────────────────

	lines.push({
		comment:
			"\n# ═══════════════════════════════════════════════════════════════════════════════\n# Tools API Keys (web search, fetch, voice)\n# ═══════════════════════════════════════════════════════════════════════════════",
		key: "",
		exampleValue: "",
		actualValue: "",
	});

	lines.push({
		comment: formatComment(
			"Brave Search API key for web search tool (default provider)",
			"OpenClaw Tools",
			false,
			true,
		),
		key: "BRAVE_API_KEY",
		exampleValue: "your_brave_api_key_here",
		actualValue: "",
	});

	lines.push({
		comment: formatComment(
			"Perplexity API key for web search tool (alternative provider)",
			"OpenClaw Tools",
			false,
			true,
		),
		key: "PERPLEXITY_API_KEY",
		exampleValue: "",
		actualValue: "",
	});

	lines.push({
		comment: formatComment(
			"Firecrawl API key for enhanced web fetch fallback",
			"OpenClaw Tools",
			false,
			true,
		),
		key: "FIRECRAWL_API_KEY",
		exampleValue: "",
		actualValue: "",
	});

	lines.push({
		comment: formatComment(
			"ElevenLabs API key for Talk mode (text-to-speech)",
			"OpenClaw Tools",
			false,
			true,
		),
		key: "ELEVENLABS_API_KEY",
		exampleValue: "",
		actualValue: "",
	});

	// ── Swarm / Remote Gateway ───────────────────────────────────────────────

	lines.push({
		comment:
			"\n# ═══════════════════════════════════════════════════════════════════════════════\n# Swarm / Remote Gateway Connection\n# ═══════════════════════════════════════════════════════════════════════════════",
		key: "",
		exampleValue: "",
		actualValue: "",
	});

	lines.push({
		comment: formatComment(
			"Auth token for connecting to a remote OpenClaw gateway (swarm upstream)",
			"OpenClaw Swarm",
			false,
			true,
		),
		key: "OPENCLAW_REMOTE_GATEWAY_TOKEN",
		exampleValue: "",
		actualValue: "",
	});

	lines.push({
		comment: formatComment(
			"Password for remote gateway auth (alternative to token)",
			"OpenClaw Swarm",
			false,
			true,
		),
		key: "OPENCLAW_REMOTE_GATEWAY_PASSWORD",
		exampleValue: "",
		actualValue: "",
	});

	// ── AI Provider API Keys ─────────────────────────────────────────────────

	if (resolved.aiProviders && resolved.aiProviders.length > 0) {
		lines.push({
			comment:
				"\n# ═══════════════════════════════════════════════════════════════════════════════\n# AI Provider API Keys\n# ═══════════════════════════════════════════════════════════════════════════════",
			key: "",
			exampleValue: "",
			actualValue: "",
		});

		for (const provider of resolved.aiProviders) {
			// Local-only providers don't need API keys
			if (provider === "ollama" || provider === "lmstudio" || provider === "vllm") continue;

			// Ollama Cloud uses OLLAMA_API_KEY (matches Ollama's official env var name)
			const envKey =
				provider === "ollama-cloud" ? "OLLAMA_API_KEY" : `${provider.toUpperCase()}_API_KEY`;
			const label = provider === "ollama-cloud" ? "Ollama Cloud" : provider;
			lines.push({
				comment: formatComment(`API Key for ${label} AI models`, "OpenClaw Core", true, true),
				key: envKey,
				exampleValue: `your_${provider.toLowerCase().replace("-", "_")}_api_key_here`,
				actualValue: "",
			});
		}
	}

	// NemoClaw-specific env vars (when using NVIDIA hardened sandbox)
	if (options.deployTarget === "nemoclaw") {
		lines.push({
			comment:
				"\n# ═══════════════════════════════════════════════════════════════════════════════\n# NemoClaw (NVIDIA Hardened Sandbox)\n# ═══════════════════════════════════════════════════════════════════════════════",
			key: "",
			exampleValue: "",
			actualValue: "",
		});

		lines.push({
			comment: formatComment(
				"Default inference model for NemoClaw agent sandbox",
				"NemoClaw",
				false,
				true,
			),
			key: "NEMOCLAW_MODEL",
			exampleValue: "nvidia/nemotron-3-super-120b-a12b",
			actualValue: "nvidia/nemotron-3-super-120b-a12b",
		});

		lines.push({
			comment: formatComment(
				"Context window size for NemoClaw inference (tokens)",
				"NemoClaw",
				false,
				true,
			),
			key: "NEMOCLAW_CONTEXT_WINDOW",
			exampleValue: "131072",
			actualValue: "131072",
		});
	}

	// Claude web-provider session variables (optional)
	lines.push({
		comment:
			"\n# ═══════════════════════════════════════════════════════════════════════════════\n# Claude Web Provider (optional)\n# ═══════════════════════════════════════════════════════════════════════════════",
		key: "",
		exampleValue: "",
		actualValue: "",
	});

	lines.push({
		comment: formatComment(
			"Claude AI session key for web provider authentication",
			"OpenClaw Core",
			false,
			true,
		),
		key: "CLAUDE_AI_SESSION_KEY",
		exampleValue: "your_claude_ai_session_key_here",
		actualValue: "",
	});

	lines.push({
		comment: formatComment(
			"Claude web session key for web provider authentication",
			"OpenClaw Core",
			false,
			true,
		),
		key: "CLAUDE_WEB_SESSION_KEY",
		exampleValue: "your_claude_web_session_key_here",
		actualValue: "",
	});

	lines.push({
		comment: formatComment(
			"Claude web cookie for web provider authentication",
			"OpenClaw Core",
			false,
			true,
		),
		key: "CLAUDE_WEB_COOKIE",
		exampleValue: "your_claude_web_cookie_here",
		actualValue: "",
	});

	// ── Notification Webhooks ───────────────────────────────────────────────

	const notifyProviders = options.notificationProviders ?? [];
	if (notifyProviders.length > 0) {
		lines.push({
			comment:
				"\n# ═══════════════════════════════════════════════════════════════════════════════\n# Notification Webhooks (task completion & error alerts)\n# ═══════════════════════════════════════════════════════════════════════════════",
			key: "",
			exampleValue: "",
			actualValue: "",
		});

		const notifyEnvMap: Record<string, { key: string; desc: string }[]> = {
			discord: [
				{
					key: "NOTIFY_DISCORD",
					desc: "Discord webhook URL (https://discord.com/api/webhooks/...)",
				},
			],
			slack: [
				{ key: "NOTIFY_SLACK", desc: "Slack webhook URL (https://hooks.slack.com/services/...)" },
			],
			telegram: [
				{ key: "NOTIFY_TELEGRAM_TOKEN", desc: "Telegram bot token" },
				{ key: "NOTIFY_TELEGRAM_CHAT", desc: "Telegram chat ID" },
			],
			email: [
				{ key: "NOTIFY_EMAIL_TO", desc: "Email recipient address" },
				{ key: "NOTIFY_EMAIL_FROM", desc: "Email sender address" },
				{ key: "NOTIFY_EMAIL_SMTP", desc: "SMTP server URL (smtp://user:pass@host:port)" },
			],
			ntfy: [{ key: "NOTIFY_NTFY_TOPIC", desc: "ntfy topic URL (https://ntfy.sh/your-topic)" }],
			pushover: [
				{ key: "NOTIFY_PUSHOVER_TOKEN", desc: "Pushover application token" },
				{ key: "NOTIFY_PUSHOVER_USER", desc: "Pushover user key" },
			],
			gotify: [
				{ key: "NOTIFY_GOTIFY_URL", desc: "Gotify server URL" },
				{ key: "NOTIFY_GOTIFY_TOKEN", desc: "Gotify application token" },
			],
		};

		for (const provider of notifyProviders) {
			const envVars = notifyEnvMap[provider];
			if (!envVars) continue;
			for (const { key, desc } of envVars) {
				lines.push({
					comment: formatComment(desc, "Notifications", true, true),
					key,
					exampleValue: "",
					actualValue: "",
				});
			}
		}
	}

	// ── Per-Service Database Passwords ──────────────────────────────────────

	const dbReqs = getDbRequirements(resolved);

	if (dbReqs.length > 0) {
		lines.push({
			comment:
				"\n# ═══════════════════════════════════════════════════════════════════════════════\n# Per-Service Database Passwords\n# Each service gets its own PostgreSQL database and credentials\n# ═══════════════════════════════════════════════════════════════════════════════",
			key: "",
			exampleValue: "",
			actualValue: "",
		});

		for (const req of dbReqs) {
			const secretValue = options.generateSecrets ? randomBytes(24).toString("hex") : "";

			// Store in map for later reference resolution
			envVarValues.set(req.passwordEnvVar, secretValue);

			lines.push({
				comment: formatComment(
					`PostgreSQL password for ${req.serviceName} (database: ${req.dbName}, user: ${req.dbUser})`,
					req.serviceName,
					true,
					true,
				),
				key: req.passwordEnvVar,
				exampleValue: `your_${req.passwordEnvVar.toLowerCase()}_here`,
				actualValue: secretValue,
			});
		}
	}

	// ── Service-Specific Variables ───────────────────────────────────────────

	const dbPasswordKeys = dbReqs.map((r) => r.passwordEnvVar);
	const aiProviderKeys = (resolved.aiProviders || []).map((p) => `${p.toUpperCase()}_API_KEY`);
	const seenKeys = new Set<string>([
		"OPENCLAW_VERSION",
		"OPENCLAW_GATEWAY_TOKEN",
		"OPENCLAW_GATEWAY_PORT",
		"OPENCLAW_BRIDGE_PORT",
		"OPENCLAW_GATEWAY_BIND",
		"OPENCLAW_CONFIG_DIR",
		"OPENCLAW_WORKSPACE_DIR",
		"OPENCLAW_IMAGE",
		"OPENCLAW_EXTRA_MOUNTS",
		"OPENCLAW_HOME_VOLUME",
		"OPENCLAW_DOCKER_APT_PACKAGES",
		"OPENCLAW_GATEWAY_PASSWORD",
		"OPENCLAW_STATE_DIR",
		"OPENCLAW_CONFIG_PATH",
		"OPENCLAW_LOAD_SHELL_ENV",
		"OPENCLAW_DOMAIN",
		"BRAVE_API_KEY",
		"PERPLEXITY_API_KEY",
		"FIRECRAWL_API_KEY",
		"ELEVENLABS_API_KEY",
		"OPENCLAW_REMOTE_GATEWAY_TOKEN",
		"OPENCLAW_REMOTE_GATEWAY_PASSWORD",
		"CLAUDE_AI_SESSION_KEY",
		"CLAUDE_WEB_SESSION_KEY",
		"CLAUDE_WEB_COOKIE",
		...dbPasswordKeys,
		...aiProviderKeys,
	]);

	for (const { definition } of resolved.services) {
		const allEnvVars = [...definition.environment, ...definition.openclawEnvVars];

		if (allEnvVars.length === 0) continue;

		// Section separator for this service
		lines.push({
			comment: `\n# ═══════════════════════════════════════════════════════════════════════════════\n# ${definition.icon} ${definition.name}\n# ═══════════════════════════════════════════════════════════════════════════════`,
			key: "",
			exampleValue: "",
			actualValue: "",
		});

		const isNative = options.nativeServiceIds?.has(definition.id);

		for (const envVar of allEnvVars) {
			if (seenKeys.has(envVar.key)) continue;
			seenKeys.add(envVar.key);

			const secretValue = options.generateSecrets ? randomBytes(24).toString("hex") : "";

			// For native services, host-like vars must point to host so gateway (in Docker) can reach them
			const isHostVar = envVar.key.endsWith("_HOST");
			const hostValue = isNative && isHostVar ? "host.docker.internal" : null;

			const exampleValue = hostValue
				? hostValue
				: envVar.secret
					? `your_${envVar.key.toLowerCase()}_here`
					: envVar.defaultValue;

			let actualValue: string;
			if (hostValue) {
				actualValue = hostValue;
			} else if (envVar.secret) {
				// Resolve env var references like ${N8N_DB_PASSWORD}
				if (envVar.defaultValue.startsWith("${") && envVar.defaultValue.endsWith("}")) {
					const refKey = envVar.defaultValue.slice(2, -1); // Extract var name from ${VAR_NAME}
					actualValue = envVarValues.get(refKey) || envVar.defaultValue;
				} else {
					actualValue = secretValue;
				}
			} else {
				actualValue = envVar.defaultValue;
			}

			// Store in map for later reference resolution
			envVarValues.set(envVar.key, actualValue);

			lines.push({
				comment: formatComment(envVar.description, definition.name, envVar.required, envVar.secret),
				key: envVar.key,
				exampleValue,
				actualValue,
			});
		}
	}

	// ── Build output strings ────────────────────────────────────────────────

	const header = [
		"# ═══════════════════════════════════════════════════════════════════════════════",
		"# OpenClaw Environment Configuration",
		`# Generated at ${new Date().toISOString()}`,
		"# Docs: https://better-openclaw.dev/docs | Cloud: https://clawexa.net",
		"# ═══════════════════════════════════════════════════════════════════════════════",
		"",
	].join("\n");

	let envExample = header;
	let env = header;

	for (const line of lines) {
		if (line.key === "") {
			// Section comment
			envExample += `${line.comment}\n`;
			env += `${line.comment}\n`;
		} else {
			envExample += `${line.comment}\n${line.key}=${line.exampleValue}\n\n`;
			env += `${line.comment}\n${line.key}=${line.actualValue}\n\n`;
		}
	}

	return { envExample, env };
}

/**
 * Format a descriptive comment block for an environment variable.
 */
function formatComment(
	description: string,
	serviceName: string,
	required: boolean,
	secret: boolean,
): string {
	return [
		`# ${description}`,
		`# Service: ${serviceName} | Required: ${required ? "Yes" : "No"} | Secret: ${secret ? "Yes" : "No"}`,
	].join("\n");
}

// ── Structured Env Vars ─────────────────────────────────────────────────────

export interface EnvVarGroup {
	serviceName: string;
	serviceIcon: string;
	serviceId: string;
	vars: {
		key: string;
		description: string;
		secret: boolean;
		required: boolean;
		defaultValue: string;
	}[];
}

/**
 * Returns environment variables grouped by service, suitable for UI rendering.
 *
 * - First group is always "OpenClaw Core" with base variables.
 * - Subsequent groups correspond to each resolved service.
 * - Variables are deduplicated across groups (first occurrence wins).
 */
export function getStructuredEnvVars(resolved: ResolverOutput): EnvVarGroup[] {
	const groups: EnvVarGroup[] = [];
	const seenKeys = new Set<string>();

	// ── OpenClaw Core group ──────────────────────────────────────────────────
	const coreVars: EnvVarGroup["vars"] = [
		{
			key: "OPENCLAW_VERSION",
			description: "OpenClaw version to deploy",
			secret: false,
			required: true,
			defaultValue: "latest",
		},
		{
			key: "OPENCLAW_GATEWAY_TOKEN",
			description: "Authentication token for the OpenClaw gateway API",
			secret: true,
			required: true,
			defaultValue: "",
		},
		{
			key: "OPENCLAW_GATEWAY_PORT",
			description: "Port the OpenClaw gateway listens on",
			secret: false,
			required: true,
			defaultValue: "18789",
		},
		{
			key: "OPENCLAW_GATEWAY_PASSWORD",
			description: "Alternative auth: gateway password (use token OR password)",
			secret: true,
			required: false,
			defaultValue: "",
		},
		{
			key: "OPENCLAW_STATE_DIR",
			description: "Override state directory path (default: ~/.openclaw)",
			secret: false,
			required: false,
			defaultValue: "",
		},
		{
			key: "OPENCLAW_CONFIG_PATH",
			description: "Override config file path (default: ~/.openclaw/openclaw.json)",
			secret: false,
			required: false,
			defaultValue: "",
		},
		{
			key: "BRAVE_API_KEY",
			description: "Brave Search API key for web search tool (default provider)",
			secret: true,
			required: false,
			defaultValue: "",
		},
		{
			key: "PERPLEXITY_API_KEY",
			description: "Perplexity API key for web search (alternative provider)",
			secret: true,
			required: false,
			defaultValue: "",
		},
		{
			key: "FIRECRAWL_API_KEY",
			description: "Firecrawl API key for enhanced web fetch fallback",
			secret: true,
			required: false,
			defaultValue: "",
		},
		{
			key: "ELEVENLABS_API_KEY",
			description: "ElevenLabs API key for Talk mode (text-to-speech)",
			secret: true,
			required: false,
			defaultValue: "",
		},
		{
			key: "OPENCLAW_REMOTE_GATEWAY_TOKEN",
			description: "Auth token for connecting to a remote OpenClaw gateway (swarm upstream)",
			secret: true,
			required: false,
			defaultValue: "",
		},
		{
			key: "OPENCLAW_REMOTE_GATEWAY_PASSWORD",
			description: "Password for remote gateway auth (alternative to token)",
			secret: true,
			required: false,
			defaultValue: "",
		},
	];

	for (const v of coreVars) {
		seenKeys.add(v.key);
	}

	groups.push({
		serviceName: "OpenClaw Core",
		serviceIcon: "⚙️",
		serviceId: "openclaw-core",
		vars: coreVars,
	});

	// ── Per-service groups ───────────────────────────────────────────────────
	for (const { definition } of resolved.services) {
		const allEnvVars = [...definition.environment, ...definition.openclawEnvVars];

		const vars: EnvVarGroup["vars"] = [];

		for (const envVar of allEnvVars) {
			if (seenKeys.has(envVar.key)) continue;
			seenKeys.add(envVar.key);

			vars.push({
				key: envVar.key,
				description: envVar.description,
				secret: envVar.secret,
				required: envVar.required,
				defaultValue: envVar.defaultValue,
			});
		}

		if (vars.length === 0) continue;

		groups.push({
			serviceName: definition.name,
			serviceIcon: definition.icon,
			serviceId: definition.id,
			vars,
		});
	}

	return groups;
}
