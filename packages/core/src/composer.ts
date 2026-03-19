import { Scalar, stringify } from "yaml";
import { getDbRequirements } from "./generators/postgres-init.js";
import type {
	ComposeOptions,
	OpenclawImageVariant,
	ResolverOutput,
	ServiceCategory,
} from "./types.js";

/** Maps image variant to the Docker image string. */
const IMAGE_VARIANTS: Record<OpenclawImageVariant, string> = {
	official: "ghcr.io/openclaw/openclaw",
	coolify: "coollabsio/openclaw",
	alpine: "alpine/openclaw",
};

/** Returns the OpenClaw image string with version tag for a given variant. */
function getOpenclawImage(variant: OpenclawImageVariant, version: string): string {
	const base = IMAGE_VARIANTS[variant];
	// Coolify and alpine images use :latest by default
	const tag = variant === "official" ? version : "latest";
	return `${base}:${tag}`;
}

/** Creates a YAML scalar that is always quoted — avoids YAML 1.1 bare `no` → false. */
function quotedStr(value: string): Scalar {
	const s = new Scalar(value);
	s.type = Scalar.QUOTE_DOUBLE;
	return s;
}

// ── Public Types ────────────────────────────────────────────────────────────

export interface ComposeResult {
	files: Record<string, string>; // filename -> YAML content
	mainFile: string; // "docker-compose.yml"
	profiles: string[]; // list of profiles used
}

// ── Category → Profile Mapping ──────────────────────────────────────────────

const CATEGORY_PROFILE_MAP: Partial<Record<ServiceCategory, { file: string; profile: string }>> = {
	ai: { file: "docker-compose.ai.yml", profile: "ai" },
	"ai-platform": { file: "docker-compose.ai.yml", profile: "ai" },
	media: { file: "docker-compose.media.yml", profile: "media" },
	monitoring: { file: "docker-compose.monitoring.yml", profile: "monitoring" },
	analytics: { file: "docker-compose.monitoring.yml", profile: "monitoring" },
	"dev-tools": { file: "docker-compose.tools.yml", profile: "tools" },
	"coding-agent": { file: "docker-compose.tools.yml", profile: "tools" },
	"social-media": { file: "docker-compose.social.yml", profile: "social" },
	knowledge: { file: "docker-compose.knowledge.yml", profile: "knowledge" },
	communication: { file: "docker-compose.communication.yml", profile: "communication" },
	"saas-boilerplate": { file: "docker-compose.saas.yml", profile: "saas" },
};

const YAML_OPTIONS = { lineWidth: 120, nullStr: "" };

// ── Shared Gateway Builder ──────────────────────────────────────────────────

interface GatewayBuildResult {
	gatewayService: Record<string, unknown>;
	cliService: Record<string, unknown>;
	allVolumes: Set<string>;
}

/**
 * Builds the OpenClaw gateway and CLI service entries.
 * Matches the real OpenClaw docker-compose.yml structure:
 * - Bridge port 18790 for ACP/WebSocket
 * - Bind-mount volumes (not named volumes)
 * - Claude web-provider session env vars
 * - Gateway bind mode (--bind lan)
 * - CLI companion service with stdin/tty
 */
