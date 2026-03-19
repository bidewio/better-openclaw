import type { ResolverOutput } from "../types.js";

// ─── Framework Identifiers ──────────────────────────────────────────────────

export type AgentFrameworkId =
	| "openclaw"
	| "copaw"
	| "nanoclaw"
	| "nanobot"
	| "zeroclaw"
	| "memu"
	| "claude-code"
	| "codex";

// ─── Gateway Build Types ────────────────────────────────────────────────────

export interface GatewayBuildResult {
	gatewayService: Record<string, unknown>;
	cliService: Record<string, unknown> | null;
	allVolumes: Set<string>;
}

export interface FrameworkComposeOptions {
	projectName: string;
	proxy: string;
	proxyHttpPort?: number;
	proxyHttpsPort?: number;
	domain?: string;
	gpu: boolean;
	platform: string;
	deployment: string;
	frameworkVersion: string;
	frameworkImageVariant: string;
	bareMetalNativeHost?: boolean;
	traefikLabels?: Map<string, Record<string, string>>;
	hardened: boolean;
	frameworkInstallMethod: string;
}

// ─── Env Line (for env file generation) ─────────────────────────────────────

export interface EnvLine {
	comment: string;
	key: string;
	exampleValue: string;
	actualValue: string;
}

export interface FrameworkEnvOptions {
	generateSecrets: boolean;
	domain?: string;
	frameworkVersion: string;
	frameworkImageVariant: string;
}

// ─── Config Generation ──────────────────────────────────────────────────────

export interface FrameworkConfigOptions {
	deploymentType: string;
	gatewayPort: number;
	frameworkVersion: string;
}

export interface FrameworkConfigResult {
	/** File path relative to project root (e.g. "openclaw/config/openclaw.json") */
	path: string;
	/** File content (JSON, YAML, TOML, etc.) */
	content: string;
}

// ─── Agent Framework Definition ─────────────────────────────────────────────

export interface AgentFrameworkDefinition {
	/** Unique identifier, kebab-case. */
	id: AgentFrameworkId;

	/** Human-readable name. */
	name: string;

	/** Icon for UI display. */
	icon: string;

	/** Short description for CLI/Web UI selection. */
	description: string;

	/** Primary language/runtime of this framework. */
	runtime: "node" | "python" | "rust" | "go";

	/** Whether this framework can serve as the primary orchestrator (gateway). */
	canBePrimary: boolean;

	/** Whether this framework can run as a companion service alongside another primary. */
	canBeCompanion: boolean;

	/** Docker network name this framework uses (replaces hardcoded "openclaw-network"). */
	networkName: string;

	/** Map of image variant names to Docker image strings. */
	imageVariants: Record<string, string>;

	/** Default image variant key. */
	defaultImageVariant: string;

	/**
	 * Build the gateway (primary orchestrator) service entry for docker-compose.
	 * Returns null if this framework cannot be primary.
	 */
	buildGatewayService(
		resolved: ResolverOutput,
		options: FrameworkComposeOptions,
		dependsOn?: Record<string, { condition: string }>,
	): GatewayBuildResult;

	/**
	 * Build a companion container entry (when running alongside another primary).
	 * Returns null if this framework cannot be a companion.
	 */
	buildCompanionService?(
		resolved: ResolverOutput,
		options: FrameworkComposeOptions,
	): Record<string, unknown> | null;

	/**
	 * Generate the framework-specific config file (like openclaw.json).
	 * Returns null if no config file is needed.
	 */
	generateConfig(
		resolved: ResolverOutput,
		options: FrameworkConfigOptions,
	): FrameworkConfigResult | null;

	/** Framework-specific env vars to include in .env files. */
	getBaseEnvVars(options: FrameworkEnvOptions): EnvLine[];

	/** Service IDs that are mandatory when this framework is primary. */
	getMandatoryServices(): string[];

	/** Service IDs that are recommended when this framework is primary. */
	getRecommendedServices(): string[];

	/** AI provider API key env var names to inject into gateway environment. */
	getProviderEnvKeys(): string[];

	/** Section header name for .env file comments (e.g. "OpenClaw Core"). */
	getEnvSectionName(): string;
}
