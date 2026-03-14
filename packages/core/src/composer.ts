import { Scalar, stringify } from "yaml";
import { getFrameworkById } from "./frameworks/index.js";
import type { AgentFrameworkDefinition, FrameworkComposeOptions } from "./frameworks/types.js";
import { getDbRequirements } from "./generators/postgres-init.js";
import type {
	ComposeOptions,
	ResolverOutput,
	ServiceCategory,
} from "./types.js";

/** Creates a YAML scalar that is always quoted — avoids YAML 1.1 bare `no` → false. */
export function quotedStr(value: string): Scalar {
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

export const YAML_OPTIONS = { lineWidth: 120, nullStr: "" };

// ── Framework-Aware Gateway Builder ─────────────────────────────────────────

import type { GatewayBuildResult } from "./frameworks/types.js";

/** Resolves the active framework and converts ComposeOptions to FrameworkComposeOptions. */
function resolveFramework(options: ComposeOptions): AgentFrameworkDefinition {
	const fw = getFrameworkById(options.primaryFramework ?? "openclaw");
	if (!fw) {
		// Fallback to openclaw if unknown framework
		const fallback = getFrameworkById("openclaw");
		if (!fallback) throw new Error("OpenClaw framework not registered");
		return fallback;
	}
	return fw;
}

function toFrameworkComposeOptions(options: ComposeOptions): FrameworkComposeOptions {
	return {
		projectName: options.projectName,
		proxy: options.proxy,
		proxyHttpPort: options.proxyHttpPort,
		proxyHttpsPort: options.proxyHttpsPort,
		domain: options.domain,
		gpu: options.gpu,
		platform: options.platform,
		deployment: options.deployment ?? "local",
		frameworkVersion: options.openclawVersion,
		frameworkImageVariant: options.openclawImage ?? "official",
		bareMetalNativeHost: options.bareMetalNativeHost,
		traefikLabels: options.traefikLabels,
		hardened: options.hardened,
		frameworkInstallMethod: options.openclawInstallMethod ?? "docker",
	};
}

/**
 * Builds gateway and CLI service entries by delegating to the selected framework.
 * Framework is determined by options.primaryFramework (defaults to "openclaw").
 */
function buildGatewayServices(
	resolved: ResolverOutput,
	options: ComposeOptions,
	dependsOn?: Record<string, { condition: string }>,
): GatewayBuildResult & { framework: AgentFrameworkDefinition } {
	const framework = resolveFramework(options);
	const fwOptions = toFrameworkComposeOptions(options);
	const result = framework.buildGatewayService(resolved, fwOptions, dependsOn);
	return { ...result, framework };
}

// ── Shared Companion Service Builder ────────────────────────────────────────

export function buildCompanionService(
	def: ResolverOutput["services"][number]["definition"],
	resolved: ResolverOutput,
	options: ComposeOptions,
	allVolumes: Set<string>,
	networkName?: string,
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
	// Map "openclaw-network" to the active framework's network name at compose-time
	// so service definitions don't need mass-editing (190+ files).
	svc.networks = networkName
		? def.networks.map((n: string) => (n === "openclaw-network" ? networkName : n))
		: def.networks;

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
export function buildPostgresSetup(resolved: ResolverOutput, networkName = "openclaw-network"): Record<string, unknown> | null {
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
		networks: [networkName],
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

	const framework = resolveFramework(options);
	const gatewayKey = `${framework.id}-gateway`;
	const cliKey = `${framework.id}-cli`;

	if (!isDirectInstall) {
		const {
			gatewayService,
			cliService,
			allVolumes: gwVolumes,
		} = buildGatewayServices(resolved, options, gatewayDependsOn);
		allVolumes = gwVolumes;
		services[gatewayKey] = gatewayService;
		// CLI service added after companions
		// Determine which services need DB setup so we can redirect their depends_on
		const dbReqs = getDbRequirements(resolved);
		const dbServiceIds = new Set(dbReqs.map((r) => r.serviceId));

		for (const { definition: def } of resolved.services) {
			const { entry } = buildCompanionService(def, resolved, options, allVolumes, framework.networkName);
			if (dbServiceIds.has(def.id) && entry.depends_on) {
				const deps = entry.depends_on as Record<string, { condition: string }>;
				if (deps.postgresql) {
					delete deps.postgresql;
					deps["postgres-setup"] = { condition: "service_completed_successfully" };
				}
			}
			services[def.id] = entry;
		}

		const pgSetup = buildPostgresSetup(resolved, framework.networkName);
		if (pgSetup) {
			services["postgres-setup"] = pgSetup;
		}

		// Add companion framework containers
		if (options.companionFrameworks && options.companionFrameworks.length > 0) {
			const fwOptions = toFrameworkComposeOptions(options);
			for (const companionId of options.companionFrameworks) {
				const companionFw = getFrameworkById(companionId);
				if (!companionFw || companionFw.id === framework.id) continue;
				if (companionFw.buildCompanionService) {
					const companionEntry = companionFw.buildCompanionService(resolved, fwOptions);
					if (companionEntry) {
						services[`${companionFw.id}-companion`] = companionEntry;
					}
				} else {
					// Fallback: build a gateway-style container for the companion
					const companionResult = companionFw.buildGatewayService(resolved, fwOptions);
					services[`${companionFw.id}-companion`] = companionResult.gatewayService;
				}
			}
		}

		if (cliService) {
			services[cliKey] = cliService;
		}
	} else {
		// Direct install: no gateway/CLI containers, just companion services
		const dbReqs = getDbRequirements(resolved);
		const dbServiceIds = new Set(dbReqs.map((r) => r.serviceId));

		for (const { definition: def } of resolved.services) {
			const { entry } = buildCompanionService(def, resolved, options, allVolumes, framework.networkName);
			if (dbServiceIds.has(def.id) && entry.depends_on) {
				const deps = entry.depends_on as Record<string, { condition: string }>;
				if (deps.postgresql) {
					delete deps.postgresql;
					deps["postgres-setup"] = { condition: "service_completed_successfully" };
				}
			}
			services[def.id] = entry;
		}

		const pgSetup = buildPostgresSetup(resolved, framework.networkName);
		if (pgSetup) {
			services["postgres-setup"] = pgSetup;
		}
	}

	const volumes: Record<string, null> = {};
	for (const v of [...allVolumes].sort()) {
		volumes[v] = null;
	}

	const networks = { [framework.networkName]: { driver: "bridge" } };

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
	const framework = resolveFramework(options);

	// Build all companion service entries & classify by category
	const serviceInfos: ServiceInfo[] = [];
	const dbReqs = getDbRequirements(resolved);
	const dbServiceIds = new Set(dbReqs.map((r) => r.serviceId));

	for (const { definition: def } of resolved.services) {
		const { entry, volumeNames } = buildCompanionService(def, resolved, options, allVolumes, framework.networkName);
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
			if (!profileFileMap[mapping.file]) {
				profileFileMap[mapping.file] = { profile: mapping.profile, services: [] };
			}
			profileFileMap[mapping.file]?.services.push(info);
		} else {
			baseServiceIds.add(info.id);
		}
	}
	const gatewayKey = `${framework.id}-gateway`;
	const cliKey = `${framework.id}-cli`;
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

		baseServices[gatewayKey] = gatewayService;

		for (const info of serviceInfos) {
			if (baseServiceIds.has(info.id)) {
				baseServices[info.id] = info.entry;
			}
		}

		// Add postgres-setup init container if needed
		const pgSetup = buildPostgresSetup(resolved, framework.networkName);
		if (pgSetup) {
			baseServices["postgres-setup"] = pgSetup;
		}

		// Add companion framework containers
		if (options.companionFrameworks && options.companionFrameworks.length > 0) {
			const fwOptions = toFrameworkComposeOptions(options);
			for (const companionId of options.companionFrameworks) {
				const companionFw = getFrameworkById(companionId);
				if (!companionFw || companionFw.id === framework.id) continue;
				if (companionFw.buildCompanionService) {
					const companionEntry = companionFw.buildCompanionService(resolved, fwOptions);
					if (companionEntry) {
						baseServices[`${companionFw.id}-companion`] = companionEntry;
					}
				} else {
					const companionResult = companionFw.buildGatewayService(resolved, fwOptions);
					baseServices[`${companionFw.id}-companion`] = companionResult.gatewayService;
				}
			}
		}

		if (cliService) {
			baseServices[cliKey] = cliService;
		}
	} else {
		// Direct install: no gateway/CLI containers
		for (const info of serviceInfos) {
			if (baseServiceIds.has(info.id)) {
				baseServices[info.id] = info.entry;
			}
		}

		const pgSetup = buildPostgresSetup(resolved, framework.networkName);
		if (pgSetup) {
			baseServices["postgres-setup"] = pgSetup;
		}
	}

	const sortedAllVolumes: Record<string, null> = {};
	for (const v of [...allVolumes].sort()) {
		sortedAllVolumes[v] = null;
	}

	const networks = { [framework.networkName]: { driver: "bridge" } };

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
