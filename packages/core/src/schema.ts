import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const ServiceCategorySchema = z.enum([
	"automation",
	"vector-db",
	"media",
	"storage",
	"database",
	"proxy",
	"monitoring",
	"browser",
	"search",
	"ai",
	"communication",
	"coding-agent",
	"social-media",
	"analytics",
	"ai-platform",
	"dev-tools",
	"knowledge",
	"desktop",
	"streaming",
	"security",
	"billing",
	"crm",
	"email-marketing",
	"forms",
	"api-gateway",
	"backup",
	"voice",
	"ecommerce",
	"collaboration",
	"ai-observability",
	"fine-tuning",
	"project-management",
	"business-intelligence",
	"dns-networking",
	"iot",
	"saas-boilerplate",
]);

export const MaturitySchema = z.enum(["stable", "beta", "experimental"]);

export const PlatformSchema = z.enum([
	"linux/amd64",
	"linux/arm64",
	"windows/amd64",
	"macos/amd64",
	"macos/arm64",
]);

/** Platform for Docker image arch only (used by resolver/compose). */
export const ComposePlatformSchema = z.enum(["linux/amd64", "linux/arm64"]);

export const DeploymentTypeSchema = z.enum(["docker", "bare-metal", "local"]);

export const RestartPolicySchema = z.enum(["unless-stopped", "always", "on-failure", "no"]);

export const ProxyTypeSchema = z.enum(["none", "caddy", "traefik"]);

export const DeploymentTargetSchema = z.enum(["local", "vps", "homelab", "clawexa"]);

export const OutputFormatSchema = z.enum(["directory", "tar", "zip"]);

export const OpenclawImageVariantSchema = z.enum(["official", "coolify", "alpine"]);

export const OpenclawInstallMethodSchema = z.enum(["docker", "direct"]);

export const DeployTargetSchema = z.enum(["local", "cloud-init"]);

export const AiProviderSchema = z.enum([
	"openai",
	"anthropic",
	"google",
	"xai",
	"deepseek",
	"groq",
	"openrouter",
	"mistral",
	"together",
	"ollama",
	"ollama-cloud",
	"lmstudio",
	"vllm",
]);

export const GsdRuntimeSchema = z.enum(["claude", "opencode", "gemini", "codex"]);

// ─── Sub-Schemas ────────────────────────────────────────────────────────────

export const PortMappingSchema = z.object({
	host: z.number().int().min(1).max(65535),
	container: z.number().int().min(1).max(65535),
	description: z.string(),
	exposed: z.boolean().default(true),
});

export const VolumeMappingSchema = z.object({
	name: z.string().min(1),
	containerPath: z.string().min(1),
	description: z.string(),
	driver: z.string().optional(),
});

export const EnvVariableSchema = z.object({
	key: z.string().min(1),
	defaultValue: z.string(),
	secret: z.boolean().default(false),
	description: z.string(),
	required: z.boolean().default(true),
	validation: z.string().optional(),
});

export const HealthCheckSchema = z.object({
	test: z.string().min(1),
	interval: z.string().default("30s"),
	timeout: z.string().default("10s"),
	retries: z.number().int().min(1).default(3),
	startPeriod: z.string().optional(),
});

export const ResourceLimitsSchema = z.object({
	cpus: z.string().optional(),
	memory: z.string().optional(),
});

export const DeploySchema = z.object({
	resources: z
		.object({
			limits: ResourceLimitsSchema.optional(),
			reservations: ResourceLimitsSchema.optional(),
		})
		.optional(),
});

export const SkillBindingSchema = z.object({
	skillId: z.string().min(1),
	autoInstall: z.boolean().default(true),
	configOverrides: z.record(z.string(), z.string()).optional(),
});

/** Platform for native install (linux, windows, macos — no arch). */
export const NativePlatformSchema = z.enum(["linux", "windows", "macos"]);

export const NativeRecipeSchema = z.object({
	platform: NativePlatformSchema,
	installSteps: z.array(z.string()).min(1),
	startCommand: z.string(),
	stopCommand: z.string().optional(),
	configPath: z.string().optional(),
	configTemplate: z.string().optional(),
	systemdUnit: z.string().optional(),
});

// ─── Git Source / Build Context (for repo-based services) ───────────────────

