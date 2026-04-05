import { Hono } from "hono";
import type { DockerClient } from "../lib/docker.js";

export function healthRoutes(docker: DockerClient): Hono {
	const app = new Hono();

	app.get("/health", async (c) => {
		const dockerOk = await docker.ping();

		if (!dockerOk) {
			return c.json(
				{
					status: "degraded",
					bridge: "ok",
					docker: "unreachable",
					timestamp: new Date().toISOString(),
				},
				503,
			);
		}

		const info = await docker.info();

		return c.json({
			status: "ok",
			bridge: "ok",
			docker: {
				connected: true,
				version: info.version,
				containers: info.containers,
				containersRunning: info.containersRunning,
				images: info.images,
			},
			timestamp: new Date().toISOString(),
		});
	});

	return app;
}
