#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runNonInteractive } from "./non-interactive.js";
import { runWizard } from "./wizard.js";

const program = new Command()
  .name("create-better-openclaw")
  .description("Scaffold production-ready OpenClaw stacks with Docker Compose")
  .version("1.0.26");

// ─── Global option for JSON output ──────────────────────────────────────────
program.option("--json", "Output results as JSON (for programmatic use)");

// ─── generate command (default) ─────────────────────────────────────────────
const generateCmd = new Command("generate")
  .description("Generate a new OpenClaw stack (default command)")
  .argument("[project-directory]", "Directory name for the generated project")
  .option("-y, --yes", "Use default configuration (skip wizard)")
  .option("--services <ids>", "Comma-separated service IDs")
  .option("--skills <packs>", "Comma-separated skill pack IDs")
  .option("--preset <name>", "Use a preset stack configuration")
  .option("--proxy <type>", "Reverse proxy: none, caddy, traefik", "none")
  .option(
    "--proxy-http-port <port>",
    "Custom HTTP port for reverse proxy (default: 80)",
    parseInt,
  )
  .option(
    "--proxy-https-port <port>",
    "Custom HTTPS port for reverse proxy (default: 443)",
    parseInt,
  )
  .option(
    "--ai-providers <providers>",
    "Comma-separated AI providers (openai,anthropic,google,xai,deepseek,groq,openrouter,mistral,together,ollama,lmstudio,vllm). Default: openai",
  )
  .option("--domain <domain>", "Domain for reverse proxy auto-SSL")
  .option("--monitoring", "Include monitoring stack")
  .option("--no-monitoring", "Exclude monitoring")
  .option("--gpu", "Enable GPU passthrough for AI services")
  .option(
    "--deployment <target>",
    "Deployment target: local, vps, homelab, clawexa",
    "local",
  )
  .option(
    "--deployment-type <type>",
    "Deployment type: docker or bare-metal",
    "docker",
  )
  .option(
    "--platform <arch>",
    "Target platform (linux/amd64, linux/arm64, windows/amd64, macos/amd64, macos/arm64)",
    "linux/amd64",
  )
  .option(
    "--output-format <fmt>",
    "Output format: directory, tar, zip",
    "directory",
  )
  .option(
    "--deploy <target>",
    "Deploy target: local (default), cloud-init (VPS provisioning)",
    "local",
  )
  .option(
    "--image <variant>",
    "OpenClaw Docker image variant: official, coolify, alpine",
    "official",
  )
  .option(
    "--llm <provider>",
    "LLM provider shortcut (anthropic, openai, ollama, google, etc.) — auto-configures AI provider",
  )
  .option(
    "--no-hardened",
    "Disable security hardening (cap_drop, no-new-privileges)",
  )
  .option("--force", "Overwrite existing project directory")
  .option("--dry-run", "Show what would be generated without writing files")
  .option("--open", "Open web UI stack builder in browser")
  .action(
    async (
      projectDirectory: string | undefined,
      options: Record<string, unknown>,
    ) => {
      if (options.open) {
        const url = "https://better-openclaw.dev/new";
        const { exec } = await import("node:child_process");
        const command =
          process.platform === "win32"
            ? "start"
            : process.platform === "darwin"
              ? "open"
              : "xdg-open";
        exec(`${command} ${url}`, (err) => {
          if (err) {
            console.log(
              pc.dim(
                `Open ${url} in your browser to use the visual stack builder.`,
              ),
            );
          } else {
            console.log(pc.green(`Opened ${url} in your browser.`));
          }
        });
        return;
      }

      const isNonInteractive =
        options.yes || options.preset || options.services;

      if (!process.stdin.isTTY && !isNonInteractive) {
        console.error(
          pc.red(
            "Error: stdin is not a TTY and no non-interactive flags were provided.",
          ),
        );
        console.error("");
        console.error("Run with one of the following:");
        console.error(
          `  ${pc.cyan("--yes")}            Use default configuration`,
        );
        console.error(
          `  ${pc.cyan("--preset <name>")}  Use a preset (minimal, creator, researcher, devops, full)`,
        );
        console.error(
          `  ${pc.cyan("--services <ids>")} Provide comma-separated service IDs`,
        );
        console.error("");
        console.error(`Or run in an interactive terminal to use the wizard.`);
        process.exit(1);
      }

      if (isNonInteractive) {
        try {
          const parentJson = program.opts() as { json?: boolean };
          await runNonInteractive({
            projectDirectory,
            services: options.services as string | undefined,
            skills: options.skills as string | undefined,
            preset: options.preset as string | undefined,
            proxy: options.proxy as string | undefined,
            proxyHttpPort: options.proxyHttpPort as number | undefined,
            proxyHttpsPort: options.proxyHttpsPort as number | undefined,
            aiProviders: options.aiProviders as string | undefined,
            domain: options.domain as string | undefined,
            gpu: options.gpu as boolean | undefined,
            monitoring: options.monitoring as boolean | undefined,
            deployment: options.deployment as string | undefined,
            deploymentType: options.deploymentType as string | undefined,
            platform: options.platform as string | undefined,
            dryRun: options.dryRun as boolean | undefined,
            yes: options.yes as boolean | undefined,
            outputFormat: options.outputFormat as string | undefined,
            json: parentJson.json,
            image: options.image as string | undefined,
            llm: options.llm as string | undefined,
            hardened: options.hardened as boolean | undefined,
            deployTarget: options.deploy as string | undefined,
          });
        } catch (err) {
          console.error(
            pc.red(
              `\nError: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
          process.exit(1);
        }
      } else {
        try {
          await runWizard(projectDirectory);
        } catch (err) {
          if (err instanceof Error && err.message === "USER_CANCELLED") {
            process.exit(0);
          }
          console.error(
            pc.red(
              `\nError: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
          process.exit(1);
        }
      }
    },
  );

program.addCommand(generateCmd, { isDefault: true });

// ─── services command ───────────────────────────────────────────────────────
const servicesCmd = new Command("services").description(
  "Manage and list available services",
);

servicesCmd
  .command("list")
  .description("List all available services with descriptions")
  .option("--category <cat>", "Filter by category (e.g., database, ai, proxy)")
  .action(async (options: { category?: string }) => {
    const { getAllServices, getServicesByCategory, SERVICE_CATEGORIES } =
      await import("@better-openclaw/core");
    const parentJson = program.opts() as { json?: boolean };

    const services = options.category
      ? getServicesByCategory(
          options.category as import("@better-openclaw/core").ServiceCategory,
        )
      : getAllServices();

    if (parentJson.json) {
      console.log(
        JSON.stringify({
          services: services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            icon: s.icon,
            image: `${s.image}:${s.imageTag}`,
            maturity: s.maturity,
          })),
          categories: SERVICE_CATEGORIES,
          total: services.length,
        }),
      );
      return;
    }

    console.log(pc.bold(`\nAvailable Services (${services.length}):\n`));

    // Group by category
    const grouped = new Map<string, typeof services>();
    for (const s of services) {
      const cat = s.category;
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(s);
    }

    for (const [category, categoryServices] of [...grouped.entries()].sort(
      (a, b) => a[0].localeCompare(b[0]),
    )) {
      const catInfo = SERVICE_CATEGORIES.find((c) => c.id === category);
      console.log(
        pc.cyan(
          pc.bold(`  ${catInfo?.icon ?? ""} ${catInfo?.label ?? category}`),
        ),
      );
      for (const s of categoryServices.sort((a, b) =>
        a.id.localeCompare(b.id),
      )) {
        const tag =
          s.maturity !== "stable" ? pc.yellow(` [${s.maturity}]`) : "";
        console.log(
          `    ${pc.green(s.id.padEnd(24))} ${pc.dim(s.description.slice(0, 60))}${tag}`,
        );
      }
      console.log("");
    }
  });