export const GitSourceSchema = z.object({
	/** Git clone URL, e.g. "https://github.com/wasp-lang/open-saas.git" */
	repoUrl: z.string().url(),
	/** Branch or tag to clone. Defaults to repo's default branch. */
	branch: z.string().optional(),
	/** Subdirectory within the cloned repo to use as build context root. */
	subdirectory: z.string().optional(),
	/** Commands to run after cloning (e.g. "cp .env.example .env"). */
	postCloneCommands: z.array(z.string()).default([]),
});

export const BuildContextSchema = z.object({
	/** Path to Dockerfile relative to the context root. Defaults to "Dockerfile". */
	dockerfile: z.string().optional(),
	/** Build context path relative to the subdirectory root. Defaults to ".". */
	context: z.string().default("."),
	/** Docker build args to pass at build time. */
	args: z.record(z.string(), z.string()).optional(),
	/** Target stage in a multi-stage Dockerfile. */
	target: z.string().optional(),
});

// ─── Env Quirks (for addon stack generation) ────────────────────────────────

export const EnvQuirkFixSchema = z.object({
	type: z.enum(["set_value", "generate_hex", "generate_base64url", "sync_with"]),
	/** Fixed value to set (for set_value type). */
	value: z.string().optional(),
	/** Minimum bytes for generated secrets (for generate_hex/generate_base64url). */
	minBytes: z.number().int().min(1).optional(),
	/** Key to synchronize with (for sync_with type). */
	syncKey: z.string().optional(),
});

export const EnvQuirkSchema = z.object({
	key: z.string(),
	issue: z.enum(["empty_string_crashes", "min_length", "must_sync"]),
	fix: EnvQuirkFixSchema,
});

// ─── Service Definition ─────────────────────────────────────────────────────

export const ServiceDefinitionSchema = z.object({
	// Identity
	id: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-]+$/),
	name: z.string().min(1),
	description: z.string(),
	category: ServiceCategorySchema,
	icon: z.string(),

	// Docker (required for image-based services, omitted for git-based)
	image: z.string().min(1).optional(),
	imageTag: z.string().min(1).optional(),

	// Git source (for services built from cloned repositories)
	gitSource: GitSourceSchema.optional(),
	buildContext: BuildContextSchema.optional(),
	ports: z.array(PortMappingSchema).default([]),
	volumes: z.array(VolumeMappingSchema).default([]),
	environment: z.array(EnvVariableSchema).default([]),
	healthcheck: HealthCheckSchema.optional(),
	command: z.string().optional(),
	entrypoint: z.string().optional(),
	dependsOn: z.array(z.string()).default([]),
	restartPolicy: RestartPolicySchema.default("unless-stopped"),
	networks: z.array(z.string()).default(["openclaw-network"]),
	labels: z.record(z.string(), z.string()).optional(),
	deploy: DeploySchema.optional(),

	// OpenClaw Integration
	skills: z.array(SkillBindingSchema).default([]),
	openclawEnvVars: z.array(EnvVariableSchema).default([]),
	openclawVolumeMounts: z.array(VolumeMappingSchema).optional(),

	// Metadata
	docsUrl: z.string().url(),
	selfHostedDocsUrl: z.string().url().optional(),
	tags: z.array(z.string()).default([]),
	maturity: MaturitySchema.default("stable"),

	// Dependencies & Conflicts
	requires: z.array(z.string()).default([]),
	recommends: z.array(z.string()).default([]),
	conflictsWith: z.array(z.string()).default([]),
	mandatory: z.boolean().default(false).optional(),
	removalWarning: z.string().optional(),

	// Platform Constraints
	platforms: z.array(PlatformSchema).optional(),
	minMemoryMB: z.number().int().min(0).optional(),
	gpuRequired: z.boolean().default(false),

	// Bare-metal native (install/run on host when no Docker)
	nativeSupported: z.boolean().optional(),
	nativeRecipes: z.array(NativeRecipeSchema).optional(),

	// Clawexa addon metadata
	/** Whether the service works with cap_drop: ALL (default: undefined = not audited). */
	capDropCompatible: z.boolean().optional(),
	/** Pre-built Docker image for cloud-init deployment (replaces build: directives). */
	prebuiltImage: z.string().optional(),
	/** Default reverse proxy path (e.g. "/n8n", "/grafana"). */
	proxyPath: z.string().optional(),
	/** Linux capabilities needed at first boot (e.g. ["CHOWN", "SETGID"]). */
	firstBootCapabilities: z.array(z.string()).optional(),
	/** Known environment variable quirks that need special handling. */
	envQuirks: z.array(EnvQuirkSchema).optional(),
});

