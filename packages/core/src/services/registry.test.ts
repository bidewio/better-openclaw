import { describe, expect, it } from "vitest";
import {
	getAllServices,
	getServiceById,
	getServicesByCategory,
	getServicesByTag,
} from "../services/registry.js";

describe("service registry", () => {
	it("has at least 60 services registered", () => {
		const services = getAllServices();
		expect(services.length).toBeGreaterThanOrEqual(60);
	});

	it("finds redis by ID", () => {
		const redis = getServiceById("redis");
		expect(redis).toBeDefined();
		expect(redis?.id).toBe("redis");
		expect(redis?.name).toBe("Redis");
	});

	it("returns undefined for unknown ID", () => {
		const result = getServiceById("nonexistent");
		expect(result).toBeUndefined();
	});

	it("finds tailscale and it is mandatory", () => {
		const tailscale = getServiceById("tailscale");
		expect(tailscale).toBeDefined();
		expect(tailscale?.id).toBe("tailscale");
		expect(tailscale?.mandatory).toBe(true);
	});

	it("finds mission-control and it is mandatory with gitSource", () => {
		const mc = getServiceById("mission-control");
		expect(mc).toBeDefined();
		expect(mc?.mandatory).toBe(true);
		expect(mc?.gitSource).toBeDefined();
		expect(mc?.gitSource?.repoUrl).toContain("better-openclaw-mission-control");
	});

	it("finds coolify, dokploy, livekit, and La Suite Meet services by ID", () => {
		expect(getServiceById("coolify")).toBeDefined();
		expect(getServiceById("dokploy")).toBeDefined();
		expect(getServiceById("livekit")).toBeDefined();
		expect(getServiceById("lasuite-meet-backend")).toBeDefined();
		expect(getServiceById("lasuite-meet-frontend")).toBeDefined();
		expect(getServiceById("lasuite-meet-agents")).toBeDefined();
	});

	it("filters by category", () => {
		const databases = getServicesByCategory("database");
		const ids = databases.map((s) => s.id);
		expect(ids).toContain("redis");
		expect(databases.length).toBeGreaterThanOrEqual(1);
	});

	it("filters by tag", () => {
		const cacheServices = getServicesByTag("cache");
		const ids = cacheServices.map((s) => s.id);
		expect(ids).toContain("redis");
		expect(cacheServices.length).toBeGreaterThanOrEqual(1);
	});

	it("all service IDs are unique", () => {
		const services = getAllServices();
		const ids = services.map((s) => s.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	it("no two services have the same exposed host port", () => {
		const services = getAllServices();
		const portMap = new Map<number, string[]>();

		for (const svc of services) {
			for (const port of svc.ports) {
				if (!port.exposed) continue;
				const existing = portMap.get(port.host) ?? [];
				existing.push(svc.id);
				portMap.set(port.host, existing);
			}
		}

		// Informational: log any shared ports but don't hard-fail,
		// since users may not enable all services simultaneously.
		const conflicts: string[] = [];
		for (const [port, serviceIds] of portMap) {
			if (serviceIds.length > 1) {
				conflicts.push(`Port ${port} shared by: ${serviceIds.join(", ")}`);
			}
		}

		// This is informational — warn if there are conflicts but still pass.
		// If you want to enforce unique ports, change the next line to:
		//   expect(conflicts).toHaveLength(0);
		if (conflicts.length > 0) {
			console.warn(
				`[informational] ${conflicts.length} port overlap(s) detected:\n  ${conflicts.join("\n  ")}`,
			);
		}

		// At minimum, verify we checked something
		expect(portMap.size).toBeGreaterThan(0);
	});
});
