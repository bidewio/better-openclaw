import { Hono } from "hono";
import { cors } from "hono/cors";
import { startHeartbeat } from "./heartbeat/heartbeat.js";
import { ConvexSyncClient } from "./lib/convex-sync.js";
import { DockerClient } from "./lib/docker.js";
import { bridgeAuth } from "./middleware/bridge-auth.js";
import { operationsLoggerMiddleware } from "./middleware/operations-logger.js";
import { commandRoutes } from "./routes/commands.js";
import { configRoutes } from "./routes/config.js";
import { containerRoutes } from "./routes/containers.js";
import { healthRoutes } from "./routes/health.js";
import { stackRoutes } from "./routes/stack.js";
import { taskRoutes } from "./routes/tasks.js";

export interface BridgeConfig {
	projectName: string;
	projectDir: string;
	dockerSocketPath?: string;
	convexUrl?: string;
	fleetInstanceId?: string;
}

export function createApp(config: BridgeConfig) {
	const app = new Hono();
	const docker = new DockerClient(config.dockerSocketPath);

	// ─── Middleware ──────────────────────────────────────────────────────
	app.use("/*", cors({ origin: "*" }));
	app.use("/*", operationsLoggerMiddleware());
	app.use("/*", bridgeAuth());

	// ─── Routes ─────────────────────────────────────────────────────────
	app.route("/", healthRoutes(docker));
	app.route("/", stackRoutes(docker, config.projectDir, config.projectName));
	app.route("/", containerRoutes(docker));
	app.route("/", commandRoutes(docker, config.projectDir, config.projectName));
	app.route("/", configRoutes(config.projectDir));

	// ─── Convex Integration ─────────────────────────────────────────────
	let convexSync: ConvexSyncClient | null = null;

	if (config.convexUrl) {
		convexSync = new ConvexSyncClient({
			convexUrl: config.convexUrl,
			fleetInstanceId: config.fleetInstanceId,
			bridgeToken: process.env.BRIDGE_TOKEN,
		});

		// Start heartbeat loop
		startHeartbeat({
			docker,
			projectName: config.projectName,
			projectDir: config.projectDir,
			onHeartbeat: (payload) => convexSync!.pushHeartbeat(payload),
		});
	}

	// Task routes (relay to Convex if configured)
	app.route(
		"/",
		taskRoutes(
			convexSync
				? {
						approveTask: (taskId) => convexSync!.approveTask(taskId),
						dispatchTask: (title, description) => convexSync!.dispatchTask(title, description),
					}
				: null,
		),
	);

	// ─── Global Error Handler ───────────────────────────────────────────
	app.onError((err, c) => {
		console.error("[bridge] Unhandled error:", err);
		return c.json(
			{
				error: {
					code: "INTERNAL_ERROR",
					message: err instanceof Error ? err.message : "Unknown error",
				},
			},
			500,
		);
	});

	// ─── 404 ────────────────────────────────────────────────────────────
	app.notFound((c) => {
		return c.json(
			{ error: { code: "NOT_FOUND", message: `Route not found: ${c.req.method} ${c.req.path}` } },
			404,
		);
	});

	return app;
}
