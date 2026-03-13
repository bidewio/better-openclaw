import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import pc from "picocolors";

interface ContainerInfo {
	Name: string;
	Service: string;
	State: string;
	Status: string;
	Health: string;
	Publishers: { URL: string; TargetPort: number; PublishedPort: number; Protocol: string }[];
}

/**
 * Runs `pnpx create-better-openclaw status` — shows a formatted table of all services
 * in the local Docker Compose stack with their state, ports, and health.
 */
export async function runStatus(options: { dir: string; json?: boolean }): Promise<void> {
	const dir = resolve(options.dir);

	// Find compose file(s)
	const defaultCompose = join(dir, "docker-compose.yml");

	if (!existsSync(defaultCompose)) {
		if (options.json) {
			console.log(JSON.stringify({ error: "No docker-compose.yml found", dir }));
		} else {
			console.error(pc.red(`No docker-compose.yml found in "${dir}".`));
			console.error(pc.dim("Run 'pnpx create-better-openclaw generate' first to create a stack."));
		}
		process.exit(1);
	}

	// Check if docker compose is available
	try {
		execSync("docker compose version", { stdio: "pipe" });
	} catch {
		if (options.json) {
			console.log(JSON.stringify({ error: "Docker Compose not found" }));
		} else {
			console.error(pc.red("Docker Compose is not installed or not in PATH."));
			console.error(pc.dim("Install Docker Desktop or Docker Engine to use this command."));
		}
		process.exit(1);
	}

	// Run docker compose ps --format json
	let output: string;
	try {
		output = execSync("docker compose ps --format json", {
			cwd: dir,
			stdio: ["pipe", "pipe", "pipe"],
			encoding: "utf-8",
		});
	} catch (_err) {
		if (options.json) {
			console.log(JSON.stringify({ error: "No running services found", dir }));
		} else {
			console.error(pc.yellow("No running services found."));
			console.error(pc.dim("Run 'docker compose up -d' to start the stack."));
		}
		process.exit(1);
	}

	if (!output.trim()) {
		if (options.json) {
			console.log(JSON.stringify({ services: [], dir }));
		} else {
			console.log(pc.yellow("No running services found."));
			console.log(pc.dim("Run 'docker compose up -d' to start the stack."));
		}
		return;
	}

	// Parse JSON output — docker compose outputs one JSON object per line
	const containers: ContainerInfo[] = [];
	for (const line of output.trim().split("\n")) {
		if (!line.trim()) continue;
		try {
			containers.push(JSON.parse(line));
		} catch {
			// Skip non-JSON lines
		}
	}

	if (containers.length === 0) {
		if (options.json) {
			console.log(JSON.stringify({ services: [], dir }));
		} else {
			console.log(pc.yellow("No running services found."));
		}
		return;
	}

	// Build service info
	const services = containers.map((c) => {
		const ports = (c.Publishers || [])
			.filter((p) => p.PublishedPort > 0)
			.map((p) => `${p.PublishedPort}`)
			.filter((v, i, a) => a.indexOf(v) === i) // dedupe
			.join(", ");

		return {
			name: c.Service || c.Name,
			state: c.State || "unknown",
			ports: ports || "-",
			health: c.Health || "-",
			status: c.Status || "",
		};
	});

	// Sort: running first, then alphabetically
	services.sort((a, b) => {
		if (a.state === "running" && b.state !== "running") return -1;
		if (a.state !== "running" && b.state === "running") return 1;
		return a.name.localeCompare(b.name);
	});

	if (options.json) {
		console.log(JSON.stringify({ services, dir }));
		return;
	}

	// Format as table
	console.log("");
	console.log(pc.bold("  OpenClaw Stack Status"));
	console.log(pc.dim(`  ${dir}`));
	console.log("");

	// Calculate column widths
	const nameWidth = Math.max(7, ...services.map((s) => s.name.length)) + 2;
	const stateWidth = Math.max(6, ...services.map((s) => s.state.length)) + 2;
	const portWidth = Math.max(4, ...services.map((s) => s.ports.length)) + 2;

	// Header
	const header = `  ${"SERVICE".padEnd(nameWidth)}${"STATE".padEnd(stateWidth)}${"PORTS".padEnd(portWidth)}HEALTH`;
	console.log(pc.dim(header));
	console.log(pc.dim(`  ${"─".repeat(header.length - 2)}`));

	// Rows
	for (const svc of services) {
		const stateColor =
			svc.state === "running"
				? svc.health === "healthy" || svc.health === "-"
					? pc.green
					: svc.health === "starting"
						? pc.yellow
						: pc.red
				: svc.state === "exited"
					? pc.red
					: pc.yellow;

		const healthIcon =
			svc.health === "healthy"
				? pc.green("healthy")
				: svc.health === "starting"
					? pc.yellow("starting")
					: svc.health === "unhealthy"
						? pc.red("unhealthy")
						: pc.dim(svc.health);

		console.log(
			`  ${pc.white(svc.name.padEnd(nameWidth))}${stateColor(svc.state.padEnd(stateWidth))}${pc.cyan(svc.ports.padEnd(portWidth))}${healthIcon}`,
		);
	}

	// Summary
	const running = services.filter((s) => s.state === "running").length;
	const total = services.length;
	const healthy = services.filter((s) => s.health === "healthy").length;

	console.log("");
	console.log(pc.dim(`  ${running}/${total} running${healthy > 0 ? `, ${healthy} healthy` : ""}`));
	console.log("");
}
