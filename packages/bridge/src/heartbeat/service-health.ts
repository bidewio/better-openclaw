import type { ContainerInfo } from "../lib/docker.js";

export type OverallStatus = "online" | "degraded" | "offline";

export interface ServiceStatus {
	serviceId: string;
	state: string;
	health: string;
}

/**
 * Derive overall stack health from container statuses.
 *
 * - "online"   — all containers running + healthy (or no healthcheck)
 * - "degraded" — some running, some not, or unhealthy
 * - "offline"  — no containers running
 */
export function deriveOverallStatus(containers: ContainerInfo[]): OverallStatus {
	if (containers.length === 0) return "offline";

	const running = containers.filter((c) => c.state === "running");

	if (running.length === 0) return "offline";
	if (running.length < containers.length) return "degraded";

	const unhealthy = running.some((c) => c.health === "unhealthy");
	if (unhealthy) return "degraded";

	return "online";
}

/**
 * Build a map of service statuses from container info.
 */
export function buildServiceStatusMap(containers: ContainerInfo[]): ServiceStatus[] {
	return containers.map((c) => ({
		serviceId: c.serviceId,
		state: c.state,
		health: c.health,
	}));
}
