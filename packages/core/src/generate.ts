import {
	partitionBareMetal,
	platformToNativePlatform,
	resolvedWithOnlyServices,
} from "./bare-metal-partition.js";
import { composeMultiFile } from "./composer.js";
import { StackConfigError, ValidationError } from "./errors.js";
import { getFrameworkById } from "./frameworks/index.js";
import { generateBareMetalInstall } from "./generators/bare-metal-install.js";
import { generateCaddyfile } from "./generators/caddy.js";
import { generateCloneScripts } from "./generators/clone-repos.js";
import { generateCloudInit } from "./generators/cloud-init.js";
import { generateEnvFiles } from "./generators/env.js";
import { generateGsdScripts } from "./generators/get-shit-done.js";
import { generateGrafanaConfig, generateGrafanaDashboard } from "./generators/grafana.js";
import { generateHealthCheck } from "./generators/health-check.js";
import { generateN8nWorkflows } from "./generators/n8n-workflows.js";
import { generateNativeInstallScripts } from "./generators/native-services.js";
import { generateOpenclawInstallScript } from "./generators/openclaw-install-script.js";

import { generatePostgresInit } from "./generators/postgres-init.js";
import { generatePrometheusConfig } from "./generators/prometheus.js";
import { generateReadme } from "./generators/readme.js";
import { generateScripts } from "./generators/scripts.js";
import { generateSkillFiles } from "./generators/skills.js";
import { generateStackManifest } from "./generators/stack-manifest.js";
import { generateTraefikConfig } from "./generators/traefik.js";
import { migrateConfig } from "./migrations.js";
import { resolve } from "./resolver.js";
import type {
	GeneratedFiles,
	GenerationInput,
	GenerationResult,
	Platform,
	ResolverInput,
} from "./types.js";
import { validate } from "./validator.js";

/** Resolver/compose only support linux image platforms; normalize for bare-metal (windows/macos). */
function getComposePlatform(platform: Platform): "linux/amd64" | "linux/arm64" {
	if (platform === "linux/amd64" || platform === "linux/arm64") return platform;
	return "linux/amd64";
}

/**
 * Main orchestration function: takes generation input, resolves dependencies,
 * generates all files, validates, and returns the complete file tree.
 */
