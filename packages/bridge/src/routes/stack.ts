import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import type { DockerClient } from "../lib/docker.js";

export function stackRoutes(docker: DockerClient, projectDir: string, projectName: string): Hono {
	const app = new Hono();

	/** GET /stack — Stack manifest + live overview. */
	app.get("/stack", async (c) => {
		const manifestPath = join(projectDir, "stack-manifest.json");
		let manifest: Record<string, unknown> | null = null;

		if (existsSync(manifestPath)) {
			try {
				manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
			} catch {
				manifest = null;
			}
		}

		const containers = await docker.listProjectContainers(projectName);
		const running = containers.filter((cn) => cn.state === "running").length;
		const total = containers.length;

		return c.json({
			projectName,
			manifest,
			services: {
				total,
				running,
				stopped: total - running,
			},
			timestamp: new Date().toISOString(),
		});
	});

	/** GET /stack/services — All services with live status. */
	app.get("/stack/services", async (c) => {
		const containers = await docker.listProjectContainers(projectName);
		return c.json({ services: containers });
	});

	/** GET /stack/services/:id — Single service detail. */
	app.get("/stack/services/:id", async (c) => {
		const serviceId = c.req.param("id");
		const containerId = await docker.findContainerByService(projectName, serviceId);

		if (!containerId) {
			return c.json(
				{ error: { code: "NOT_FOUND", message: `Service '${serviceId}' not found in project` } },
				404,
			);
		}

		const detail = await docker.inspectContainer(containerId);
		return c.json(detail);
	});

	/** GET /stack/services/:id/logs — Service logs. */
	app.get("/stack/services/:id/logs", async (c) => {
		const serviceId = c.req.param("id");
		const tail = Number(c.req.query("tail") ?? "100");
		const since = c.req.query("since") ? Number(c.req.query("since")) : undefined;

		const containerId = await docker.findContainerByService(projectName, serviceId);

		if (!containerId) {
			return c.json(
				{ error: { code: "NOT_FOUND", message: `Service '${serviceId}' not found` } },
				404,
			);
		}

		const logs = await docker.getContainerLogs(containerId, { tail, since });
		return c.text(logs);
	});

	return app;
}
