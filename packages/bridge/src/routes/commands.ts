import { Hono } from "hono";
import { z } from "zod";
import { composePull, composeRecreate, composeScale } from "../lib/compose-exec.js";
import type { DockerClient } from "../lib/docker.js";

const ServiceIdSchema = z.object({ serviceId: z.string().min(1) });
const ScaleSchema = z.object({
	serviceId: z.string().min(1),
	replicas: z.number().int().min(0).max(20),
});
const ServiceIdsSchema = z.object({
	serviceIds: z.array(z.string().min(1)).optional(),
});

export function commandRoutes(docker: DockerClient, projectDir: string, projectName: string): Hono {
	const app = new Hono();

	/** Resolve a service ID to a Docker container ID. */
	async function resolveServiceContainer(serviceId: string): Promise<string | null> {
		return docker.findContainerByService(projectName, serviceId);
	}

	/** POST /commands/restart — Restart a service. */
	app.post("/commands/restart", async (c) => {
		const body = ServiceIdSchema.safeParse(await c.req.json());
		if (!body.success) {
			return c.json({ error: { code: "VALIDATION", message: body.error.message } }, 400);
		}

		const containerId = await resolveServiceContainer(body.data.serviceId);
		if (!containerId) {
			return c.json(
				{ error: { code: "NOT_FOUND", message: `Service '${body.data.serviceId}' not found` } },
				404,
			);
		}

		await docker.restartContainer(containerId);
		return c.json({ ok: true, command: "restart", serviceId: body.data.serviceId });
	});

	/** POST /commands/stop — Stop a service. */
	app.post("/commands/stop", async (c) => {
		const body = ServiceIdSchema.safeParse(await c.req.json());
		if (!body.success) {
			return c.json({ error: { code: "VALIDATION", message: body.error.message } }, 400);
		}

		const containerId = await resolveServiceContainer(body.data.serviceId);
		if (!containerId) {
			return c.json(
				{ error: { code: "NOT_FOUND", message: `Service '${body.data.serviceId}' not found` } },
				404,
			);
		}

		await docker.stopContainer(containerId);
		return c.json({ ok: true, command: "stop", serviceId: body.data.serviceId });
	});

	/** POST /commands/start — Start a stopped service. */
	app.post("/commands/start", async (c) => {
		const body = ServiceIdSchema.safeParse(await c.req.json());
		if (!body.success) {
			return c.json({ error: { code: "VALIDATION", message: body.error.message } }, 400);
		}

		const containerId = await resolveServiceContainer(body.data.serviceId);
		if (!containerId) {
			return c.json(
				{ error: { code: "NOT_FOUND", message: `Service '${body.data.serviceId}' not found` } },
				404,
			);
		}

		await docker.startContainer(containerId);
		return c.json({ ok: true, command: "start", serviceId: body.data.serviceId });
	});

	/** POST /commands/scale — Scale a service to N replicas. */
	app.post("/commands/scale", async (c) => {
		const body = ScaleSchema.safeParse(await c.req.json());
		if (!body.success) {
			return c.json({ error: { code: "VALIDATION", message: body.error.message } }, 400);
		}

		const result = await composeScale(projectDir, body.data.serviceId, body.data.replicas);
		return c.json({
			ok: true,
			command: "scale",
			serviceId: body.data.serviceId,
			replicas: body.data.replicas,
			output: result.stdout,
		});
	});

	/** POST /commands/pull — Pull latest images. */
	app.post("/commands/pull", async (c) => {
		const body = ServiceIdsSchema.safeParse(await c.req.json());
		if (!body.success) {
			return c.json({ error: { code: "VALIDATION", message: body.error.message } }, 400);
		}

		const result = await composePull(projectDir, body.data.serviceIds);
		return c.json({
			ok: true,
			command: "pull",
			serviceIds: body.data.serviceIds ?? "all",
			output: result.stdout,
		});
	});

	/** POST /commands/recreate — Force-recreate services. */
	app.post("/commands/recreate", async (c) => {
		const body = ServiceIdsSchema.safeParse(await c.req.json());
		if (!body.success) {
			return c.json({ error: { code: "VALIDATION", message: body.error.message } }, 400);
		}

		const result = await composeRecreate(projectDir, body.data.serviceIds);
		return c.json({
			ok: true,
			command: "recreate",
			serviceIds: body.data.serviceIds ?? "all",
			output: result.stdout,
		});
	});

	/** POST /commands/prune — Prune stopped containers and dangling images. */
	app.post("/commands/prune", async (c) => {
		const result = await docker.prune();
		return c.json({
			ok: true,
			command: "prune",
			containersDeleted: result.containersDeleted,
			spaceReclaimedMB: result.spaceReclaimedMB,
		});
	});

	return app;
}
