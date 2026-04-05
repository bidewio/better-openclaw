import { Hono } from "hono";
import type { DockerClient } from "../lib/docker.js";

export function containerRoutes(docker: DockerClient): Hono {
	const app = new Hono();

	/** GET /containers/:id — Inspect a container by ID. */
	app.get("/containers/:id", async (c) => {
		const id = c.req.param("id");
		try {
			const detail = await docker.inspectContainer(id);
			return c.json(detail);
		} catch {
			return c.json(
				{ error: { code: "NOT_FOUND", message: `Container '${id}' not found` } },
				404,
			);
		}
	});

	/** GET /containers/:id/logs — Container logs. */
	app.get("/containers/:id/logs", async (c) => {
		const id = c.req.param("id");
		const tail = Number(c.req.query("tail") ?? "100");
		const since = c.req.query("since") ? Number(c.req.query("since")) : undefined;

		try {
			const logs = await docker.getContainerLogs(id, { tail, since });
			return c.text(logs);
		} catch {
			return c.json(
				{ error: { code: "NOT_FOUND", message: `Container '${id}' not found` } },
				404,
			);
		}
	});

	/** GET /containers/:id/stats — Container resource usage. */
	app.get("/containers/:id/stats", async (c) => {
		const id = c.req.param("id");
		try {
			const stats = await docker.getContainerStats(id);
			return c.json(stats);
		} catch {
			return c.json(
				{ error: { code: "NOT_FOUND", message: `Container '${id}' not found or not running` } },
				404,
			);
		}
	});

	return app;
}
