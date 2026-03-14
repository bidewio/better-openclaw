import type { z } from "zod";
import type {
	AddedDependencySchema,
	AddonStackInputSchema,
	AddonStackResultSchema,
	AddonStackUpdateInputSchema,
	AddonStackUpdateResultSchema,
	AgentFrameworkSchema,
	AiProviderSchema,
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
	GsdRuntimeSchema,
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
	SkippedServiceSchema,
	ValidateRequestSchema,
	ValidateResponseSchema,
	VolumeMappingSchema,
	WarningSchema,
} from "./schema.js";

// ─── Inferred Types ─────────────────────────────────────────────────────────

export type AgentFramework = z.infer<typeof AgentFrameworkSchema>;
export type AiProvider = z.infer<typeof AiProviderSchema>;
export type GsdRuntime = z.infer<typeof GsdRuntimeSchema>;
export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;
export type Maturity = z.infer<typeof MaturitySchema>;
export type Platform = z.infer<typeof PlatformSchema>;
export type RestartPolicy = z.infer<typeof RestartPolicySchema>;
export type ProxyType = z.infer<typeof ProxyTypeSchema>;
export type DeploymentTarget = z.infer<typeof DeploymentTargetSchema>;
export type DeploymentType = z.infer<typeof DeploymentTypeSchema>;
export type NativePlatform = z.infer<typeof NativePlatformSchema>;
export type NativeRecipe = z.infer<typeof NativeRecipeSchema>;
export type GitSource = z.infer<typeof GitSourceSchema>;
export type BuildContext = z.infer<typeof BuildContextSchema>;
export type OutputFormat = z.infer<typeof OutputFormatSchema>;
export type OpenclawImageVariant = z.infer<typeof OpenclawImageVariantSchema>;
export type OpenclawInstallMethod = z.infer<typeof OpenclawInstallMethodSchema>;
export type DeployTarget = z.infer<typeof DeployTargetSchema>;

export type PortMapping = z.infer<typeof PortMappingSchema>;
export type VolumeMapping = z.infer<typeof VolumeMappingSchema>;
export type EnvVariable = z.infer<typeof EnvVariableSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type ResourceLimits = z.infer<typeof ResourceLimitsSchema>;
export type Deploy = z.infer<typeof DeploySchema>;
export type SkillBinding = z.infer<typeof SkillBindingSchema>;

export type ServiceDefinition = z.infer<typeof ServiceDefinitionSchema>;
export type SkillPack = z.infer<typeof SkillPackSchema>;
export type Preset = z.infer<typeof PresetSchema>;

export type GenerationInput = z.infer<typeof GenerationInputSchema>;
export type ComposeOptions = z.infer<typeof ComposeOptionsSchema> & {
	/** Dynamic Traefik labels per service, computed by the Traefik generator. */
	traefikLabels?: Map<string, Record<string, string>>;
};
export type ResolvedService = z.infer<typeof ResolvedServiceSchema>;
export type AddedDependency = z.infer<typeof AddedDependencySchema>;
export type Warning = z.infer<typeof WarningSchema>;
export type ResolverError = z.infer<typeof ErrorSchema>;
export type ResolverOutput = z.infer<typeof ResolverOutputSchema>;

export type ValidateRequest = z.infer<typeof ValidateRequestSchema>;
export type ValidateResponse = z.infer<typeof ValidateResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

// Addon Stack (Clawexa)
export type EnvQuirkFix = z.infer<typeof EnvQuirkFixSchema>;
export type EnvQuirk = z.infer<typeof EnvQuirkSchema>;
export type ProxyRoute = z.infer<typeof ProxyRouteSchema>;
export type SkippedService = z.infer<typeof SkippedServiceSchema>;
export type AddonStackInput = z.infer<typeof AddonStackInputSchema>;
export type AddonStackResult = z.infer<typeof AddonStackResultSchema>;
export type AddonStackUpdateInput = z.infer<typeof AddonStackUpdateInputSchema>;
export type AddonStackUpdateResult = z.infer<typeof AddonStackUpdateResultSchema>;

// ─── Additional Types ───────────────────────────────────────────────────────

export interface ResolverInput {
	services: string[];
	skillPacks: string[];
	aiProviders?: AiProvider[];
	gsdRuntimes?: GsdRuntime[];
	primaryFramework?: AgentFramework;
	proxy?: ProxyType;
	gpu?: boolean;
	platform?: Platform;
	deployment?: DeploymentType;
	deploymentType?: DeploymentType;
	monitoring?: boolean;
	memoryThresholds?: { info: number; warning: number; critical: number };
}

export interface GeneratedFiles {
	[path: string]: string;
}

export interface GenerationMetadata {
	serviceCount: number;
	skillCount: number;
	estimatedMemoryMB: number;
	resolvedServices: string[];
	generatedAt: string;
}

export interface GenerationResult {
	files: GeneratedFiles;
	metadata: GenerationMetadata;
}

export interface CategoryInfo {
	id: ServiceCategory;
	name: string;
	description?: string;
	label?: string;
	icon: string;
}