// ─── Skill Pack ─────────────────────────────────────────────────────────────

export const SkillPackSchema = z.object({
	id: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-]+$/),
	name: z.string().min(1),
	description: z.string(),
	requiredServices: z.array(z.string()).min(1),
	skills: z.array(z.string()),
	icon: z.string().optional(),
	tags: z.array(z.string()).default([]),
});

// ─── Preset ─────────────────────────────────────────────────────────────────

export const PresetSchema = z.object({
	id: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-]+$/),
	name: z.string().min(1),
	description: z.string(),
	services: z.array(z.string()),
	skillPacks: z.array(z.string()).default([]),
	estimatedMemoryMB: z.number().int().min(0).optional(),
});

// ─── Generation Input ───────────────────────────────────────────────────────

export const GenerationInputSchema = z.object({
	configVersion: z.number().int().min(1).optional(),
	projectName: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
			message:
				"Project name must be lowercase alphanumeric with hyphens, cannot start or end with hyphen",
		}),
	services: z.array(z.string()).default([]),
	skillPacks: z.array(z.string()).default([]),
	aiProviders: z.array(AiProviderSchema).default([]),
	gsdRuntimes: z.array(GsdRuntimeSchema).default([]),
	proxy: ProxyTypeSchema.default("none"),
	proxyHttpPort: z.number().int().min(1).max(65535).optional(),
	proxyHttpsPort: z.number().int().min(1).max(65535).optional(),
	portOverrides: z
		.record(z.string(), z.record(z.string(), z.number().int().min(1).max(65535)))
		.optional(),
	domain: z.string().optional(),
	gpu: z.boolean().default(false),
	platform: PlatformSchema.default("linux/amd64"),
	deployment: DeploymentTargetSchema.default("local"),
	deploymentType: DeploymentTypeSchema.default("docker"),
	generateSecrets: z.boolean().default(true),
	openclawVersion: z.string().default("latest"),
	monitoring: z.boolean().default(false),
	openclawImage: OpenclawImageVariantSchema.default("official"),
	openclawInstallMethod: OpenclawInstallMethodSchema.default("docker"),
	deployTarget: DeployTargetSchema.default("local"),
	hardened: z.boolean().default(true),
});

// ─── Resolver Output ────────────────────────────────────────────────────────

export const ResolvedServiceSchema = z.object({
	definition: ServiceDefinitionSchema,
	addedBy: z
		.enum(["user", "dependency", "skill-pack", "proxy", "monitoring", "mandatory"])
		.default("user"),
});

export const AddedDependencySchema = z.object({
	service: z.string(),
	serviceId: z.string().optional(),
	requiredBy: z.string().optional(),
	reason: z.string(),
});

export const WarningSchema = z.object({
	type: z.string(),
	message: z.string(),
});

export const ErrorSchema = z.object({
	type: z.string(),
	message: z.string(),
});

export const ResolverOutputSchema = z.object({
	services: z.array(ResolvedServiceSchema),
	addedDependencies: z.array(AddedDependencySchema),
	removedConflicts: z.array(z.object({ service: z.string(), reason: z.string() })),
	warnings: z.array(WarningSchema),
	errors: z.array(ErrorSchema),
	isValid: z.boolean(),
	estimatedMemoryMB: z.number().int().min(0),
	aiProviders: z.array(AiProviderSchema).default([]),
	gsdRuntimes: z.array(GsdRuntimeSchema).default([]),
});

// ─── Compose Options ────────────────────────────────────────────────────────