program.addCommand(servicesCmd);

// ─── presets command ────────────────────────────────────────────────────────
const presetsCmd = new Command("presets").description(
  "Manage and list preset configurations",
);

presetsCmd
  .command("list")
  .description("List all available presets")
  .action(async () => {
    const { getAllPresets } = await import("@better-openclaw/core");
    const parentJson = program.opts() as { json?: boolean };
    const presets = getAllPresets();

    if (parentJson.json) {
      console.log(JSON.stringify({ presets, total: presets.length }));
      return;
    }

    console.log(pc.bold(`\nAvailable Presets (${presets.length}):\n`));
    for (const p of presets) {
      console.log(`  ${pc.green(pc.bold(p.id.padEnd(20)))} ${p.description}`);
      console.log(pc.dim(`${"".padEnd(22)}Services: ${p.services.join(", ")}`));
      if (p.skillPacks.length > 0) {
        console.log(
          pc.dim(`${"".padEnd(22)}Skills: ${p.skillPacks.join(", ")}`),
        );
      }
      console.log(pc.dim(`${"".padEnd(22)}Memory: ~${p.estimatedMemoryMB}MB`));
      console.log("");
    }
  });

presetsCmd
  .command("info")
  .description("Show details of a specific preset")
  .argument("<preset-id>", "The preset ID to inspect")
  .action(async (presetId: string) => {
    const { getPresetById, getServiceById, getAllPresets } =
      await import("@better-openclaw/core");
    const parentJson = program.opts() as { json?: boolean };
    const preset = getPresetById(presetId);

    if (!preset) {
      const available = getAllPresets()
        .map((p) => p.id)
        .join(", ");
      console.error(
        pc.red(`Unknown preset: "${presetId}". Available: ${available}`),
      );
      process.exit(1);
    }

    if (parentJson.json) {
      const servicesDetail = preset.services
        .map((id) => getServiceById(id))
        .filter(Boolean);
      console.log(JSON.stringify({ preset, services: servicesDetail }));
      return;
    }

    console.log(pc.bold(`\nPreset: ${preset.name}\n`));
    console.log(`  ${pc.cyan("ID:")}          ${preset.id}`);
    console.log(`  ${pc.cyan("Description:")} ${preset.description}`);
    console.log(`  ${pc.cyan("Memory:")}      ~${preset.estimatedMemoryMB}MB`);
    console.log("");
    console.log(pc.bold("  Included Services:"));
    for (const id of preset.services) {
      const svc = getServiceById(id);
      if (svc) {
        console.log(
          `    ${svc.icon} ${pc.green(svc.id.padEnd(22))} ${pc.dim(svc.description.slice(0, 55))}`,
        );
      } else {
        console.log(`    ${pc.yellow(id)} (not found)`);
      }
    }
    if (preset.skillPacks.length > 0) {
      console.log("");
      console.log(pc.bold("  Skill Packs:"));
      for (const sp of preset.skillPacks) {
        console.log(`    ${pc.green(sp)}`);
      }
    }
    console.log("");
  });