function buildGatewayServices(
	resolved: ResolverOutput,
	options: ComposeOptions,
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
	};

	// Add AI provider API keys to gateway environment
	const providerKeys = [
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
	];
	for (const key of providerKeys) {
		gatewayEnv[key] = `\${${key}}`;
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
		options.openclawImage ?? "official",
		options.openclawVersion,
	);
	const gateway: Record<string, unknown> = {
		image: `\${OPENCLAW_IMAGE:-${defaultImage}}`,
		environment: gatewayEnv,
		volumes: gatewayVolumes,
		ports: ["${OPENCLAW_GATEWAY_PORT:-18789}:18789", "${OPENCLAW_BRIDGE_PORT:-18790}:18790"],
		networks: ["openclaw-network"],
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
	// Build CLI environment with same keys as gateway for consistency
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

	// Add same AI provider API keys to CLI for direct AI interactions
	for (const key of providerKeys) {
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

	return { gatewayService: gateway, cliService: cliService, allVolumes };
}

// ── Shared Companion Service Builder ────────────────────────────────────────

function buildCompanionService(
	def: ResolverOutput["services"][number]["definition"],
	resolved: ResolverOutput,
	options: ComposeOptions,
	allVolumes: Set<string>,
): { entry: Record<string, unknown>; volumeNames: string[] } {
	const svc: Record<string, unknown> = {};
	const volumeNames: string[] = [];

	// Git-based services use build: context; image-based services use image:
	if (def.gitSource && def.buildContext) {
		const subdir = def.gitSource.subdirectory || ".";
		const ctxPath = def.buildContext.context || ".";
		const contextFull =
			subdir === "." ? `./repos/${def.id}/${ctxPath}` : `./repos/${def.id}/${subdir}/${ctxPath}`;
		const buildBlock: Record<string, unknown> = { context: contextFull };
		if (def.buildContext.dockerfile) {
			buildBlock.dockerfile = def.buildContext.dockerfile;
		}
		if (def.buildContext.args && Object.keys(def.buildContext.args).length > 0) {
			buildBlock.args = def.buildContext.args;
		}
		if (def.buildContext.target) {
			buildBlock.target = def.buildContext.target;
		}
		svc.build = buildBlock;
	} else {
		svc.image = `${def.image}:${def.imageTag}`;
	}

	if (def.environment.length > 0) {
		const env: Record<string, string> = {};
		for (const e of def.environment) {
			env[e.key] = e.secret ? `\${${e.key}}` : e.defaultValue;
		}
		svc.environment = env;
	}

	const exposedPorts = def.ports.filter((p) => p.exposed);
	if (exposedPorts.length > 0) {
		const prefix = def.id.toUpperCase().replace(/-/g, "_");
		svc.ports = exposedPorts.map((p, i) => {
			const suffix = exposedPorts.length > 1 ? `_${i}` : "";
			let defaultPort = p.host;

			// Override proxy ports if custom ports are specified
			if (
				(def.id === "caddy" || def.id === "traefik") &&
				options.proxyHttpPort !== undefined &&
				p.container === 80
			) {
				defaultPort = options.proxyHttpPort;
			}
			if (
				(def.id === "caddy" || def.id === "traefik") &&
				options.proxyHttpsPort !== undefined &&
				p.container === 443
			) {
				defaultPort = options.proxyHttpsPort;
			}

			// Apply global port overrides if specified
			if (options.portOverrides?.[def.id]?.[p.host] !== undefined) {
				defaultPort = options.portOverrides?.[def.id]?.[p.host] || p.host;
			}

			// Use _EXTERNAL_PORT to avoid colliding with openclawEnvVars _PORT keys.
			// openclawEnvVars define the container port (e.g. GRAFANA_PORT=3000 for
			// internal Docker networking), while these are host port mappings (e.g. 3150).
			// Without this, GRAFANA_PORT=3000 from .env would override the default
			// 3150 in ${GRAFANA_PORT:-3150}:3000, mapping host port 3000 instead.
			return `\${${prefix}_EXTERNAL_PORT${suffix}:-${defaultPort}}:${p.container}`;
		});
	}

	if (def.volumes.length > 0) {
		svc.volumes = def.volumes.map((v) => {
			const isBindMount =
				v.name.startsWith("./") || v.name.startsWith("/") || v.name.startsWith("~");

			if (!isBindMount) {
				allVolumes.add(v.name);
				volumeNames.push(v.name);
			}
			return `${v.name}:${v.containerPath}`;
		});
	}

	// PostgreSQL: mount the init script and pass per-service DB passwords
	if (def.id === "postgresql") {
		if (!svc.volumes) svc.volumes = [];
		(svc.volumes as string[]).push(
			"./postgres/init-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh:ro",
		);

		// Pass per-service database password env vars so the init script can use them
		const dbReqs = getDbRequirements(resolved);
		if (dbReqs.length > 0) {
			const env = (svc.environment ?? {}) as Record<string, string>;
			for (const req of dbReqs) {
				env[req.passwordEnvVar] = `\${${req.passwordEnvVar}}`;
			}
			svc.environment = env;
		}
	}

	if (def.healthcheck) {
		const hc: Record<string, unknown> = {
			test: ["CMD-SHELL", def.healthcheck.test],
			interval: def.healthcheck.interval,
			timeout: def.healthcheck.timeout,
			retries: def.healthcheck.retries,
		};
		if (def.healthcheck.startPeriod) {
			hc.start_period = def.healthcheck.startPeriod;
		}
		svc.healthcheck = hc;
	}

	svc.restart = def.restartPolicy;
	svc.networks = def.networks;

	if (def.command) svc.command = def.command;
	if (def.entrypoint) svc.entrypoint = def.entrypoint;

	// Labels: merge static definition labels with dynamic Traefik labels
	const mergedLabels: Record<string, string> = {};
	if (def.labels) Object.assign(mergedLabels, def.labels);
	const traefikLabels = options.traefikLabels?.get(def.id);
	if (traefikLabels) Object.assign(mergedLabels, traefikLabels);
	if (Object.keys(mergedLabels).length > 0) svc.labels = mergedLabels;

	// Traefik: bind-mount static config and Docker socket
	if (def.id === "traefik" && options.traefikLabels) {
		if (!svc.volumes) svc.volumes = [];
		(svc.volumes as string[]).push(
			"./traefik/traefik.yml:/etc/traefik/traefik.yml:ro",
			"/var/run/docker.sock:/var/run/docker.sock:ro",
		);
	}

	let deploy: Record<string, unknown> | undefined;
	if (def.deploy) {
		deploy = JSON.parse(JSON.stringify(def.deploy)) as Record<string, unknown>;
	}
	if (options.gpu && def.gpuRequired) {
		const base = deploy ?? {};
		const resources = (base.resources ?? {}) as Record<string, unknown>;
		deploy = {
			...base,
			resources: {
				...resources,
				reservations: {
					...((resources.reservations as Record<string, unknown>) ?? {}),
					devices: [{ driver: "nvidia", count: "all", capabilities: ["gpu"] }],
				},
			},
		};
	}
	// Memory limits from estimatedMemoryMB
	if (def.minMemoryMB && options.hardened) {
		const base = deploy ?? {};
		const resources = (base.resources ?? {}) as Record<string, unknown>;
		const limits = (resources.limits as Record<string, unknown>) ?? {};
		deploy = {
			...base,
			resources: {
				...resources,
				limits: {
					...limits,
					memory: `${def.minMemoryMB * 2}m`, // 2x min as safe limit
				},
			},
		};
	}
	if (deploy) svc.deploy = deploy;

	// Security hardening (when enabled)
	if (options.hardened) {
		svc.cap_drop = ["ALL"];
		svc.security_opt = ["no-new-privileges:true"];

		// Services that need specific capabilities
		const capAddMap: Record<string, string[]> = {
			caddy: ["NET_BIND_SERVICE"],
			traefik: ["NET_BIND_SERVICE"],
			crowdsec: ["NET_BIND_SERVICE", "DAC_READ_SEARCH"],
		};
		if (capAddMap[def.id]) {
			svc.cap_add = capAddMap[def.id];
		}
	}

	// Merge both dependsOn and requires to ensure proper Docker startup ordering
	const depIds = [...new Set([...def.dependsOn, ...def.requires])].filter((id) =>
		resolved.services.some((s) => s.definition.id === id),
	);
	if (depIds.length > 0) {
		const dependsOn: Record<string, { condition: string }> = {};
		for (const depId of depIds) {
			const dep = resolved.services.find((s) => s.definition.id === depId);
			dependsOn[depId] = {
				condition: dep?.definition.healthcheck ? "service_healthy" : "service_started",
			};
		}
		svc.depends_on = dependsOn;
	}

	return { entry: svc, volumeNames };
}

// ── PostgreSQL Setup Init Container ─────────────────────────────────────────

/**
 * Builds a one-shot init container that creates databases and users for
 * services that need their own PostgreSQL database.  Runs AFTER PostgreSQL
 * is healthy, on every `docker compose up`, and is idempotent.
 *
 * Uses standard PG* environment variables (PGHOST, PGUSER, PGDATABASE,
 * PGPASSWORD) so psql/createuser/createdb automatically connect without
 * needing explicit -h/-U/-d flags — simpler and avoids YAML escaping issues.
 *
 * Returns null when no setup is needed (no PostgreSQL or no DB requirements).
 */
function buildPostgresSetup(resolved: ResolverOutput): Record<string, unknown> | null {
	const hasPostgres = resolved.services.some((s) => s.definition.id === "postgresql");
	if (!hasPostgres) return null;

	const dbReqs = getDbRequirements(resolved);
	if (dbReqs.length === 0) return null;

	// Build a shell script with one command per line.
	// Uses $$ to escape $ from Docker Compose's variable substitution —
	// Docker Compose converts $$ → $ before passing to the container.
	// NO set -e: we handle errors explicitly so one failed service doesn't block others.
	const scriptLines = ["echo '=== PostgreSQL database setup ==='", "FAILED=0"];

	for (const req of dbReqs) {
		// Each service's setup is wrapped so a failure doesn't block the others.
		// Uses psql -v ON_ERROR_STOP=0 so SQL errors don't abort psql.
		scriptLines.push(
			`echo "Setting up database '${req.dbName}' with user '${req.dbUser}'..."`,
			// Create user if not exists (pure SQL, no createuser binary quirks)
			`psql -c "SELECT 1 FROM pg_roles WHERE rolname='${req.dbUser}'" | grep -q 1 || psql -c "CREATE ROLE ${req.dbUser} WITH LOGIN PASSWORD '$$${req.passwordEnvVar}'"`,
			// Always sync the password to match current env
			`psql -c "ALTER ROLE ${req.dbUser} WITH LOGIN PASSWORD '$$${req.passwordEnvVar}'"`,
			// Create database if not exists
			`psql -tc "SELECT 1 FROM pg_database WHERE datname='${req.dbName}'" | grep -q 1 || psql -c "CREATE DATABASE ${req.dbName} OWNER ${req.dbUser}"`,
			// Grant privileges (idempotent)
			`psql -c "GRANT ALL PRIVILEGES ON DATABASE ${req.dbName} TO ${req.dbUser}" || FAILED=1`,
			`echo "  Done: ${req.dbName}"`,
		);
	}

	scriptLines.push("echo '=== All databases ready ==='", "exit $$FAILED");

	// Standard PG* env vars: psql/createuser/createdb use these automatically
	const env: Record<string, string> = {
		PGHOST: "postgresql",
		PGUSER: "${POSTGRES_USER:-openclaw}",
		PGDATABASE: "${POSTGRES_DB:-openclaw}",
		PGPASSWORD: "${POSTGRES_PASSWORD}",
	};
	for (const req of dbReqs) {
		env[req.passwordEnvVar] = `\${${req.passwordEnvVar}}`;
	}

	return {
		image: "postgres:17-alpine",
		depends_on: {
			postgresql: { condition: "service_healthy" },
		},
		environment: env,
		// command MUST be a single-element array so the entire script is passed
		// as ONE argument to `sh -c`. A plain string gets shlex-split by Docker
		// Compose into multiple args, breaking multi-line scripts.
		entrypoint: ["/bin/sh", "-c"],
		command: [scriptLines.join("\n")],
		restart: quotedStr("no"),
		networks: ["openclaw-network"],
	};
}

// ── Single-File Compose ─────────────────────────────────────────────────────

/**
 * Generates a single Docker Compose YAML string with ALL services.
 * Backward-compatible signature.
 */
export function compose(resolved: ResolverOutput, options: ComposeOptions): string {
	const isDirectInstall = options.openclawInstallMethod === "direct";

	// Build depends_on for ALL companion services
	const gatewayDependsOn: Record<string, { condition: string }> = {};
	for (const { definition: def } of resolved.services) {
		gatewayDependsOn[def.id] = {
			condition: def.healthcheck ? "service_healthy" : "service_started",
		};
	}

	const services: Record<string, Record<string, unknown>> = {};
	let allVolumes = new Set<string>();

	if (!isDirectInstall) {
		const {
			gatewayService,
			cliService,
			allVolumes: gwVolumes,
		} = buildGatewayServices(resolved, options, gatewayDependsOn);
		allVolumes = gwVolumes;
		services["openclaw-gateway"] = gatewayService;
		// CLI service added after companions
		// Determine which services need DB setup so we can redirect their depends_on
		const dbReqs = getDbRequirements(resolved);
		const dbServiceIds = new Set(dbReqs.map((r) => r.serviceId));

		for (const { definition: def } of resolved.services) {
			const { entry } = buildCompanionService(def, resolved, options, allVolumes);
			if (dbServiceIds.has(def.id) && entry.depends_on) {
				const deps = entry.depends_on as Record<string, { condition: string }>;
				if (deps.postgresql) {
					delete deps.postgresql;
					deps["postgres-setup"] = { condition: "service_completed_successfully" };
				}
			}
			services[def.id] = entry;
		}

		const pgSetup = buildPostgresSetup(resolved);
		if (pgSetup) {
			services["postgres-setup"] = pgSetup;
		}

		services["openclaw-cli"] = cliService;
	} else {
		// Direct install: no gateway/CLI containers, just companion services
		const dbReqs = getDbRequirements(resolved);
		const dbServiceIds = new Set(dbReqs.map((r) => r.serviceId));

		for (const { definition: def } of resolved.services) {
			const { entry } = buildCompanionService(def, resolved, options, allVolumes);
			if (dbServiceIds.has(def.id) && entry.depends_on) {
				const deps = entry.depends_on as Record<string, { condition: string }>;
				if (deps.postgresql) {
					delete deps.postgresql;
					deps["postgres-setup"] = { condition: "service_completed_successfully" };
				}
			}
			services[def.id] = entry;
		}

		const pgSetup = buildPostgresSetup(resolved);
		if (pgSetup) {
			services["postgres-setup"] = pgSetup;
		}
	}

	const volumes: Record<string, null> = {};
	for (const v of [...allVolumes].sort()) {
		volumes[v] = null;
	}

	const networks = { "openclaw-network": { driver: "bridge" } };

	return stringify({ services, volumes, networks }, YAML_OPTIONS);
}

// ── Multi-File Compose ──────────────────────────────────────────────────────

interface ServiceInfo {
	id: string;
	category: ServiceCategory;
	entry: Record<string, unknown>;
	volumeNames: string[];
}

/**
 * Generates multiple Docker Compose files, splitting services into profile-based
 * override files by category.
 */
export function composeMultiFile(resolved: ResolverOutput, options: ComposeOptions): ComposeResult {
	const isDirectInstall = options.openclawInstallMethod === "direct";
	const allVolumes = new Set<string>();

	// Build all companion service entries & classify by category
	const serviceInfos: ServiceInfo[] = [];
	const dbReqs = getDbRequirements(resolved);
	const dbServiceIds = new Set(dbReqs.map((r) => r.serviceId));

	for (const { definition: def } of resolved.services) {
		const { entry, volumeNames } = buildCompanionService(def, resolved, options, allVolumes);
		// Redirect DB-dependent services to depend on postgres-setup
		if (dbServiceIds.has(def.id) && entry.depends_on) {
			const deps = entry.depends_on as Record<string, { condition: string }>;
			if (deps.postgresql) {
				delete deps.postgresql;
				deps["postgres-setup"] = { condition: "service_completed_successfully" };
			}
		}
		serviceInfos.push({ id: def.id, category: def.category, entry, volumeNames });
	}

	// Partition services into base vs. profile files
	const baseServiceIds = new Set<string>();
	const profileFileMap: Record<string, { profile: string; services: ServiceInfo[] }> = {};

	for (const info of serviceInfos) {
		const mapping = CATEGORY_PROFILE_MAP[info.category];
		if (mapping) {
			let profileFile = profileFileMap[mapping.file];
			if (!profileFile) {
				profileFile = { profile: mapping.profile, services: [] };
				profileFileMap[mapping.file] = profileFile;
			}
			profileFile.services.push(info);
		} else {
			baseServiceIds.add(info.id);
		}
	}

	const baseServices: Record<string, Record<string, unknown>> = {};

	if (!isDirectInstall) {
		// Gateway depends_on (only base services)
		const gatewayDependsOn: Record<string, { condition: string }> = {};
		for (const { definition: def } of resolved.services) {
			if (baseServiceIds.has(def.id)) {
				gatewayDependsOn[def.id] = {
					condition: def.healthcheck ? "service_healthy" : "service_started",
				};
			}
		}

		const {
			gatewayService,
			cliService,
			allVolumes: gwVolumes,
		} = buildGatewayServices(resolved, options, gatewayDependsOn);

		// Merge gateway volumes into allVolumes
		for (const v of gwVolumes) allVolumes.add(v);

		baseServices["openclaw-gateway"] = gatewayService;

		for (const info of serviceInfos) {
			if (baseServiceIds.has(info.id)) {
				baseServices[info.id] = info.entry;
			}
		}

		// Add postgres-setup init container if needed
		const pgSetup = buildPostgresSetup(resolved);
		if (pgSetup) {
			baseServices["postgres-setup"] = pgSetup;
		}

		baseServices["openclaw-cli"] = cliService;
	} else {
		// Direct install: no gateway/CLI containers
		for (const info of serviceInfos) {
			if (baseServiceIds.has(info.id)) {
				baseServices[info.id] = info.entry;
			}
		}

		const pgSetup = buildPostgresSetup(resolved);
		if (pgSetup) {
			baseServices["postgres-setup"] = pgSetup;
		}
	}

	const sortedAllVolumes: Record<string, null> = {};
	for (const v of [...allVolumes].sort()) {
		sortedAllVolumes[v] = null;
	}

	const networks = { "openclaw-network": { driver: "bridge" } };

	const files: Record<string, string> = {};
	files["docker-compose.yml"] = stringify(
		{ services: baseServices, volumes: sortedAllVolumes, networks },
		YAML_OPTIONS,
	);

	// Profile override files
	const usedProfiles = new Set<string>();

	for (const [fileName, { profile, services }] of Object.entries(profileFileMap)) {
		usedProfiles.add(profile);

		const profileServices: Record<string, Record<string, unknown>> = {};
		const profileVolumes = new Set<string>();

		for (const info of services) {
			profileServices[info.id] = { ...info.entry, profiles: [profile] };
			for (const vName of info.volumeNames) {
				profileVolumes.add(vName);
			}
		}

		const fileContent: Record<string, unknown> = { services: profileServices };

		if (profileVolumes.size > 0) {
			const sortedProfileVolumes: Record<string, null> = {};
			for (const v of [...profileVolumes].sort()) {
				sortedProfileVolumes[v] = null;
			}
			fileContent.volumes = sortedProfileVolumes;
		}

		files[fileName] = stringify(fileContent, YAML_OPTIONS);
	}

	return {
		files,
		mainFile: "docker-compose.yml",
		profiles: [...usedProfiles].sort(),
	};
}