export const ComposeOptionsSchema = z.object({
	projectName: z.string(),
	proxy: ProxyTypeSchema.default("none"),
	proxyHttpPort: z.number().int().min(1).max(65535).optional(),
	proxyHttpsPort: z.number().int().min(1).max(65535).optional(),
	portOverrides: z
		.record(z.string(), z.record(z.string(), z.number().int().min(1).max(65535)))
		.optional(),
	domain: z.string().optional(),
	gpu: z.boolean().default(false),
	platform: PlatformSchema.default("linux/amd64"),
	deployment: DeploymentTargetSchema.default("local"),
	openclawVersion: z.string().default("latest"),
	/** When true, gateway gets extra_hosts so it can reach host-run (native) services. */
	bareMetalNativeHost: z.boolean().optional(),
	/** OpenClaw Docker image variant: official, coolify, or alpine. */
	openclawImage: OpenclawImageVariantSchema.default("official"),
	/** Whether to apply security hardening (cap_drop, no-new-privileges, etc.) */
	hardened: z.boolean().default(true),
	/** How to install OpenClaw itself: docker (in container) or direct (host install). */
	openclawInstallMethod: OpenclawInstallMethodSchema.default("docker"),
});

// ─── Addon Stack (Clawexa) ───────────────────────────────────────────────────

export const SkippedServiceReasonSchema = z.enum([
	"missing_credentials",
	"no_image",
	"platform_unsupported",
	"conflict",
	"gpu_required",
	"unknown_service",
	"resolution_error",
]);

export const SkippedServiceSchema = z.object({
	serviceId: z.string(),
	reason: SkippedServiceReasonSchema,
	details: z.string(),
	requiredCredentials: z.array(z.string()).optional(),
});

export const ProxyRouteSchema = z.object({
	serviceId: z.string(),
	path: z.string(),
	port: z.number().int(),
	protocol: z.enum(["http", "https", "ws"]).default("http"),
	stripPrefix: z.boolean().default(true),
});

export const AddonStackInputSchema = z.object({
	/** Instance identifier (used for project name sanitization). */
	instanceId: z.string().min(1),
	/** Addon service IDs to deploy. */
	services: z.array(z.string()),
	/** Optional skill packs. */
	skillPacks: z.array(z.string()).default([]),
	/** Platform architecture. */
	platform: PlatformSchema.default("linux/amd64"),
	/** OpenClaw version running on the instance. */
	openclawVersion: z.string().default("latest"),
	/** Services already running on the instance (to detect conflicts). */
	existingServices: z.array(z.string()).default([]),
	/** Ports already in use on the host. */
	reservedPorts: z.array(z.number().int()).default([]),
	/** Whether to generate secrets (default: true). */
	generateSecrets: z.boolean().default(true),
	/** User-provided credentials for services that need them. */
	credentials: z.record(z.string(), z.record(z.string(), z.string())).default({}),
	/** Port overrides for specific services. */
	portOverrides: z
		.record(z.string(), z.record(z.string(), z.number().int().min(1).max(65535)))
		.optional(),
	/** Whether the host has GPU support. */
	gpu: z.boolean().default(false),
	/** AI providers configured on this instance. */
	aiProviders: z.array(AiProviderSchema).default([]),
	/** Pre-built image overrides (serviceId → image:tag). */
	prebuiltImages: z.record(z.string(), z.string()).default({}),
});

export const AddonStackResultSchema = z.object({
	/** Single docker-compose.override.yml content. */
	composeOverride: z.string(),
	/** Complete .env file with all secrets generated. */
	envFile: z.string(),
	/** Structured env vars for UI display / credential management. */
	envVars: z.array(
		z.object({
			serviceName: z.string(),
			vars: z.array(
				z.object({
					key: z.string(),
					description: z.string(),
					value: z.string(),
					secret: z.boolean(),
				}),
			),
		}),
	),
	/** SKILL.md files keyed by slug. */
	skillFiles: z.record(z.string(), z.string()),
	/** OpenClaw config additions (skills.entries to merge). */
	openclawConfigPatch: z.object({
		skills: z.object({
			entries: z.record(z.string(), z.object({ enabled: z.boolean() })),
		}),
	}),
	/** Port mapping for reverse proxy configuration. */
	proxyRoutes: z.array(ProxyRouteSchema),
	/** Additional files to write alongside compose (e.g. sandbox.toml). Keyed by filename. */
	additionalFiles: z.record(z.string(), z.string()).default({}),
	/** Metadata. */
	metadata: z.object({
		serviceCount: z.number(),
		skillCount: z.number(),
		estimatedMemoryMB: z.number(),
		resolvedServices: z.array(z.string()),
		skippedServices: z.array(SkippedServiceSchema),
		generatedSecretKeys: z.array(z.string()),
		portAssignments: z.record(z.string(), z.number()),
		/** Docker images to pre-pull during cloud-init, grouped by priority. */
		prePullImages: z
			.array(
				z.object({
					image: z.string(),
					priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
				}),
			)
			.default([]),
	}),
	/** Warnings (non-fatal issues). */
	warnings: z.array(z.string()),
});

