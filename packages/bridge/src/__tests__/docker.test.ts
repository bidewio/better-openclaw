import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildServiceStatusMap, deriveOverallStatus } from "../../src/heartbeat/service-health.js";
import { verifyBridgeToken } from "../../src/lib/auth.js";
import type { ContainerInfo } from "../../src/lib/docker.js";

// ─── Auth Tests ─────────────────────────────────────────────────────────

describe("verifyBridgeToken", () => {
	it("returns true for matching tokens", () => {
		expect(verifyBridgeToken("abc123", "abc123")).toBe(true);
	});

	it("returns false for mismatched tokens", () => {
		expect(verifyBridgeToken("abc123", "xyz789")).toBe(false);
	});

	it("returns false for undefined provided", () => {
		expect(verifyBridgeToken(undefined, "abc123")).toBe(false);
	});

	it("returns false for undefined expected", () => {
		expect(verifyBridgeToken("abc123", undefined)).toBe(false);
	});

	it("returns false for empty strings", () => {
		expect(verifyBridgeToken("", "")).toBe(false);
	});

	it("returns false for different length tokens", () => {
		expect(verifyBridgeToken("short", "muchlongertoken")).toBe(false);
	});
});

// ─── Service Health Tests ───────────────────────────────────────────────

function makeContainer(overrides: Partial<ContainerInfo> = {}): ContainerInfo {
	return {
		id: "abc123",
		serviceId: "postgresql",
		name: "my-stack-postgresql-1",
		state: "running",
		status: "Up 2 hours (healthy)",
		image: "postgres:17",
		ports: [{ host: 5432, container: 5432, protocol: "tcp" }],
		health: "healthy",
		...overrides,
	};
}

describe("deriveOverallStatus", () => {
	it("returns 'offline' for empty containers", () => {
		expect(deriveOverallStatus([])).toBe("offline");
	});

	it("returns 'online' when all containers are running and healthy", () => {
		const containers = [
			makeContainer({ serviceId: "postgresql" }),
			makeContainer({ serviceId: "redis", health: "none" }),
		];
		expect(deriveOverallStatus(containers)).toBe("online");
	});

	it("returns 'degraded' when some containers are stopped", () => {
		const containers = [
			makeContainer({ serviceId: "postgresql" }),
			makeContainer({ serviceId: "redis", state: "exited", health: "none" }),
		];
		expect(deriveOverallStatus(containers)).toBe("degraded");
	});

	it("returns 'degraded' when a container is unhealthy", () => {
		const containers = [
			makeContainer({ serviceId: "postgresql", health: "unhealthy" }),
			makeContainer({ serviceId: "redis", health: "none" }),
		];
		expect(deriveOverallStatus(containers)).toBe("degraded");
	});

	it("returns 'offline' when all containers are stopped", () => {
		const containers = [
			makeContainer({ serviceId: "postgresql", state: "exited" }),
			makeContainer({ serviceId: "redis", state: "exited" }),
		];
		expect(deriveOverallStatus(containers)).toBe("offline");
	});
});

describe("buildServiceStatusMap", () => {
	it("maps containers to service status objects", () => {
		const containers = [
			makeContainer({ serviceId: "postgresql", state: "running", health: "healthy" }),
			makeContainer({ serviceId: "redis", state: "running", health: "none" }),
		];

		const result = buildServiceStatusMap(containers);
		expect(result).toEqual([
			{ serviceId: "postgresql", state: "running", health: "healthy" },
			{ serviceId: "redis", state: "running", health: "none" },
		]);
	});

	it("returns empty array for no containers", () => {
		expect(buildServiceStatusMap([])).toEqual([]);
	});
});
