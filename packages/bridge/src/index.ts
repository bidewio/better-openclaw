import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const PORT = Number(process.env.BRIDGE_PORT ?? "3457");
const PROJECT_NAME = process.env.PROJECT_NAME ?? "better-openclaw";
const PROJECT_DIR = process.env.PROJECT_DIR ?? "/project";
const DOCKER_SOCKET = process.env.DOCKER_SOCKET ?? "/var/run/docker.sock";
const CONVEX_URL = process.env.CONVEX_URL;
const FLEET_INSTANCE_ID = process.env.FLEET_INSTANCE_ID;

const app = createApp({
	projectName: PROJECT_NAME,
	projectDir: PROJECT_DIR,
	dockerSocketPath: DOCKER_SOCKET,
	convexUrl: CONVEX_URL,
	fleetInstanceId: FLEET_INSTANCE_ID,
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
	console.log(`[bridge] Stack management sidecar running on http://localhost:${info.port}`);
	console.log(`[bridge] Project: ${PROJECT_NAME} | Dir: ${PROJECT_DIR}`);
	if (CONVEX_URL) {
		console.log(`[bridge] Convex sync: ${CONVEX_URL}`);
	} else {
		console.log("[bridge] Convex sync: disabled (CONVEX_URL not set)");
	}
});