export const AddonStackUpdateInputSchema = z.object({
	instanceId: z.string().min(1),
	/** Current compose override YAML (from the running instance). */
	currentCompose: z.string(),
	/** Current .env content. */
	currentEnv: z.string(),
	/** Services to add. */
	addServices: z.array(z.string()).default([]),
	/** Services to remove. */
	removeServices: z.array(z.string()).default([]),
	/** Whether to generate secrets for newly added services (default: true). */
	generateSecrets: z.boolean().default(true),
	/** User-provided credentials for new services. */
	credentials: z.record(z.string(), z.record(z.string(), z.string())).default({}),
	/** Port overrides for specific services. */
	portOverrides: z
		.record(z.string(), z.record(z.string(), z.number().int().min(1).max(65535)))
		.optional(),
	/** Services already running on the instance (to detect conflicts). */
	existingServices: z.array(z.string()).default([]),
	/** Reserved ports. */
	reservedPorts: z.array(z.number().int()).default([]),
	platform: PlatformSchema.default("linux/amd64"),
	openclawVersion: z.string().default("latest"),
	/** Whether the host has GPU support. */
	gpu: z.boolean().default(false),
	aiProviders: z.array(AiProviderSchema).default([]),
	prebuiltImages: z.record(z.string(), z.string()).default({}),
});

export const AddonStackUpdateResultSchema = z.object({
	/** Updated compose override (merged with existing). */
	composeOverride: z.string(),
	/** Updated .env (existing values preserved, new ones added). */
	envFile: z.string(),
	/** Only NEW skill files to deploy. */
	newSkillFiles: z.record(z.string(), z.string()),
	/** Skill slugs to remove from openclaw.json. */
	removedSkillSlugs: z.array(z.string()),
	/** Config patch to apply. */
	openclawConfigPatch: z.object({
		skills: z.object({
			add: z.record(z.string(), z.object({ enabled: z.boolean() })),
			remove: z.array(z.string()),
		}),
	}),
	/** New proxy routes to add. */
	addProxyRoutes: z.array(ProxyRouteSchema),
	/** Proxy routes to remove (service IDs). */
	removeProxyRoutes: z.array(z.string()),
	/** Services that need their images pulled. */
	imagesToPull: z.array(z.string()),
	/** Services to restart (due to dependency changes). */
	restartRequired: z.array(z.string()),
	/** Metadata. */
	metadata: z.object({
		added: z.array(z.string()),
		removed: z.array(z.string()),
		unchanged: z.array(z.string()),
		estimatedMemoryDelta: z.number(),
	}),
	warnings: z.array(z.string()),
});

// ─── API Request/Response ───────────────────────────────────────────────────

export const ValidateRequestSchema = z.object({
	services: z.array(z.string()),
	skillPacks: z.array(z.string()).default([]),
	aiProviders: z.array(AiProviderSchema).default([]),
	gsdRuntimes: z.array(GsdRuntimeSchema).default([]),
	proxy: ProxyTypeSchema.default("none"),
	domain: z.string().optional(),
	gpu: z.boolean().default(false),
	platform: PlatformSchema.default("linux/amd64"),
});

export const ValidateResponseSchema = z.object({
	valid: z.boolean(),
	resolvedServices: z.array(z.string()),
	addedDependencies: z.array(AddedDependencySchema),
	warnings: z.array(WarningSchema),
	conflicts: z.array(ErrorSchema),
	estimatedMemoryMB: z.number(),
});

export const ApiErrorSchema = z.object({
	error: z.object({
		code: z.enum([
			"VALIDATION_ERROR",
			"CONFLICT_ERROR",
			"GENERATION_ERROR",
			"RATE_LIMITED",
			"INTERNAL_ERROR",
		]),
		message: z.string(),
		details: z
			.array(
				z.object({
					field: z.string().optional(),
					message: z.string(),
				}),
			)
			.optional(),
	}),
});