program.addCommand(presetsCmd);

// ─── validate command ───────────────────────────────────────────────────────
program
  .command("validate")
  .description("Validate a generated stack or service configuration")
  .option("--services <ids>", "Comma-separated service IDs to validate")
  .option("--preset <name>", "Validate a preset")
  .option("--dir <path>", "Validate docker-compose.yml in a directory")
  .action(
    async (options: { services?: string; preset?: string; dir?: string }) => {
      const {
        resolve: resolveStack,
        getAllPresets,
        getPresetById,
        getServiceById,
      } = await import("@better-openclaw/core");
      const parentJson = program.opts() as { json?: boolean };

      let serviceIds: string[] = [];

      if (options.preset) {
        const preset = getPresetById(options.preset);
        if (!preset) {
          const available = getAllPresets()
            .map((p) => p.id)
            .join(", ");
          console.error(
            pc.red(
              `Unknown preset: "${options.preset}". Available: ${available}`,
            ),
          );
          process.exit(1);
        }
        serviceIds = [...preset.services];
      }

      if (options.services) {
        const parsed = options.services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const id of parsed) {
          if (!getServiceById(id)) {
            console.error(pc.red(`Unknown service: "${id}"`));
            process.exit(1);
          }
        }
        serviceIds = [...new Set([...serviceIds, ...parsed])];
      }

      if (options.dir) {
        const { existsSync } = await import("node:fs");
        const { join } = await import("node:path");
        const composePath = join(options.dir, "docker-compose.yml");
        if (!existsSync(composePath)) {
          console.error(
            pc.red(`No docker-compose.yml found in ${options.dir}`),
          );
          process.exit(1);
        }
        if (parentJson.json) {
          console.log(
            JSON.stringify({
              valid: true,
              path: composePath,
              message: "File exists",
            }),
          );
        } else {
          console.log(pc.green(`Found docker-compose.yml at ${composePath}`));
        }
        return;
      }

      if (serviceIds.length === 0) {
        console.error(
          pc.red("Provide --services, --preset, or --dir to validate"),
        );
        process.exit(1);
      }

      const result = resolveStack({
        services: serviceIds,
        skillPacks: [],
        proxy: "none",
        gpu: false,
        platform: "linux/amd64",
        deployment: "local",
        deploymentType: "docker",
        monitoring: false,
      });

      if (parentJson.json) {
        console.log(
          JSON.stringify({
            valid: result.isValid,
            serviceCount: result.services.length,
            estimatedMemoryMB: result.estimatedMemoryMB,
            warnings: result.warnings,
            errors: result.errors,
            addedDependencies: result.addedDependencies,
          }),
        );
        return;
      }

      if (result.isValid) {
        console.log(pc.green(pc.bold("\nConfiguration is valid!\n")));
      } else {
        console.log(pc.red(pc.bold("\nConfiguration has errors:\n")));
        for (const err of result.errors) {
          console.log(`  ${pc.red("x")} ${err.message}`);
        }
      }

      console.log(`  ${pc.cyan("Services:")}  ${result.services.length}`);
      console.log(`  ${pc.cyan("Memory:")}    ~${result.estimatedMemoryMB}MB`);

      if (result.addedDependencies.length > 0) {
        console.log("");
        console.log(pc.bold("  Auto-added dependencies:"));
        for (const dep of result.addedDependencies) {
          console.log(
            `    ${pc.green("+")} ${dep.serviceId} ${pc.dim(`(${dep.reason}: ${dep.requiredBy})`)}`,
          );
        }
      }

      if (result.warnings.length > 0) {
        console.log("");
        console.log(pc.bold("  Warnings:"));
        for (const w of result.warnings) {
          console.log(`    ${pc.yellow("!")} ${w.message}`);
        }
      }
      console.log("");

      if (!result.isValid) {
        process.exit(1);
      }
    },
  );