export const SERVICE_CATEGORIES: CategoryInfo[] = [
	{
		id: "agent-framework",
		name: "Agent Frameworks",
		description: "AI agent orchestrators that can serve as primary or companion runtimes",
		label: "Agent Frameworks",
		icon: "🤖",
	},
	{
		id: "coding-agent",
		name: "AI Coding Agents",
		description: "AI Coding Agents",
		label: "AI Coding Agents",
		icon: "💻",
	},
	{
		id: "ai-platform",
		name: "AI Platforms & Chat UIs",
		description: "AI Platforms & Chat UIs",
		label: "AI Platforms & Chat UIs",
		icon: "🧪",
	},
	{
		id: "ai",
		name: "AI / Local Models",
		description: "AI / Local Models",
		label: "AI / Local Models",
		icon: "🤖",
	},
	{
		id: "automation",
		name: "Automation & Workflows",
		description: "Automation & Workflows",
		label: "Automation & Workflows",
		icon: "🔄",
	},
	{
		id: "vector-db",
		name: "Vector Databases",
		description: "Vector Databases",
		label: "Vector Databases",
		icon: "🧠",
	},
	{
		id: "media",
		name: "Media & Video",
		description: "Media & Video",
		label: "Media & Video",
		icon: "🎬",
	},
	{
		id: "social-media",
		name: "Social Media",
		description: "Social Media",
		label: "Social Media",
		icon: "📱",
	},
	{
		id: "analytics",
		name: "Analytics",
		description: "Analytics",
		label: "Analytics",
		icon: "📊",
	},
	{
		id: "knowledge",
		name: "Knowledge & Documents",
		description: "Knowledge & Documents",
		label: "Knowledge & Documents",
		icon: "📚",
	},
	{
		id: "storage",
		name: "Object Storage",
		description: "Object Storage",
		label: "Object Storage",
		icon: "💾",
	},
	{
		id: "database",
		name: "Databases & Caching",
		description: "Databases & Caching",
		label: "Databases & Caching",
		icon: "🗄️",
	},
	{
		id: "dev-tools",
		name: "Developer Tools",
		description: "Developer Tools",
		label: "Developer Tools",
		icon: "🛠️",
	},
	{
		id: "proxy",
		name: "Reverse Proxy",
		description: "Reverse Proxy",
		label: "Reverse Proxy",
		icon: "🌐",
	},
	{
		id: "monitoring",
		name: "Monitoring",
		description: "Monitoring",
		label: "Monitoring",
		icon: "📡",
	},
	{
		id: "browser",
		name: "Browser Automation",
		description: "Browser Automation",
		label: "Browser Automation",
		icon: "🌐",
	},
	{
		id: "search",
		name: "Search",
		description: "Search",
		label: "Search",
		icon: "🔍",
	},
	{
		id: "communication",
		name: "Notifications",
		description: "Notifications",
		label: "Notifications",
		icon: "🔔",
	},
	{
		id: "desktop",
		name: "Desktop Environment",
		description: "Desktop Environment",
		label: "Desktop Environment",
		icon: "🖥️",
	},
	{
		id: "streaming",
		name: "Streaming & Relay",
		description: "Streaming & Relay",
		label: "Streaming & Relay",
		icon: "📺",
	},
	{
		id: "security",
		name: "Security & Pentesting",
		description: "Security & Pentesting",
		label: "Security & Pentesting",
		icon: "🛡️",
	},
	{
		id: "billing",
		name: "Billing & Payments",
		description: "Billing & Payments",
		label: "Billing & Payments",
		icon: "💳",
	},
	{
		id: "crm",
		name: "CRM & Customer Management",
		description: "CRM & Customer Management",
		label: "CRM & Customer Management",
		icon: "🤝",
	},
	{
		id: "email-marketing",
		name: "Email & Marketing",
		description: "Email & Marketing",
		label: "Email & Marketing",
		icon: "📧",
	},
	{
		id: "forms",
		name: "Forms & Surveys",
		description: "Forms & Surveys",
		label: "Forms & Surveys",
		icon: "📋",
	},
	{
		id: "api-gateway",
		name: "API Management",
		description: "API Management",
		label: "API Management",
		icon: "🔌",
	},
	{
		id: "backup",
		name: "Backup & Recovery",
		description: "Backup & Recovery",
		label: "Backup & Recovery",
		icon: "💾",
	},
	{
		id: "voice",
		name: "Voice & Telephony",
		description: "Voice & Telephony",
		label: "Voice & Telephony",
		icon: "📞",
	},
	{
		id: "ecommerce",
		name: "E-Commerce",
		description: "E-Commerce",
		label: "E-Commerce",
		icon: "🛒",
	},
	{
		id: "collaboration",
		name: "Real-Time Collaboration",
		description: "Real-Time Collaboration",
		label: "Real-Time Collaboration",
		icon: "✏️",
	},
	{
		id: "ai-observability",
		name: "AI Observability",
		description: "AI Observability",
		label: "AI Observability",
		icon: "🔭",
	},
	{
		id: "fine-tuning",
		name: "AI Fine-Tuning",
		description: "AI Fine-Tuning",
		label: "AI Fine-Tuning",
		icon: "🎯",
	},
	{
		id: "project-management",
		name: "Project Management",
		description: "Project Management",
		label: "Project Management",
		icon: "📋",
	},
	{
		id: "business-intelligence",
		name: "Business Intelligence",
		description: "Business Intelligence",
		label: "Business Intelligence",
		icon: "📈",
	},
	{
		id: "dns-networking",
		name: "DNS & Networking",
		description: "DNS & Networking",
		label: "DNS & Networking",
		icon: "🌐",
	},
	{
		id: "iot",
		name: "IoT & Edge",
		description: "IoT & Edge",
		label: "IoT & Edge",
		icon: "📡",
	},
	{
		id: "saas-boilerplate",
		name: "SaaS Boilerplates",
		description: "Full-stack SaaS starter kits and boilerplates",
		label: "SaaS Boilerplates",
		icon: "🚀",
	},
];
