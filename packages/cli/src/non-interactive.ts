import { homedir } from "node:os";
import { join } from "node:path";
import type {
	DeploymentType,
	GenerationInput,
	OpenclawInstallMethod,
	Platform,
	Preset,
	ProxyType,
	ServiceDefinition,
	SkillPack,
} from "@better-openclaw/core";
import {
	buildAnalyticsPayload,
	formatPortConflicts,
	generate,
	getAllPresets,
	getAllServices,
	getAllSkillPacks,
	getPresetById,
	getServiceById,
	getSkillPackById,
	OperationsLogger,
	scanPortConflicts,
	trackAnalytics,
} from "@better-openclaw/core";
import { FileSink } from "@better-openclaw/core/logger/sinks/file-sink";
import pc from "picocolors";
import { writeProject } from "./writer.js";

export interface NonInteractiveOptions {
	projectDirectory?: string;
	services?: string;
	skills?: string;
	preset?: string;
	proxy?: string;
	proxyHttpPort?: number;
	proxyHttpsPort?: number;
	aiProviders?: string;
	domain?: string;
	gpu?: boolean;
	monitoring?: boolean;
	deployment?: string;
	deploymentType?: string;
	platform?: string;
	force?: boolean;
	dryRun?: boolean;
	yes?: boolean;
	outputFormat?: string;
	json?: boolean;
	image?: string;
	llm?: string;
	hardened?: boolean;
	deployTarget?: string;
	openclawInstall?: string;
}

/**
 * Runs the CLI in non-interactive mode.
 *
 * Supports:
 * - `--preset <name>` to use a predefined stack
 * - `--services <ids>` to specify services directly
 * - `--yes` to use defaults (minimal preset)
 * - `--dry-run` to preview without writing
 */