export function generate(rawInput: GenerationInput): GenerationResult {
	// Apply config migrations if needed
	const input = migrateConfig(rawInput as Record<string, unknown>) as GenerationInput;

	const composePlatform = getComposePlatform(input.platform);

	// 1. Resolve dependencies
	const resolverInput: ResolverInput = {
		services: input.services,
		skillPacks: input.skillPacks,
		aiProviders: input.aiProviders,
		primaryFramework: input.primaryFramework,
		proxy: input.proxy,
		gpu: input.gpu,
		platform: composePlatform,
		monitoring: input.monitoring,
	};
	const resolved = resolve(resolverInput);

	if (!resolved.isValid) {
		throw new StackConfigError(
			`Invalid stack configuration: ${resolved.errors.map((e) => e.message).join("; ")}`,
		);
	}

	const isBareMetal = input.deploymentType === "bare-metal";
	let resolvedForCompose = resolved;
	let nativeIds = new Set<string>();
	let nativeServices: typeof resolved.services = [];
	let dockerOnlyServices: typeof resolved.services = [];

	if (isBareMetal) {
		const partition = partitionBareMetal(resolved, input.platform);
		nativeServices = partition.nativeServices;
		dockerOnlyServices = partition.dockerOnlyServices;
		nativeIds = partition.nativeIds;
		if (nativeServices.length > 0) {
			resolvedForCompose = resolvedWithOnlyServices(resolved, dockerOnlyServices);
		}
	}

	// 2. Generate Docker Compose YAML (multi-file)
	// Compute Traefik labels before composing (labels get injected into docker-compose services)
	let traefikOutput: ReturnType<typeof generateTraefikConfig> | undefined;
	if (input.proxy === "traefik" && input.domain) {
		traefikOutput = generateTraefikConfig(resolvedForCompose, input.domain);
	}

	const composeOptions = {
		projectName: input.projectName,
		primaryFramework: input.primaryFramework,
		companionFrameworks: input.companionFrameworks,
		proxy: input.proxy,
		proxyHttpPort: input.proxyHttpPort,
		proxyHttpsPort: input.proxyHttpsPort,
		portOverrides: input.portOverrides,
		domain: input.domain,
		gpu: input.gpu,
		platform: composePlatform,
		deployment: input.deployment,
		openclawVersion: input.openclawVersion,
		bareMetalNativeHost: isBareMetal && nativeIds.size > 0,
		traefikLabels: traefikOutput?.serviceLabels,
		openclawImage: input.openclawImage ?? "official",
		hardened: input.hardened ?? true,
		openclawInstallMethod: input.openclawInstallMethod ?? "docker",
	};
	const composeResult = composeMultiFile(resolvedForCompose, composeOptions);

	// 3. Validate (using the base docker-compose.yml)
	const validation = validate(resolvedForCompose, composeResult.files["docker-compose.yml"] ?? "", {
		domain: input.domain,
		generateSecrets: input.generateSecrets,
	});
	if (!validation.valid) {
		throw new ValidationError(
			`Validation failed: ${validation.errors.map((e) => e.message).join("; ")}`,
		);
	}

	// 4. Generate all files
	const files: GeneratedFiles = {};

	// Docker Compose (multi-file output)
	for (const [filename, content] of Object.entries(composeResult.files)) {
		files[filename] = content;
	}

	// Environment files (when bare-metal with native services, host vars use host.docker.internal)
	const envFiles = generateEnvFiles(resolved, {
		generateSecrets: input.generateSecrets,
		domain: input.domain,
		openclawVersion: input.openclawVersion,
		nativeServiceIds: isBareMetal ? nativeIds : undefined,
		composeFiles: Object.keys(composeResult.files),
		composeProfiles: composeResult.profiles,
		openclawImage: input.openclawImage,
		primaryFramework: input.primaryFramework,
	});
	files[".env.example"] = envFiles.envExample;
	files[".env"] = envFiles.env;

	// .gitignore
	files[".gitignore"] = [
		".env",
		".env.local",
		".env.*.local",
		"*.log",
		"docker-compose.override.yml",
		"repos/",
	].join("\n");

	// Stack manifest (consumed by Mission Control)
	const manifestFiles = generateStackManifest(resolved, input);
	for (const [path, content] of Object.entries(manifestFiles)) {
		files[path] = content;
	}

	// Skills
	const skillFiles = generateSkillFiles(resolved);
	for (const [path, content] of Object.entries(skillFiles)) {
		files[path] = content;
	}

	// Framework-specific configuration
	const framework = getFrameworkById(input.primaryFramework ?? "openclaw");
	if (framework) {
		const fwConfig = framework.generateConfig(resolved, {
			deploymentType: input.deploymentType,
			gatewayPort: 18789,
			frameworkVersion: input.openclawVersion,
		});
		if (fwConfig) {
			files[fwConfig.path] = fwConfig.content;
		}
	}

	// README
	files["README.md"] = generateReadme(resolved, {
		projectName: input.projectName,
		domain: input.domain,
		proxy: input.proxy,
		deploymentType: input.deploymentType,
		hasNativeServices: isBareMetal && nativeServices.length > 0,
		openclawInstallMethod: input.openclawInstallMethod,
		primaryFramework: input.primaryFramework,
	});

	// Scripts
	const hasGitServices = resolvedForCompose.services.some((s) => s.definition.gitSource);
	const scripts = generateScripts({ hasGitServices });
	for (const [path, content] of Object.entries(scripts)) {
		files[path] = content;
	}

	// Clone scripts for git-based services (SaaS boilerplates)
	const cloneScripts = generateCloneScripts(resolvedForCompose);
	for (const [path, content] of Object.entries(cloneScripts)) {
		files[path] = content;
	}

	// Health check scripts (dynamic, stack-specific)
	const healthCheckFiles = generateHealthCheck(resolved, {
		projectName: input.projectName,
		deploymentType: input.deploymentType,
	});
	for (const [path, content] of Object.entries(healthCheckFiles)) {
		files[path] = content;
	}

	// n8n workflows
	const n8nWorkflows = generateN8nWorkflows(resolved);
	for (const [path, content] of Object.entries(n8nWorkflows)) {
		files[path] = content;
	}

	// PostgreSQL init script (creates per-service databases and users)
	const postgresInit = generatePostgresInit(resolved);
	if (postgresInit) {
		files["postgres/init-databases.sh"] = postgresInit;
	}

	// Caddy config
	if (input.proxy === "caddy" && input.domain) {
		files["caddy/Caddyfile"] = generateCaddyfile(resolved, input.domain);
	}

	// Traefik config (labels are already injected via composeOptions.traefikLabels)
	if (traefikOutput) {
		files["traefik/traefik.yml"] = traefikOutput.staticConfig;
	}

	// Prometheus config
	const hasPrometheus = resolved.services.some((s) => s.definition.id === "prometheus");
	if (hasPrometheus) {
		files["prometheus/prometheus.yml"] = generatePrometheusConfig(resolved);
	}

	// Grafana config
	const hasGrafana = resolved.services.some((s) => s.definition.id === "grafana");
	if (hasGrafana) {
		const grafanaFiles = generateGrafanaConfig();
		for (const [path, content] of Object.entries(grafanaFiles)) {
			files[path] = content;
		}
		// Grafana dashboard
		files["config/grafana/dashboards/openclaw-stack-overview.json"] = generateGrafanaDashboard();
	}

	// Docker Compose override (empty template)
	files["docker-compose.override.yml"] = [
		"# Local overrides for docker-compose.yml",
		"# This file is gitignored — use it for personal port changes, extra volumes, etc.",
		"services: {}",
		"",
	].join("\n");

	// SERVICES.md documentation
	files["docs/SERVICES.md"] = generateServicesDoc(resolved);

	// Bare-metal: native install scripts + top-level installer
	if (isBareMetal) {
		if (nativeServices.length > 0) {
			const nativePlatform = platformToNativePlatform(input.platform);
			const nativeScripts = generateNativeInstallScripts({
				nativeServices,
				platform: nativePlatform,
				projectName: input.projectName,
			});
			for (const [path, content] of Object.entries(nativeScripts)) {
				files[path] = content;
			}
		}
		const bareMetalFiles = generateBareMetalInstall({
			platform: input.platform,
			projectName: input.projectName,
			hasNativeServices: nativeServices.length > 0,
		});
		for (const [path, content] of Object.entries(bareMetalFiles)) {
			files[path] = content;
		}
	}

	// Get-Shit-Done setup scripts
	if (input.gsdRuntimes && input.gsdRuntimes.length > 0) {
		const gsdScripts = generateGsdScripts(input.gsdRuntimes);
		if (gsdScripts) {
			files["openclaw/scripts/setup-gsd.sh"] = gsdScripts.sh;
			files["openclaw/scripts/setup-gsd.ps1"] = gsdScripts.ps1;
		}
	}

	// OpenClaw direct install scripts (host-based, no Docker gateway)
	if (input.openclawInstallMethod === "direct") {
		const installScripts = generateOpenclawInstallScript({
			projectName: input.projectName,
		});
		for (const [path, content] of Object.entries(installScripts)) {
			files[path] = content;
		}
	}

	// Cloud-init deploy target
	if (input.deployTarget === "cloud-init") {
		const mainCompose = composeResult.files["docker-compose.yml"] ?? "";
		files["cloud-init.yml"] = generateCloudInit({
			composeYaml: mainCompose,
			envContent: envFiles.env,
			projectName: input.projectName,
			gatewayPort: 18789,
		});
	}

	// 5. Calculate metadata
	const skillCount = resolved.services.reduce((sum, s) => sum + s.definition.skills.length, 0);

	return {
		files,
		metadata: {
			serviceCount: resolved.services.length,
			skillCount,
			estimatedMemoryMB: resolved.estimatedMemoryMB,
			resolvedServices: resolved.services.map((s) => s.definition.id),
			generatedAt: new Date().toISOString(),
		},
	};
}

export function generateServicesDoc(resolved: import("./types.js").ResolverOutput): string {
	const lines: string[] = [
		"# Service Reference",
		"",
		"This document describes all companion services in your OpenClaw stack.",
		"",
	];

	for (const svc of resolved.services) {
		const def = svc.definition;
		lines.push(`## ${def.icon} ${def.name}`);
		lines.push("");
		lines.push(def.description);
		lines.push("");
		lines.push(`- **Image**: \`${def.image}:${def.imageTag}\``);
		lines.push(`- **Category**: ${def.category}`);
		lines.push(`- **Maturity**: ${def.maturity}`);
		if (def.minMemoryMB) {
			lines.push(`- **Min Memory**: ${def.minMemoryMB}MB`);
		}
		if (def.ports.length > 0) {
			lines.push("- **Ports**:");
			for (const p of def.ports) {
				lines.push(
					`  - \`${p.container}\` — ${p.description}${p.exposed ? "" : " (internal only)"}`,
				);
			}
		}
		lines.push(`- **Docs**: ${def.docsUrl}`);
		lines.push("");
	}

	return lines.join("\n");
}
