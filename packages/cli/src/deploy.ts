/**
 * CLI deploy command — deploy a generated stack to Dokploy or Coolify.
 *
 * Two entry-points:
 *   - `runDeploy(options)` — non-interactive mode (all flags provided on CLI)
 *   - `runDeployInteractive(options)` — interactive wizard using @clack/prompts
 *
 * Reads docker-compose.yml and .env from the project directory, tests
 * the connection to the target PaaS, then pushes the compose stack via
 * the core deployer API.
 */

import { homedir } from "node:os";
import { join, resolve } from "node:path";
import pc from "picocolors";

/** Options accepted by the non-interactive deploy flow. */
export interface DeployOptions {
	provider: string;
	instanceUrl: string;
	apiKey: string;
	dir: string;
	json?: boolean;
}

/**
 * Runs `better-openclaw deploy` — deploys a generated stack to Dokploy or Coolify.
 *
 * Reads docker-compose.yml and .env from the project directory,
 * then pushes them to the target PaaS via its REST API.
 */
export async function runDeploy(options: DeployOptions): Promise<void> {
	const { existsSync, readFileSync } = await import("node:fs");
	const { getDeployer, getAvailableDeployers, OperationsLogger, FileSink } = await import(
		"@better-openclaw/core"
	);

	const dir = resolve(options.dir);

	// Validate provider
	const deployer = getDeployer(options.provider);
	if (!deployer) {
		const available = getAvailableDeployers().join(", ");
		if (options.json) {
			console.log(
				JSON.stringify({
					error: `Unknown provider "${options.provider}". Available: ${available}`,
				}),
			);
		} else {
			console.error(pc.red(`Unknown provider "${options.provider}". Available: ${available}`));
		}
		process.exit(1);
	}

	// Find compose file
	const composePath = join(dir, "docker-compose.yml");
	if (!existsSync(composePath)) {
		if (options.json) {
			console.log(JSON.stringify({ error: "No docker-compose.yml found", dir }));
		} else {
			console.error(pc.red(`No docker-compose.yml found in "${dir}".`));
			console.error(pc.dim("Run 'better-openclaw generate' first to create a stack."));
		}
		process.exit(1);
	}

	// Read compose and env files
	const composeYaml = readFileSync(composePath, "utf-8");

	let envContent = "";
	const envPath = join(dir, ".env");
	const envExamplePath = join(dir, ".env.example");
	if (existsSync(envPath)) {
		envContent = readFileSync(envPath, "utf-8");
	} else if (existsSync(envExamplePath)) {
		envContent = readFileSync(envExamplePath, "utf-8");
		if (!options.json) {
			console.log(pc.yellow("No .env found, using .env.example. Secrets may not be populated."));
		}
	}

	// Derive project name from directory
	const projectName = dir.split(/[\\/]/).pop() ?? "my-stack";

	// Test connection
	if (!options.json) {
		console.log("");
		console.log(pc.cyan(`Deploying to ${deployer.name}...`));
		console.log(pc.dim(`  Instance: ${options.instanceUrl}`));
		console.log(pc.dim(`  Project:  ${projectName}`));
		console.log("");
		console.log(pc.dim("Testing connection..."));
	}

	const testResult = await deployer.testConnection({
		instanceUrl: options.instanceUrl,
		apiKey: options.apiKey,
	});

	if (!testResult.ok) {
		if (options.json) {
			console.log(
				JSON.stringify({
					error: `Connection failed: ${testResult.error}`,
				}),
			);
		} else {
			console.error(pc.red(`Connection failed: ${testResult.error}`));
			console.error(pc.dim("Check your instance URL and API key."));
		}
		process.exit(1);
	}

	if (!options.json) {
		console.log(pc.green("Connection OK"));
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

	// Deploy
	const result = await deployer.deploy({
		target: {
			instanceUrl: options.instanceUrl,
			apiKey: options.apiKey,
		},
		projectName,
		composeYaml,
		envContent,
		logger,
	});

	if (options.json) {
		console.log(JSON.stringify(result));
		return;
	}

	// Display steps
	for (const step of result.steps) {
		const icon =
			step.status === "done"
				? pc.green("done")
				: step.status === "error"
					? pc.red("fail")
					: pc.dim("skip");
		const detail = step.detail ? pc.dim(` (${step.detail})`) : "";
		console.log(`  ${icon}  ${step.step}${detail}`);
	}

	console.log("");

	if (result.success) {
		console.log(pc.green(pc.bold("Deployed successfully!")));
		if (result.dashboardUrl) {
			console.log(pc.dim(`  Dashboard: ${result.dashboardUrl}`));
		}
	} else {
		console.error(pc.red(`Deployment failed: ${result.error}`));
	}

	console.log("");

	if (!result.success) {
		process.exit(1);
	}
}

/**
 * Interactive deploy — prompts for provider, URL, and API key using @clack/prompts.
 */
export async function runDeployInteractive(options: {
	dir: string;
	json?: boolean;
}): Promise<void> {
	const clack = await import("@clack/prompts");

	clack.intro(pc.cyan("Deploy to PaaS"));

	const provider = await clack.select({
		message: "Select deployment platform",
		options: [
			{
				value: "dokploy",
				label: "Dokploy",
				hint: "Self-hosted PaaS alternative to Heroku/Netlify",
			},
			{
				value: "coolify",
				label: "Coolify",
				hint: "Self-hosted PaaS alternative to Vercel",
			},
		],
	});

	if (clack.isCancel(provider)) {
		clack.cancel("Cancelled.");
		process.exit(0);
	}

	const instanceUrl = await clack.text({
		message: `Enter your ${provider === "dokploy" ? "Dokploy" : "Coolify"} instance URL`,
		placeholder:
			provider === "dokploy" ? "https://dokploy.example.com" : "https://coolify.example.com",
		validate: (value) => {
			if (!value?.trim()) return "URL is required";
			try {
				new URL(value);
			} catch {
				return "Invalid URL";
			}
			return undefined;
		},
	});

	if (clack.isCancel(instanceUrl)) {
		clack.cancel("Cancelled.");
		process.exit(0);
	}

	const apiKeyHint =
		provider === "dokploy"
			? "Settings > Profile > API/CLI > Generate Token"
			: "Keys & Tokens > API tokens > Create (permission: *)";

	const apiKey = await clack.password({
		message: `Enter your API key (${apiKeyHint})`,
		validate: (value) => {
			if (!value?.trim()) return "API key is required";
			return undefined;
		},
	});

	if (clack.isCancel(apiKey)) {
		clack.cancel("Cancelled.");
		process.exit(0);
	}

	await runDeploy({
		provider: provider as string,
		instanceUrl: instanceUrl as string,
		apiKey: apiKey as string,
		dir: options.dir,
		json: options.json,
	});
}
