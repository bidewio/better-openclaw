import { randomBytes } from "node:crypto";
import { stringify } from "yaml";
import { parse as parseYaml } from "yaml";
import { buildCompanionService, buildPostgresSetup, quotedStr, YAML_OPTIONS } from "./composer.js";
import { getDbRequirements } from "./generators/postgres-init.js";
import { generateSkillFiles } from "./generators/skills.js";
import { resolve } from "./resolver.js";
import { AddonStackInputSchema, AddonStackUpdateInputSchema } from "./schema.js";
import { getServiceById } from "./services/registry.js";
import type {
	AddonStackInput,
	AddonStackResult,
	AddonStackUpdateInput,
	AddonStackUpdateResult,
	ComposeOptions,
	ProxyRoute,
	ResolvedService,
	ResolverOutput,
	ServiceDefinition,
	SkippedService,
} from "./types.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** Services that Clawexa's cloud-init already provisions (or are mandatory platform services). */
const INFRA_SERVICE_IDS = new Set([
	"openclaw-gateway",
	"openclaw-cli",
	"redis",
	"postgresql",
	"open-webui",
	"caddy",
	"traefik",
	"postgres-setup",
	// Mandatory platform services provisioned by Clawexa cloud-init
	"convex",
	"convex-dashboard",
	"mission-control",
]);