// ─── init command ───────────────────────────────────────────────────────────
program
  .command("init")
  .description("Initialize a new OpenClaw stack in the current directory")
  .option("--preset <name>", "Start from a preset")
  .option("--force", "Overwrite existing files")
  .action(async (options: { preset?: string; force?: boolean }) => {
    const isNonInteractive = !!options.preset;

    if (isNonInteractive) {
      try {
        const parentJson = program.opts() as { json?: boolean };
        await runNonInteractive({
          projectDirectory: ".",
          preset: options.preset,
          force: options.force,
          yes: true,
          json: parentJson.json,
        });
      } catch (err) {
        console.error(
          pc.red(
            `\nError: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        process.exit(1);
      }
    } else {
      try {
        await runWizard(".");
      } catch (err) {
        if (err instanceof Error && err.message === "USER_CANCELLED") {
          process.exit(0);
        }
        console.error(
          pc.red(
            `\nError: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        process.exit(1);
      }
    }
  });

// ─── add command ────────────────────────────────────────────────────────────
program
  .command("add")
  .description("Add a service to an existing stack")
  .argument("<service-id>", "The service ID to add")
  .option("--dir <path>", "Project directory (default: current directory)", ".")
  .option("--force", "Overwrite existing files")
  .action(
    async (serviceId: string, options: { dir: string; force?: boolean }) => {
      const { existsSync, readFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const { getServiceById, getAllServices, generate } =
        await import("@better-openclaw/core");
      const { writeProject } = await import("./writer.js");
      const parentJson = program.opts() as { json?: boolean };

      // Validate the service ID
      if (!getServiceById(serviceId)) {
        const available = getAllServices()
          .map((s) => s.id)
          .join(", ");
        console.error(
          pc.red(`Unknown service: "${serviceId}". Available: ${available}`),
        );
        process.exit(1);
      }

      // Read existing docker-compose.yml to detect current services
      const composePath = join(options.dir, "docker-compose.yml");
      if (!existsSync(composePath)) {
        console.error(
          pc.red(
            `No docker-compose.yml found in "${options.dir}". Run "generate" first.`,
          ),
        );
        process.exit(1);
      }

      // Parse existing compose to find current services
      const composeContent = readFileSync(composePath, "utf-8");
      const serviceIds: string[] = [];
      const allServices = getAllServices();
      for (const svc of allServices) {
        // Check if the service container name appears in the compose file
        if (
          composeContent.includes(`${svc.id}:`) ||
          composeContent.includes(`container_name: ${svc.id}`)
        ) {
          serviceIds.push(svc.id);
        }
      }

      if (serviceIds.includes(serviceId)) {
        if (parentJson.json) {
          console.log(
            JSON.stringify({
              error: `Service "${serviceId}" is already in the stack`,
            }),
          );
        } else {
          console.log(
            pc.yellow(`Service "${serviceId}" is already in the stack.`),
          );
        }
        return;
      }

      serviceIds.push(serviceId);

      console.log(pc.cyan(`Adding ${serviceId} to stack...`));

      const result = generate({
        projectName: options.dir === "." ? "my-openclaw-stack" : options.dir,
        services: serviceIds,
        skillPacks: [],
        aiProviders: [],
        gsdRuntimes: [],
        proxy: "none",
        gpu: false,
        platform: "linux/amd64",
        deployment: "local",
        deploymentType: "docker",
        generateSecrets: true,
        openclawVersion: "latest",
        monitoring: false,
        openclawImage: "official",
        openclawInstallMethod: "docker",
        deployTarget: "local",
        hardened: true,
      });

      await writeProject(options.dir, result.files, { force: true });

      if (parentJson.json) {
        console.log(
          JSON.stringify({
            added: serviceId,
            serviceCount: result.metadata.serviceCount,
            estimatedMemoryMB: result.metadata.estimatedMemoryMB,
          }),
        );
      } else {
        console.log(
          pc.green(
            `\nAdded ${serviceId}. Stack now has ${result.metadata.serviceCount} services.`,
          ),
        );
      }
    },
  );

// ─── remove command ─────────────────────────────────────────────────────────
program
  .command("remove")
  .description("Remove a service from an existing stack")
  .argument("<service-id>", "The service ID to remove")
  .option("--dir <path>", "Project directory (default: current directory)", ".")
  .action(async (serviceId: string, options: { dir: string }) => {
    const { existsSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { getServiceById, getAllServices, generate } =
      await import("@better-openclaw/core");
    const { writeProject } = await import("./writer.js");
    const parentJson = program.opts() as { json?: boolean };

    const composePath = join(options.dir, "docker-compose.yml");
    if (!existsSync(composePath)) {
      console.error(
        pc.red(
          `No docker-compose.yml found in "${options.dir}". Nothing to remove from.`,
        ),
      );
      process.exit(1);
    }

    // Parse existing compose to find current services
    const composeContent = readFileSync(composePath, "utf-8");
    const serviceIds: string[] = [];
    const allServices = getAllServices();
    for (const svc of allServices) {
      if (
        composeContent.includes(`${svc.id}:`) ||
        composeContent.includes(`container_name: ${svc.id}`)
      ) {
        serviceIds.push(svc.id);
      }
    }

    if (!serviceIds.includes(serviceId)) {
      if (parentJson.json) {
        console.log(
          JSON.stringify({
            error: `Service "${serviceId}" is not in the stack`,
          }),
        );
      } else {
        console.log(pc.yellow(`Service "${serviceId}" is not in the stack.`));
      }
      return;
    }

    // Check for removal warning
    const svcDef = getServiceById(serviceId);
    if (svcDef?.mandatory) {
      console.error(pc.red(`Cannot remove "${serviceId}": it is mandatory.`));
      process.exit(1);
    }

    const remaining = serviceIds.filter((id) => id !== serviceId);

    console.log(pc.cyan(`Removing ${serviceId} from stack...`));

    const result = generate({
      projectName: options.dir === "." ? "my-openclaw-stack" : options.dir,
      services: remaining,
      skillPacks: [],
      aiProviders: [],
      gsdRuntimes: [],
      proxy: "none",
      gpu: false,
      platform: "linux/amd64",
      deployment: "local",
      deploymentType: "docker",
      generateSecrets: true,
      openclawVersion: "latest",
      monitoring: false,
      openclawImage: "official",
      openclawInstallMethod: "docker",
      deployTarget: "local",
      hardened: true,
    });

    await writeProject(options.dir, result.files, { force: true });

    if (parentJson.json) {
      console.log(
        JSON.stringify({
          removed: serviceId,
          serviceCount: result.metadata.serviceCount,
        }),
      );
    } else {
      console.log(
        pc.green(
          `\nRemoved ${serviceId}. Stack now has ${result.metadata.serviceCount} services.`,
        ),
      );
    }
  });

// ─── status command ────────────────────────────────────────────────────────
program
  .command("status")
  .description("Show the status of all services in the running stack")
  .option("--dir <path>", "Project directory (default: current directory)", ".")
  .action(async (options: { dir: string }) => {
    const { runStatus } = await import("./status.js");
    const parentJson = program.opts() as { json?: boolean };
    await runStatus({ dir: options.dir, json: parentJson.json });
  });

// ─── update command ────────────────────────────────────────────────────────
program
  .command("update")
  .description("Pull latest images and restart the stack")
  .option("--dir <path>", "Project directory (default: current directory)", ".")
  .option("--dry-run", "Show what would be updated without making changes")
  .action(async (options: { dir: string; dryRun?: boolean }) => {
    const { runUpdate } = await import("./update.js");
    const parentJson = program.opts() as { json?: boolean };
    await runUpdate({
      dir: options.dir,
      dryRun: options.dryRun,
      json: parentJson.json,
    });
  });

// ─── backup command ────────────────────────────────────────────────────────
const backupCmd = new Command("backup").description("Manage stack backups");

backupCmd
  .command("create")
  .description(
    "Create a backup of the stack (PostgreSQL dump, Qdrant snapshot)",
  )
  .option("--dir <path>", "Project directory (default: current directory)", ".")
  .option("--output <path>", "Output directory for the backup")
  .action(async (options: { dir: string; output?: string }) => {
    const { runBackupCreate } = await import("./backup.js");
    const parentJson = program.opts() as { json?: boolean };
    await runBackupCreate({
      dir: options.dir,
      output: options.output,
      json: parentJson.json,
    });
  });

backupCmd
  .command("restore")
  .description("Restore from a backup archive")
  .argument("<file>", "Path to the backup .tar.gz file")
  .option("--dir <path>", "Project directory (default: current directory)", ".")
  .action(async (file: string, options: { dir: string }) => {
    const { runBackupRestore } = await import("./backup.js");
    const parentJson = program.opts() as { json?: boolean };
    await runBackupRestore({ file, dir: options.dir, json: parentJson.json });
  });

backupCmd
  .command("list")
  .description("List available backups")
  .option("--dir <path>", "Project directory (default: current directory)", ".")
  .action(async (options: { dir: string }) => {
    const { runBackupList } = await import("./backup.js");
    const parentJson = program.opts() as { json?: boolean };
    await runBackupList({ dir: options.dir, json: parentJson.json });
  });

program.addCommand(backupCmd);

// ─── deploy command ─────────────────────────────────────────────────────────
const deployCmd = new Command("deploy")
  .description("Deploy a generated stack to Dokploy or Coolify")
  .option("--dir <path>", "Project directory (default: current directory)", ".")
  .option(
    "--provider <name>",
    "PaaS provider: dokploy or coolify (omit for interactive selection)",
  )
  .option("--url <url>", "PaaS instance URL (e.g. https://dokploy.example.com)")
  .option("--api-key <key>", "API key for the PaaS instance")
  .action(
    async (options: {
      dir: string;
      provider?: string;
      url?: string;
      apiKey?: string;
    }) => {
      const parentJson = program.opts() as { json?: boolean };
      const isNonInteractive =
        options.provider && options.url && options.apiKey;

      if (isNonInteractive) {
        const { runDeploy } = await import("./deploy.js");
        await runDeploy({
          provider: options.provider!,
          instanceUrl: options.url!,
          apiKey: options.apiKey!,
          dir: options.dir,
          json: parentJson.json,
        });
      } else {
        const { runDeployInteractive } = await import("./deploy.js");
        await runDeployInteractive({ dir: options.dir, json: parentJson.json });
      }
    },
  );

program.addCommand(deployCmd);

// ─── completion command ─────────────────────────────────────────────────────
program
  .command("completion")
  .description("Generate shell completion script")
  .argument("<shell>", "Shell type: bash, zsh, or fish")
  .action(async (shell: string) => {
    const {
      generateBashCompletion,
      generateZshCompletion,
      generateFishCompletion,
    } = await import("./completions.js");

    switch (shell) {
      case "bash":
        console.log(generateBashCompletion());
        break;
      case "zsh":
        console.log(generateZshCompletion());
        break;
      case "fish":
        console.log(generateFishCompletion());
        break;
      default:
        console.error(
          pc.red(`Unknown shell: "${shell}". Supported: bash, zsh, fish`),
        );
        console.error(pc.dim("\nUsage:"));
        console.error(
          pc.dim("  create-better-openclaw completion bash >> ~/.bashrc"),
        );
        console.error(
          pc.dim("  create-better-openclaw completion zsh >> ~/.zshrc"),
        );
        console.error(
          pc.dim(
            "  create-better-openclaw completion fish > ~/.config/fish/completions/create-better-openclaw.fish",
          ),
        );
        process.exit(1);
    }
  });

program.parse();