export async function runNonInteractive(options: NonInteractiveOptions): Promise<void> {
	let serviceIds: string[] = [];
	let skillPackIds: string[] = [];

	// Resolve project directory
	const projectDir = options.projectDirectory ?? "my-openclaw-stack";

	// If a preset is specified, load it
	if (options.preset) {
		const preset = getPresetById(options.preset);
		if (!preset) {
			const available = getAllPresets()
				.map((p: Preset) => p.id)
				.join(", ");
			throw new Error(`Unknown preset: "${options.preset}". Available presets: ${available}`);
		}
		serviceIds = [...preset.services];
		skillPackIds = [...preset.skillPacks];
		console.log(pc.cyan(`Using preset: ${preset.name}`));
		console.log(pc.dim(preset.description));
	}

	// Parse comma-separated service IDs (merge with preset if both given)
	if (options.services) {
		const parsed = options.services
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);

		// Validate each service ID
		for (const id of parsed) {
			if (!getServiceById(id)) {
				const available = getAllServices()
					.map((s: ServiceDefinition) => s.id)
					.join(", ");
				throw new Error(`Unknown service: "${id}". Available services: ${available}`);
			}
		}

		serviceIds = [...new Set([...serviceIds, ...parsed])];
	}

	// Parse comma-separated skill pack IDs
	if (options.skills) {
		const parsed = options.skills
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);

		for (const id of parsed) {
			if (!getSkillPackById(id)) {
				const available = getAllSkillPacks()
					.map((p: SkillPack) => p.id)
					.join(", ");
				throw new Error(`Unknown skill pack: "${id}". Available skill packs: ${available}`);
			}
		}

		skillPackIds = [...new Set([...skillPackIds, ...parsed])];
	}

	// If --yes with no preset or services, use minimal defaults
	if (options.yes && serviceIds.length === 0 && !options.preset) {
		const minimal = getPresetById("minimal");
		if (minimal) {
			serviceIds = [...minimal.services];
			skillPackIds = [...minimal.skillPacks];
			console.log(pc.cyan("Using minimal preset (default with --yes)"));
		}
	}

	// Validate proxy type
	const proxy = (options.proxy ?? "none") as ProxyType;
	if (!["none", "caddy", "traefik"].includes(proxy)) {
		throw new Error(`Invalid proxy type: "${options.proxy}". Valid options: none, caddy, traefik`);
	}

	// Validate deployment type
	const deploymentType = (options.deploymentType ?? "docker") as DeploymentType;
	if (!["docker", "bare-metal"].includes(deploymentType)) {
		throw new Error(
			`Invalid deployment type: "${options.deploymentType}". Valid options: docker, bare-metal`,
		);
	}

	// Validate platform
	const validPlatforms =
		deploymentType === "docker"
			? ["linux/amd64", "linux/arm64"]
			: ["linux/amd64", "linux/arm64", "windows/amd64", "macos/amd64", "macos/arm64"];
	const platform = (options.platform ?? "linux/amd64") as Platform;
	if (!validPlatforms.includes(platform)) {
		throw new Error(
			`Invalid platform: "${options.platform}". Valid options: ${validPlatforms.join(", ")}`,
		);
	}

	// Parse AI providers - default to OpenAI like the wizard does
	let aiProvidersList = options.aiProviders
		? options.aiProviders.split(",").map((p) => p.trim())
		: ["openai"];

	// --llm shortcut: sets the AI provider and auto-adds ollama service if needed
	if (options.llm) {
		const llmProvider = options.llm.toLowerCase();
		aiProvidersList = [llmProvider];

		if (llmProvider === "ollama" && !serviceIds.includes("ollama")) {
			serviceIds.push("ollama");
			if (!options.json) {
				console.log(pc.cyan("Auto-adding Ollama service for local LLM support"));
			}
		}
	}

	// Validate image variant
	const validImages = ["official", "coolify", "alpine"];
	const imageVariant = options.image ?? "official";
	if (!validImages.includes(imageVariant)) {
		throw new Error(
			`Invalid image variant: "${options.image}". Valid options: ${validImages.join(", ")}`,
		);
	}

	// Validate OpenClaw install method
	const validInstallMethods = ["docker", "direct"];
	const openclawInstallMethod = (options.openclawInstall ?? "docker") as OpenclawInstallMethod;
	if (!validInstallMethods.includes(openclawInstallMethod)) {
		throw new Error(
			`Invalid OpenClaw install method: "${options.openclawInstall}". Valid options: ${validInstallMethods.join(", ")}`,
		);
	}

	// Scan for port conflicts and auto-reassign
	const selectedServiceDefs = serviceIds
		.map((id) => getServiceById(id))
		.filter((s): s is ServiceDefinition => s !== undefined);

	const portReassignments = await scanPortConflicts(selectedServiceDefs);
	const conflicts = formatPortConflicts(selectedServiceDefs, portReassignments);

	let portOverrides: Record<string, Record<number, number>> | undefined;

	if (conflicts.length > 0) {
		if (!options.json) {
			console.log(pc.yellow("\n⚠️  Port conflicts detected:"));
			for (const c of conflicts) {
				console.log(pc.dim(`   ${c.serviceId}: port ${c.port} → ${c.suggestedPort}`));
			}
			console.log(pc.dim("   Auto-reassigning to available ports...\n"));
		}

		portOverrides = {};
		for (const [serviceId, reassignments] of portReassignments) {
			portOverrides[serviceId] = Object.fromEntries(reassignments);
		}
	}

	// Build generation input
	const input: GenerationInput = {
		projectName: projectDir,
		services: serviceIds,
		skillPacks: skillPackIds,
		aiProviders: aiProvidersList as GenerationInput["aiProviders"],
		gsdRuntimes: [],
		proxy,
		proxyHttpPort: options.proxyHttpPort,
		proxyHttpsPort: options.proxyHttpsPort,
		portOverrides,
		domain: options.domain,
		gpu: options.gpu ?? false,
		platform,
		deployment: (options.deployment ?? "local") as "local" | "vps" | "homelab" | "clawexa",
		deploymentType,
		generateSecrets: true,
		openclawVersion: "latest",
		monitoring: options.monitoring ?? false,
		openclawImage: imageVariant as "official" | "coolify" | "alpine",
		openclawInstallMethod,
		hardened: options.hardened ?? true,
		deployTarget: (options.deployTarget ?? "local") as "local" | "cloud-init",
	};

	if (!options.json) {
		console.log("");
		console.log(pc.bold("Generating stack..."));
		console.log(pc.dim(`  Services: ${serviceIds.length > 0 ? serviceIds.join(", ") : "(none)"}`));
		console.log(
			pc.dim(`  Skill packs: ${skillPackIds.length > 0 ? skillPackIds.join(", ") : "(none)"}`),
		);
		console.log(pc.dim(`  Proxy: ${proxy}`));
		console.log(pc.dim(`  Deployment: ${deploymentType}`));
		console.log(pc.dim(`  Platform: ${platform}`));
		if (options.domain) {
			console.log(pc.dim(`  Domain: ${options.domain}`));
		}
		if (options.gpu) {
			console.log(pc.dim(`  GPU: enabled`));
		}
		console.log("");
	}

	// Create operations logger
	const logger = new OperationsLogger({
		source: "cli",
		sinks: [
			new FileSink({
				logDir: join(homedir(), ".better-openclaw", "logs"),
			}),
		],
		minLevel: "info",
	});

	// Generate
	const result = generate(input, { logger });

	// Fire-and-forget analytics tracking
	const analyticsPayload = buildAnalyticsPayload(input, result.metadata, "cli", options.preset);
	trackAnalytics(analyticsPayload);

	if (options.json) {
		console.log(
			JSON.stringify({
				directory: projectDir,
				files: Object.keys(result.files),
				metadata: result.metadata,
			}),
		);
		if (!options.dryRun) {
			await writeProject(projectDir, result.files, {
				dryRun: false,
				force: options.force,
				outputFormat: options.outputFormat,
				logger,
			});
		}
		return;
	}

	// Write files or dry-run
	await writeProject(projectDir, result.files, {
		dryRun: options.dryRun,
		force: options.force,
		outputFormat: options.outputFormat,
		logger,
	});

	// Summary
	if (!options.dryRun) {
		console.log("");
		console.log(pc.green(pc.bold("Stack generated successfully!")));
		console.log("");
		console.log(`  ${pc.cyan("Directory:")}  ${projectDir}`);
		console.log(`  ${pc.cyan("Services:")}   ${result.metadata.serviceCount}`);
		console.log(`  ${pc.cyan("Skills:")}     ${result.metadata.skillCount}`);
		console.log(`  ${pc.cyan("Memory:")}     ~${result.metadata.estimatedMemoryMB}MB`);
		console.log("");
		console.log("Next steps:");
		console.log(pc.dim(`  cd ${projectDir}`));
		if (openclawInstallMethod === "direct") {
			console.log(pc.dim("  ./scripts/install-openclaw.sh  # install OpenClaw on host"));
			console.log(pc.dim("  docker compose up -d  # start companion services"));
		} else if (deploymentType === "bare-metal") {
			console.log(pc.dim(platform === "windows/amd64" ? "  .\\install.ps1" : "  ./install.sh"));
		} else {
			console.log(pc.dim("  docker compose up -d"));
		}
	}
}