/** Env keys managed by Clawexa's cloud-init — never include in addon env output. */
const CLAWEXA_MANAGED_ENV_KEYS = new Set([
	"COMPOSE_FILE",
	"COMPOSE_PROFILES",
	"OPENCLAW_VERSION",
	"OPENCLAW_GATEWAY_TOKEN",
	"OPENCLAW_GATEWAY_PORT",
	"OPENCLAW_BRIDGE_PORT",
	"OPENCLAW_GATEWAY_BIND",
	"OPENCLAW_CONFIG_DIR",
	"OPENCLAW_WORKSPACE_DIR",
	"REDIS_PASSWORD",
	"REDIS_HOST",
	"REDIS_PORT",
	"POSTGRES_USER",
	"POSTGRES_PASSWORD",
	"POSTGRES_DB",
	"POSTGRES_HOST",
	"POSTGRES_PORT",
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Sanitize instanceId into a valid Docker Compose project name. */
function sanitizeProjectName(instanceId: string): string {
	return instanceId
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-")
		.slice(0, 64) || "addon";
}

/** Generate a cryptographically secure hex secret of the given byte length. */
function generateHexSecret(bytes: number): string {
	return randomBytes(bytes).toString("hex");
}

/** Generate a cryptographically secure base64url secret of the given byte length. */
function generateBase64UrlSecret(bytes: number): string {
	return randomBytes(bytes).toString("base64url");
}

/**
 * Check if a service requires user-provided credentials that are missing.
 * Returns the list of missing credential keys, or empty if all are satisfied.
 *
 * When `generateSecrets` is true, empty-default secrets are auto-generated
 * (passwords, tokens, etc.) and are NOT considered missing. Only secrets
 * with `validation` regex patterns (indicating specific format like API keys)
 * are flagged as missing when not provided by the user.
 */
function getMissingCredentials(
	def: ServiceDefinition,
	userCredentials: Record<string, string> | undefined,
	generateSecrets: boolean,
): string[] {
	const missing: string[] = [];
	for (const env of def.environment) {
		// Skip if not required or not a secret
		if (!env.required || !env.secret) continue;
		// Skip if it has a non-empty default value or is a reference
		if (env.defaultValue && env.defaultValue.length > 0) continue;
		// Skip if user provided the credential
		if (userCredentials?.[env.key]) continue;
		// When generateSecrets is true, empty secrets are auto-generated
		// Only flag as missing if the env var has a validation pattern
		// (indicating it needs a specific format like an API key)
		if (generateSecrets && !env.validation) continue;

		missing.push(env.key);
	}
	return missing;
}

/**
 * Apply env quirks (from service definition) to the generated env values.
 * Handles: empty_string_crashes → set fixed value, min_length → generate longer secret,
 * must_sync → ensure two keys have the same value.
 */
function applyEnvQuirks(
	def: ServiceDefinition,
	envValues: Map<string, string>,
	generateSecrets: boolean,
): void {
	if (!def.envQuirks) return;

	for (const quirk of def.envQuirks) {
		switch (quirk.issue) {
			case "empty_string_crashes": {
				if (quirk.fix.type === "set_value" && quirk.fix.value !== undefined) {
					envValues.set(quirk.key, quirk.fix.value);
				}
				break;
			}
			case "min_length": {
				if (!generateSecrets) break;
				const current = envValues.get(quirk.key) || "";
				const minBytes = quirk.fix.minBytes || 24;
				const minHexLen = minBytes * 2;
				if (current.length < minHexLen) {
					if (quirk.fix.type === "generate_hex") {
						envValues.set(quirk.key, generateHexSecret(minBytes));
					} else if (quirk.fix.type === "generate_base64url") {
						envValues.set(quirk.key, generateBase64UrlSecret(minBytes));
					}
				}
				break;
			}
			case "must_sync": {
				if (quirk.fix.type === "sync_with" && quirk.fix.syncKey) {
					const sourceValue = envValues.get(quirk.key) || envValues.get(quirk.fix.syncKey);
					if (sourceValue) {
						envValues.set(quirk.key, sourceValue);
						envValues.set(quirk.fix.syncKey, sourceValue);
					}
				}
				break;
			}
		}
	}
}

/**
 * Build proxy routes from resolved addon services.
 */
function buildProxyRoutes(services: ResolvedService[]): ProxyRoute[] {
	const routes: ProxyRoute[] = [];
	for (const { definition: def } of services) {
		const exposedPort = def.ports.find((p) => p.exposed);
		if (!exposedPort) continue;

		routes.push({
			serviceId: def.id,
			path: def.proxyPath || `/${def.id}`,
			port: exposedPort.container,
			protocol: "http",
			stripPrefix: true,
		});
	}
	return routes;
}

/**
 * Build a minimal ComposeOptions suitable for addon stack generation.
 * No proxy, no gateway, no hardening by default.
 */
function buildAddonComposeOptions(projectName: string, input: AddonStackInput): ComposeOptions {
	return {
		projectName,
		proxy: "none",
		gpu: false,
		platform: input.platform ?? "linux/amd64",
		deployment: "clawexa",
		openclawVersion: input.openclawVersion ?? "latest",
		openclawImage: "official",
		hardened: false, // Clawexa default: no cap_drop/security_opt
		openclawInstallMethod: "docker",
	};
}

/**
 * Resolve port conflicts between addon services and reserved ports.
 * Returns a map of serviceId → { originalPort → assignedPort }.
 */
function resolvePortConflicts(
	addonServices: ResolvedService[],
	reservedPorts: number[],
	portOverrides?: Record<string, Record<string, number>>,
): { assignments: Record<string, number>; overrides: Record<string, Record<string, number>> } {
	const usedPorts = new Set(reservedPorts);
	const assignments: Record<string, number> = {};
	const overrides: Record<string, Record<string, number>> = {};

	for (const { definition: def } of addonServices) {
		for (const port of def.ports) {
			if (!port.exposed) continue;

			// Check for user-specified override
			const userOverride = portOverrides?.[def.id]?.[String(port.host)];
			if (userOverride) {
				usedPorts.add(userOverride);
				assignments[`${def.id}:${port.container}`] = userOverride;
				if (!overrides[def.id]) overrides[def.id] = {};
				overrides[def.id][String(port.host)] = userOverride;
				continue;
			}

			let assignedPort = port.host;
			if (usedPorts.has(assignedPort)) {
				// Auto-reassign to port+1000 range
				assignedPort = port.host + 1000;
				while (usedPorts.has(assignedPort)) {
					assignedPort++;
				}
				if (!overrides[def.id]) overrides[def.id] = {};
				overrides[def.id][String(port.host)] = assignedPort;
			}
			usedPorts.add(assignedPort);
			assignments[`${def.id}:${port.container}`] = assignedPort;
		}
	}

	return { assignments, overrides };
}

// ── Main: generateAddonStack ─────────────────────────────────────────────────

/**
 * Generates a Docker Compose override stack containing only addon services
 * for Clawexa managed instances. Infrastructure services (gateway, redis,
 * postgres, open-webui, caddy) are excluded since Clawexa's cloud-init
 * already provisions them.
 *
 * This function never throws. Errors are reported via `warnings` and
 * `metadata.skippedServices`.
 */
export function generateAddonStack(rawInput: AddonStackInput): AddonStackResult {
	const warnings: string[] = [];
	const skippedServices: SkippedService[] = [];
	const generatedSecretKeys: string[] = [];

	// 1. Parse & validate input
	let input: AddonStackInput;
	try {
		input = AddonStackInputSchema.parse(rawInput);
	} catch (err) {
		return emptyResult(`Invalid input: ${err instanceof Error ? err.message : String(err)}`);
	}

	const projectName = sanitizeProjectName(input.instanceId);

	// 2. Filter out infrastructure service IDs from request
	const addonServiceIds = input.services.filter((id) => {
		if (INFRA_SERVICE_IDS.has(id)) {
			warnings.push(`Service "${id}" is managed by Clawexa infrastructure and was excluded.`);
			return false;
		}
		return true;
	});

	if (addonServiceIds.length === 0) {
		return emptyResult("No addon services requested (all were infrastructure services).");
	}

	// 3. Validate all service IDs exist in registry
	const validServiceIds: string[] = [];
	for (const id of addonServiceIds) {
		const svc = getServiceById(id);
		if (!svc) {
			skippedServices.push({
				serviceId: id,
				reason: "unknown_service",
				details: `Service "${id}" does not exist in the registry.`,
			});
		} else {
			validServiceIds.push(id);
		}
	}

	if (validServiceIds.length === 0) {
		return {
			...emptyResultBase(),
			metadata: {
				...emptyResultBase().metadata,
				skippedServices,
			},
			warnings: [...warnings, "No valid addon services to deploy."],
		};
	}

	// 4. Resolve dependencies
	let resolved: ResolverOutput;
	try {
		resolved = resolve({
			services: validServiceIds,
			skillPacks: input.skillPacks,
			aiProviders: input.aiProviders,
			platform: input.platform ?? "linux/amd64",
		});
	} catch (err) {
		return {
			...emptyResultBase(),
			metadata: {
				...emptyResultBase().metadata,
				skippedServices,
			},
			warnings: [
				...warnings,
				`Dependency resolution failed: ${err instanceof Error ? err.message : String(err)}`,
			],
		};
	}

	// Forward resolver warnings
	for (const w of resolved.warnings) {
		warnings.push(w.message);
	}

	// 5. Filter resolved services: keep only addon services (not infra)
	const addonResolved: ResolvedService[] = [];
	for (const svc of resolved.services) {
		if (INFRA_SERVICE_IDS.has(svc.definition.id)) continue;
		addonResolved.push(svc);
	}

	// 6. Check credentials, images, platform, GPU for each addon service
	const deployableServices: ResolvedService[] = [];
	for (const svc of addonResolved) {
		const def = svc.definition;

		// Check for git-based services without prebuilt image
		if (def.gitSource && def.buildContext && !def.image) {
			const prebuilt = def.prebuiltImage || input.prebuiltImages[def.id];
			if (!prebuilt) {
				skippedServices.push({
					serviceId: def.id,
					reason: "no_image",
					details: `Service "${def.name}" requires building from source but no pre-built image is available.`,
				});
				continue;
			}
		}

		// Check GPU requirement — skip if host has no GPU support
		if (def.gpuRequired && !input.gpu) {
			skippedServices.push({
				serviceId: def.id,
				reason: "gpu_required",
				details: `Service "${def.name}" requires a GPU but the host does not have GPU support.`,
			});
			continue;
		}

		// Check user-provided credentials
		const userCreds = input.credentials[def.id];
		const missing = getMissingCredentials(def, userCreds, input.generateSecrets);
		if (missing.length > 0) {
			skippedServices.push({
				serviceId: def.id,
				reason: "missing_credentials",
				details: `Service "${def.name}" requires credentials: ${missing.join(", ")}`,
				requiredCredentials: missing,
			});
			continue;
		}

		deployableServices.push(svc);
	}

	if (deployableServices.length === 0) {
		return {
			...emptyResultBase(),
			metadata: {
				...emptyResultBase().metadata,
				skippedServices,
			},
			warnings: [...warnings, "No deployable addon services after filtering."],
		};
	}

	// 7. Resolve port conflicts (include ports from existingServices)
	const allReservedPorts = [...input.reservedPorts];
	for (const existingId of input.existingServices) {
		const existingDef = getServiceById(existingId);
		if (existingDef) {
			for (const port of existingDef.ports) {
				if (port.exposed) allReservedPorts.push(port.host);
			}
		}
	}
	const portConflicts = resolvePortConflicts(
		deployableServices,
		allReservedPorts,
		input.portOverrides,
	);

	// Build a fake "full" resolved output for buildCompanionService
	// It needs to see all services to resolve depends_on references
	const addonResolvedOutput: ResolverOutput = {
		services: deployableServices,
		addedDependencies: resolved.addedDependencies,
		removedConflicts: resolved.removedConflicts,
		warnings: resolved.warnings,
		errors: [],
		isValid: true,
		estimatedMemoryMB: deployableServices.reduce(
			(sum, s) => sum + (s.definition.minMemoryMB ?? 128),
			0,
		),
		aiProviders: input.aiProviders ?? [],
		gsdRuntimes: [],
	};

	// 8. Build compose options (no hardening for Clawexa)
	const composeOptions = buildAddonComposeOptions(projectName, input);
	if (Object.keys(portConflicts.overrides).length > 0) {
		composeOptions.portOverrides = portConflicts.overrides;
	}

	// 9. Build per-service entries
	const services: Record<string, Record<string, unknown>> = {};
	const allVolumes = new Set<string>();
	const envValues = new Map<string, string>();

	for (const svc of deployableServices) {
		const def = svc.definition;
		try {
			// Handle prebuilt image substitution for git-based services
			let effectiveDef = def;
			if (def.gitSource && def.buildContext && !def.image) {
				const prebuiltImage = def.prebuiltImage || input.prebuiltImages[def.id];
				if (prebuiltImage) {
					const [img, tag] = prebuiltImage.includes(":")
						? prebuiltImage.split(":")
						: [prebuiltImage, "latest"];
					effectiveDef = {
						...def,
						image: img,
						imageTag: tag,
						gitSource: undefined,
						buildContext: undefined,
					};
				}
			}

			const { entry, volumeNames } = buildCompanionService(
				effectiveDef,
				addonResolvedOutput,
				composeOptions,
				allVolumes,
			);

			// Remove profiles from the service entry
			delete (entry as Record<string, unknown>).profiles;

			// Remove depends_on references to infrastructure services
			if (entry.depends_on) {
				const deps = entry.depends_on as Record<string, { condition: string }>;
				for (const depId of Object.keys(deps)) {
					if (INFRA_SERVICE_IDS.has(depId)) {
						delete deps[depId];
					}
				}
				if (Object.keys(deps).length === 0) {
					delete entry.depends_on;
				}
			}

			services[def.id] = entry;
			for (const v of volumeNames) allVolumes.add(v);

			// Inject user-provided credentials into env
			const userCreds = input.credentials[def.id];
			if (userCreds) {
				for (const [key, value] of Object.entries(userCreds)) {
					envValues.set(key, value);
				}
				// Sync referenced keys: if a user provides e.g. DB_POSTGRESDB_PASSWORD
				// and the env var's defaultValue is "${N8N_DB_PASSWORD}", sync the ref key
				// so postgres-setup uses the same password.
				for (const envVar of def.environment) {
					if (
						userCreds[envVar.key] &&
						envVar.defaultValue?.startsWith("${") &&
						envVar.defaultValue?.endsWith("}")
					) {
						const refKey = envVar.defaultValue.slice(2, -1);
						envValues.set(refKey, userCreds[envVar.key]);
					}
				}
			}
		} catch (err) {
			skippedServices.push({
				serviceId: def.id,
				reason: "resolution_error",
				details: `Failed to build compose entry: ${err instanceof Error ? err.message : String(err)}`,
			});
			warnings.push(`Failed to process service "${def.name}": ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	// 10. Build postgres-setup if any addon needs a DB
	// We need to check if any of our deployable services require DB setup
	// and if postgresql is in the infrastructure (it is for Clawexa)
	const dbReqs = getDbRequirements(addonResolvedOutput);
	if (dbReqs.length > 0) {
		// Build a custom postgres-setup that references the existing PostgreSQL
		// We can't use buildPostgresSetup directly because it checks for postgresql
		// in the resolved services. Instead, build it manually.
		const scriptLines = ["echo '=== PostgreSQL database setup (addon) ==='", "FAILED=0"];

		for (const req of dbReqs) {
			scriptLines.push(
				`echo "Setting up database '${req.dbName}' with user '${req.dbUser}'..."`,
				`psql -c "SELECT 1 FROM pg_roles WHERE rolname='${req.dbUser}'" | grep -q 1 || psql -c "CREATE ROLE ${req.dbUser} WITH LOGIN PASSWORD '$$${req.passwordEnvVar}'"`,
				`psql -c "ALTER ROLE ${req.dbUser} WITH LOGIN PASSWORD '$$${req.passwordEnvVar}'"`,
				`psql -tc "SELECT 1 FROM pg_database WHERE datname='${req.dbName}'" | grep -q 1 || psql -c "CREATE DATABASE ${req.dbName} OWNER ${req.dbUser}"`,
				`psql -c "GRANT ALL PRIVILEGES ON DATABASE ${req.dbName} TO ${req.dbUser}" || FAILED=1`,
				`echo "  Done: ${req.dbName}"`,
			);
		}
		scriptLines.push("echo '=== All databases ready ==='", "exit $$FAILED");

		const dbEnv: Record<string, string> = {
			PGHOST: "postgresql",
			PGUSER: "${POSTGRES_USER:-openclaw}",
			PGDATABASE: "${POSTGRES_DB:-openclaw}",
			PGPASSWORD: "${POSTGRES_PASSWORD}",
		};
		for (const req of dbReqs) {
			dbEnv[req.passwordEnvVar] = `\${${req.passwordEnvVar}}`;
		}

		services["postgres-setup"] = {
			image: "postgres:17-alpine",
			depends_on: {
				postgresql: { condition: "service_healthy" },
			},
			environment: dbEnv,
			entrypoint: ["/bin/sh", "-c"],
			command: [scriptLines.join("\n")],
			restart: quotedStr("no"),
			networks: ["openclaw-network"],
		};

		// Update addon services that need DB to depend on postgres-setup
		for (const req of dbReqs) {
			const svcEntry = services[req.serviceId];
			if (svcEntry) {
				const deps = (svcEntry.depends_on as Record<string, { condition: string }>) || {};
				deps["postgres-setup"] = { condition: "service_completed_successfully" };
				svcEntry.depends_on = deps;
			}
		}
	}

	// 11. Generate secrets and env file
	const envLines: string[] = [
		"# ═══════════════════════════════════════════════════════════════════════════════",
		"# OpenClaw Addon Stack Environment",
		`# Instance: ${input.instanceId}`,
		`# Generated at ${new Date().toISOString()}`,
		"# ═══════════════════════════════════════════════════════════════════════════════",
		"",
	];

	// DB passwords first
	if (dbReqs.length > 0) {
		envLines.push("# ── Per-Service Database Passwords ──────────────────────────────────────");
		for (const req of dbReqs) {
			const secretValue = input.generateSecrets ? generateHexSecret(24) : "";
			envValues.set(req.passwordEnvVar, secretValue);
			if (secretValue) generatedSecretKeys.push(req.passwordEnvVar);
			envLines.push(`# PostgreSQL password for ${req.serviceName} (db: ${req.dbName}, user: ${req.dbUser})`);
			envLines.push(`${req.passwordEnvVar}=${secretValue}`);
			envLines.push("");
		}
	}

	// Per-service env vars
	const seenKeys = new Set<string>([...CLAWEXA_MANAGED_ENV_KEYS, ...dbReqs.map((r) => r.passwordEnvVar)]);
	const envVarGroups: AddonStackResult["envVars"] = [];

	for (const svc of deployableServices) {
		const def = svc.definition;
		const allEnvVars = [...def.environment, ...def.openclawEnvVars];
		if (allEnvVars.length === 0) continue;

		const groupVars: AddonStackResult["envVars"][number]["vars"] = [];

		envLines.push(`# ── ${def.icon} ${def.name} ──────────────────────────────────────`);

		for (const envVar of allEnvVars) {
			if (seenKeys.has(envVar.key)) continue;
			seenKeys.add(envVar.key);

			// Check if user provided this credential
			const userValue = input.credentials[def.id]?.[envVar.key];
			let actualValue: string;

			if (userValue !== undefined) {
				actualValue = userValue;
			} else if (envVar.secret) {
				// Resolve references like ${N8N_DB_PASSWORD}
				if (envVar.defaultValue.startsWith("${") && envVar.defaultValue.endsWith("}")) {
					const refKey = envVar.defaultValue.slice(2, -1);
					actualValue = envValues.get(refKey) || envVar.defaultValue;
				} else if (input.generateSecrets) {
					actualValue = generateHexSecret(24);
					generatedSecretKeys.push(envVar.key);
				} else {
					actualValue = envVar.defaultValue;
				}
			} else {
				actualValue = envVar.defaultValue;
			}

			envValues.set(envVar.key, actualValue);

			envLines.push(`# ${envVar.description}`);
			envLines.push(`${envVar.key}=${actualValue}`);
			envLines.push("");

			groupVars.push({
				key: envVar.key,
				description: envVar.description,
				value: actualValue,
				secret: envVar.secret,
			});
		}

		if (groupVars.length > 0) {
			envVarGroups.push({
				serviceName: def.name,
				vars: groupVars,
			});
		}
	}

	// Apply env quirks after all values are generated
	for (const svc of deployableServices) {
		applyEnvQuirks(svc.definition, envValues, input.generateSecrets);
	}

	// Rebuild env lines from envValues (quirks may have modified values or introduced new keys)
	const quirkedKeys = new Set<string>();
	const finalEnvLines: string[] = [];
	for (const line of envLines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			finalEnvLines.push(line);
			continue;
		}
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx > 0) {
			const key = trimmed.slice(0, eqIdx);
			quirkedKeys.add(key);
			const fixedValue = envValues.get(key);
			if (fixedValue !== undefined) {
				finalEnvLines.push(`${key}=${fixedValue}`);
			} else {
				finalEnvLines.push(line);
			}
		} else {
			finalEnvLines.push(line);
		}
	}
	// Append any new keys introduced by quirks (e.g., must_sync creating a new key)
	for (const [key, value] of envValues) {
		if (!quirkedKeys.has(key) && !seenKeys.has(key) && !CLAWEXA_MANAGED_ENV_KEYS.has(key)) {
			finalEnvLines.push(`# Synced by env quirk`);
			finalEnvLines.push(`${key}=${value}`);
			finalEnvLines.push("");
		}
	}
	const envFile = finalEnvLines.join("\n");

	// 12. Generate skill files
	const skillFiles = generateSkillFiles(addonResolvedOutput);

	// 13. Build openclaw config patch
	const skillEntries: Record<string, { enabled: boolean }> = {};
	let skillCount = 0;
	for (const svc of deployableServices) {
		for (const skill of svc.definition.skills) {
			if (skill.autoInstall) {
				skillEntries[skill.skillId] = { enabled: true };
				skillCount++;
			}
		}
	}

	// 14. Build proxy routes
	const proxyRoutes = buildProxyRoutes(deployableServices);

	// 14b. Build additional files (e.g. sandbox.toml for opensandbox)
	const additionalFiles: Record<string, string> = {};
	if (deployableServices.some((s) => s.definition.id === "opensandbox")) {
		additionalFiles["sandbox.toml"] = [
			"[server]",
			'host = "0.0.0.0"',
			"port = 8080",
			'log_level = "INFO"',
			'api_key = "${OPEN_SANDBOX_API_KEY}"',
			"",
			"[runtime]",
			'type = "docker"',
			'execd_image = "opensandbox/execd:v1.0.6"',
			"",
			"[docker]",
			"network_mode = \"bridge\"",
			'drop_capabilities = ["NET_ADMIN", "SYS_ADMIN", "SYS_PTRACE", "MKNOD", "NET_RAW", "SYS_RAWIO"]',
			"no_new_privileges = true",
			"pids_limit = 512",
			"",
			"[secure_runtime]",
			'type = "gvisor"',
			"",
		].join("\n");
	}

	// 14c. Build pre-pull images list
	const prePullImages: Array<{ image: string; priority: 1 | 2 | 3 }> = [];
	if (deployableServices.some((s) => s.definition.id === "opensandbox")) {
		prePullImages.push(
			// Priority 1: always pulled (core + Homespace)
			{ image: "opensandbox/server:v1.0.6", priority: 1 },
			{ image: "opensandbox/execd:v1.0.6", priority: 1 },
			{ image: "opensandbox/desktop:latest", priority: 1 },
			{ image: "opensandbox/chrome:latest", priority: 1 },
			// Priority 2: recommended (common languages)
			{ image: "opensandbox/code-interpreter:python", priority: 2 },
			{ image: "opensandbox/code-interpreter:node", priority: 2 },
			// Priority 3: optional (full multi-lang and IDE)
			{ image: "opensandbox/code-interpreter:latest", priority: 3 },
			{ image: "opensandbox/vscode:latest", priority: 3 },
		);
	}

	// 15. Compose single YAML
	const volumeMap: Record<string, null> = {};
	for (const v of allVolumes) {
		volumeMap[v] = null;
	}

	const composeDoc: Record<string, unknown> = {
		services,
	};

	if (Object.keys(volumeMap).length > 0) {
		composeDoc.volumes = volumeMap;
	}

	composeDoc.networks = {
		"openclaw-network": {
			external: true,
		},
	};

	const composeOverride = stringify(composeDoc, YAML_OPTIONS);

	// 16. Return result
	return {
		composeOverride,
		envFile,
		envVars: envVarGroups,
		skillFiles,
		openclawConfigPatch: {
			skills: { entries: skillEntries },
		},
		proxyRoutes,
		additionalFiles,
		metadata: {
			serviceCount: Object.keys(services).length,
			skillCount,
			estimatedMemoryMB: addonResolvedOutput.estimatedMemoryMB,
			resolvedServices: deployableServices.map((s) => s.definition.id),
			skippedServices,
			generatedSecretKeys,
			portAssignments: portConflicts.assignments,
			prePullImages,
		},
		warnings,
	};
}

// ── Main: updateAddonStack ───────────────────────────────────────────────────

/**
 * Incrementally updates an existing addon stack by adding or removing services.
 * Preserves existing env values (never overwrites user-customized values).
 *
 * This function never throws.
 */
export function updateAddonStack(rawInput: AddonStackUpdateInput): AddonStackUpdateResult {
	const warnings: string[] = [];

	// 1. Parse & validate
	let input: AddonStackUpdateInput;
	try {
		input = AddonStackUpdateInputSchema.parse(rawInput);
	} catch (err) {
		return emptyUpdateResult(`Invalid input: ${err instanceof Error ? err.message : String(err)}`);
	}

	// 2. Parse existing compose YAML to extract current service list
	let currentServiceIds: string[] = [];
	try {
		const existingCompose = parseYaml(input.currentCompose);
		if (existingCompose?.services && typeof existingCompose.services === "object") {
			currentServiceIds = Object.keys(existingCompose.services).filter(
				(id) => id !== "postgres-setup",
			);
		}
	} catch (err) {
		warnings.push(
			`Failed to parse existing compose YAML: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	// 3. Parse existing env into a map
	const existingEnvMap = new Map<string, string>();
	for (const line of input.currentEnv.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx > 0) {
			existingEnvMap.set(trimmed.slice(0, eqIdx), trimmed.slice(eqIdx + 1));
		}
	}

	// 4. Compute desired service list
	const addSet = new Set(input.addServices);
	const removeSet = new Set(input.removeServices);
	const desiredServiceIds = [
		...currentServiceIds.filter((id) => !removeSet.has(id)),
		...input.addServices.filter((id) => !currentServiceIds.includes(id)),
	];

	// 5. Generate the full target state
	const targetResult = generateAddonStack({
		instanceId: input.instanceId,
		services: desiredServiceIds,
		skillPacks: [],
		platform: input.platform,
		openclawVersion: input.openclawVersion,
		reservedPorts: input.reservedPorts,
		generateSecrets: input.generateSecrets,
		credentials: input.credentials,
		portOverrides: input.portOverrides,
		aiProviders: input.aiProviders,
		prebuiltImages: input.prebuiltImages,
	});

	// 6. Merge env: preserve existing values, only add new ones
	const mergedEnvLines: string[] = [];
	for (const line of targetResult.envFile.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			mergedEnvLines.push(line);
			continue;
		}
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx > 0) {
			const key = trimmed.slice(0, eqIdx);
			if (existingEnvMap.has(key)) {
				// Preserve existing value
				mergedEnvLines.push(`${key}=${existingEnvMap.get(key)}`);
			} else {
				mergedEnvLines.push(line);
			}
		} else {
			mergedEnvLines.push(line);
		}
	}

	// 7. Compute diffs
	const currentSet = new Set(currentServiceIds);
	const targetSet = new Set(targetResult.metadata.resolvedServices);
	const added = [...targetSet].filter((id) => !currentSet.has(id));
	const removed = [...currentSet].filter((id) => !targetSet.has(id));
	const unchanged = [...currentSet].filter((id) => targetSet.has(id));

	// 8. Compute skill diffs
	const newSkillFiles: Record<string, string> = {};
	const removedSkillSlugs: string[] = [];

	// New skills from added services
	for (const id of added) {
		const def = getServiceById(id);
		if (!def) continue;
		for (const skill of def.skills) {
			const skillPath = Object.keys(targetResult.skillFiles).find(
				(path) => path.includes(skill.skillId),
			);
			if (skillPath) {
				newSkillFiles[skillPath] = targetResult.skillFiles[skillPath];
			}
		}
	}

	// Removed skills from removed services
	for (const id of removed) {
		const def = getServiceById(id);
		if (!def) continue;
		for (const skill of def.skills) {
			removedSkillSlugs.push(skill.skillId);
		}
	}

	// 9. Proxy route diffs
	const addProxyRoutes = targetResult.proxyRoutes.filter((r) => added.includes(r.serviceId));
	const removeProxyRoutes = removed;

	// 10. Images to pull for new services
	const imagesToPull: string[] = [];
	for (const id of added) {
		const def = getServiceById(id);
		if (def?.image && def?.imageTag) {
			imagesToPull.push(`${def.image}:${def.imageTag}`);
		} else if (def?.prebuiltImage) {
			imagesToPull.push(def.prebuiltImage);
		}
	}

	// 11. Estimate memory delta
	let memoryDelta = 0;
	for (const id of added) {
		const def = getServiceById(id);
		memoryDelta += def?.minMemoryMB ?? 128;
	}
	for (const id of removed) {
		const def = getServiceById(id);
		memoryDelta -= def?.minMemoryMB ?? 128;
	}

	// Add existing skills to the config patch
	const addSkillEntries: Record<string, { enabled: boolean }> = {};
	for (const id of added) {
		const def = getServiceById(id);
		if (!def) continue;
		for (const skill of def.skills) {
			if (skill.autoInstall) {
				addSkillEntries[skill.skillId] = { enabled: true };
			}
		}
	}

	return {
		composeOverride: targetResult.composeOverride,
		envFile: mergedEnvLines.join("\n"),
		newSkillFiles,
		removedSkillSlugs,
		openclawConfigPatch: {
			skills: {
				add: addSkillEntries,
				remove: removedSkillSlugs,
			},
		},
		addProxyRoutes,
		removeProxyRoutes,
		imagesToPull,
		restartRequired: added, // New services need starting, not restarting
		metadata: {
			added,
			removed,
			unchanged,
			estimatedMemoryDelta: memoryDelta,
		},
		warnings: [...warnings, ...targetResult.warnings],
	};
}

// ── Empty Result Helpers ─────────────────────────────────────────────────────

function emptyResultBase(): AddonStackResult {
	return {
		composeOverride: "services: {}\n",
		envFile: "",
		envVars: [],
		skillFiles: {},
		openclawConfigPatch: { skills: { entries: {} } },
		proxyRoutes: [],
		additionalFiles: {},
		metadata: {
			serviceCount: 0,
			skillCount: 0,
			estimatedMemoryMB: 0,
			resolvedServices: [],
			skippedServices: [],
			generatedSecretKeys: [],
			portAssignments: {},
			prePullImages: [],
		},
		warnings: [],
	};
}

function emptyResult(warning: string): AddonStackResult {
	return {
		...emptyResultBase(),
		warnings: [warning],
	};
}

function emptyUpdateResult(warning: string): AddonStackUpdateResult {
	return {
		composeOverride: "services: {}\n",
		envFile: "",
		newSkillFiles: {},
		removedSkillSlugs: [],
		openclawConfigPatch: { skills: { add: {}, remove: [] } },
		addProxyRoutes: [],
		removeProxyRoutes: [],
		imagesToPull: [],
		restartRequired: [],
		metadata: {
			added: [],
			removed: [],
			unchanged: [],
			estimatedMemoryDelta: 0,
		},
		warnings: [warning],
	};
}
