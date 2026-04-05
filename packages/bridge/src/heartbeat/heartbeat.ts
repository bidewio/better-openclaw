import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DockerClient } from "../lib/docker.js";
import { buildServiceStatusMap, deriveOverallStatus } from "./service-health.js";

const HEARTBEAT_INTERVAL_MS = 30_000;

export interface HeartbeatConfig {
	docker: DockerClient;
	projectName: string;
	projectDir: string;
	/** Callback to push status to Convex (or any other backend). */
	onHeartbeat: (payload: HeartbeatPayload) => Promise<void>;
}

export interface HeartbeatPayload {
	status: string;
	serviceStatuses: string;
	configHash: string;
}

/**
 * Compute a hash of the .env + docker-compose.yml for config drift detection.
 */
function computeConfigHash(projectDir: string): string {
	const hash = createHash("sha256");

	const envPath = join(projectDir, ".env");
	if (existsSync(envPath)) {
		hash.update(readFileSync(envPath, "utf-8"));
	}

	const composePath = join(projectDir, "docker-compose.yml");
	if (existsSync(composePath)) {
		hash.update(readFileSync(composePath, "utf-8"));
	}

	return hash.digest("hex").slice(0, 16);
}

/**
 * Start the periodic heartbeat loop.
 * Returns a cleanup function to stop the interval.
 */
export function startHeartbeat(config: HeartbeatConfig): () => void {
	const tick = async () => {
		try {
			const containers = await config.docker.listProjectContainers(
				config.projectName,
			);
			const serviceStatuses = buildServiceStatusMap(containers);
			const status = deriveOverallStatus(containers);
			const configHash = computeConfigHash(config.projectDir);

			await config.onHeartbeat({
				status,
				serviceStatuses: JSON.stringify(serviceStatuses),
				configHash,
			});
		} catch (err) {
			console.error(
				"[bridge:heartbeat] Failed to report status:",
				err instanceof Error ? err.message : err,
			);
		}
	};

	// Run immediately, then on interval
	void tick();
	const interval = setInterval(() => void tick(), HEARTBEAT_INTERVAL_MS);

	return () => clearInterval(interval);
}
