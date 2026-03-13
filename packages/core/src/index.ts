// ─── Addon Stack (Clawexa) ──────────────────────────────────────────────────
export { generateAddonStack, updateAddonStack } from "./addon-stack.js";

// ─── Core Engines ───────────────────────────────────────────────────────────
export {
	partitionBareMetal,
	platformToNativePlatform,
	resolvedWithOnlyServices,
} from "./bare-metal-partition.js";
export type { ComposeResult } from "./composer.js";
export {
	buildCompanionService,
	buildPostgresSetup,
	compose,
	composeMultiFile,
	quotedStr,
	YAML_OPTIONS,
} from "./composer.js";
// ─── PaaS Deployers ─────────────────────────────────────────────────────────
export type {
	DeployInput as PaasDeployInput,
	DeployResult as PaasDeployResult,
	DeployStep as PaasDeployStep,
	DeployTarget as PaasDeployTarget,
	PaasDeployer,
	PaasServer,
} from "./deployers/index.js";
export {
	CoolifyDeployer,
	DokployDeployer,
	deployerRegistry,
	getAvailableDeployers,
	getDeployer,
} from "./deployers/index.js";
// ─── Errors ─────────────────────────────────────────────────────────────────
export { StackConfigError, ValidationError } from "./errors.js";
export { generate, generateServicesDoc } from "./generate.js";
export { generateCaddyfile } from "./generators/caddy.js";
export { generateCloneScripts } from "./generators/clone-repos.js";
export type { EnvVarGroup } from "./generators/env.js";
export { generateEnvFiles, getStructuredEnvVars } from "./generators/env.js";
export {
	generateGrafanaConfig,
	generateGrafanaDashboard,
} from "./generators/grafana.js";
export { generateHealthCheck } from "./generators/health-check.js";
export { generateN8nWorkflows } from "./generators/n8n-workflows.js";
export {
	generatePostgresInit,
	getDbRequirements,
} from "./generators/postgres-init.js";
export { generatePrometheusConfig } from "./generators/prometheus.js";
export { generateReadme } from "./generators/readme.js";
export { generateScripts } from "./generators/scripts.js";
export { generateSkillFiles } from "./generators/skills.js";
export type {
	StackManifest,
	StackManifestService,
	StackManifestSkill,
} from "./generators/stack-manifest.js";
export { generateStackManifest } from "./generators/stack-manifest.js";
// ─── Config Migrations ──────────────────────────────────────────────────────
export {
	CURRENT_CONFIG_VERSION,
	migrateConfig,
	needsMigration,
} from "./migrations.js";
// ─── Port Scanner ───────────────────────────────────────────────────────────
export type { PortConflict } from "./port-scanner.js";
export { formatPortConflicts, scanPortConflicts } from "./port-scanner.js";
// ─── Presets ────────────────────────────────────────────────────────────────
export {
	getAllPresets,
	getPresetById,
	presetRegistry,
} from "./presets/registry.js";
export { resolve } from "./resolver.js";
export {
	AddedDependencySchema,
	AddonStackInputSchema,
	AddonStackResultSchema,
	AddonStackUpdateInputSchema,
	AddonStackUpdateResultSchema,
	ApiErrorSchema,
	BuildContextSchema,
	ComposeOptionsSchema,
	DeploymentTargetSchema,
	DeploymentTypeSchema,
	DeploySchema,
	DeployTargetSchema,
	EnvQuirkFixSchema,
	EnvQuirkSchema,
	EnvVariableSchema,
	ErrorSchema,
	GenerationInputSchema,
	GitSourceSchema,
	HealthCheckSchema,
	MaturitySchema,
	NativePlatformSchema,
	NativeRecipeSchema,
	OpenclawImageVariantSchema,
	OpenclawInstallMethodSchema,
	OutputFormatSchema,
	PlatformSchema,
	PortMappingSchema,
	PresetSchema,
	ProxyRouteSchema,
	ProxyTypeSchema,
	ResolvedServiceSchema,
	ResolverOutputSchema,
	ResourceLimitsSchema,
	RestartPolicySchema,
	ServiceCategorySchema,
	ServiceDefinitionSchema,
	SkillBindingSchema,
	SkillPackSchema,
	SkippedServiceReasonSchema,
	SkippedServiceSchema,
	ValidateRequestSchema,
	ValidateResponseSchema,
	VolumeMappingSchema,
	WarningSchema,
} from "./schema.js";
// ─── Service Registry ───────────────────────────────────────────────────────
export {
	getAllServices,
	getServiceById,
	getServicesByCategory,
	serviceRegistry,
} from "./services/registry.js";
// ─── Skill Packs ────────────────────────────────────────────────────────────
export {
	getAllSkillPacks,
	getCompatibleSkillPacks,
	getSkillPackById,
	skillPackRegistry,
} from "./skills/registry.js";
// ─── Skill Manifest ─────────────────────────────────────────────────────────
export type { SkillManifestEntry } from "./skills/skill-manifest.js";
export {
	getAllManifestSkills,
	getManifestSkillById,
	getManifestSkillCount,
} from "./skills/skill-manifest.js";
// ─── Analytics ─────────────────────────────────────────────────────────────
export type { AnalyticsPayload } from "./track-analytics.js";
export { buildAnalyticsPayload, trackAnalytics } from "./track-analytics.js";
// ─── Types ──────────────────────────────────────────────────────────────────
export type {
	AddedDependency,
	AddonStackInput,
	AddonStackResult,
	AddonStackUpdateInput,
	AddonStackUpdateResult,
	AiProvider,
	ApiError,
	BuildContext,
	CategoryInfo,
	ComposeOptions,
	Deploy,
	DeploymentTarget,
	DeploymentType,
	DeployTarget,
	EnvQuirk,
	EnvQuirkFix,
	EnvVariable,
	GeneratedFiles,
	GenerationInput,
	GenerationMetadata,
	GenerationResult,
	GitSource,
	GsdRuntime,
	HealthCheck,
	Maturity,
	NativePlatform,
	NativeRecipe,
	OpenclawImageVariant,
	OpenclawInstallMethod,
	OutputFormat,
	Platform,
	PortMapping,
	Preset,
	ProxyRoute,
	ProxyType,
	ResolvedService,
	ResolverError,
	ResolverInput,
	ResolverOutput,
	ResourceLimits,
	RestartPolicy,
	ServiceCategory,
	ServiceDefinition,
	SkillBinding,
	SkillPack,
	SkippedService,
	ValidateRequest,
	ValidateResponse,
	VolumeMapping,
	Warning,
} from "./types.js";
export { SERVICE_CATEGORIES } from "./types.js";
export { validate } from "./validator.js";

// ─── Version Manager ────────────────────────────────────────────────────────
export {
	checkCompatibility,
	getImageReference,
	getImageTag,
	pinImageTags,
} from "./version-manager.js";
