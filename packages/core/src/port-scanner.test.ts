import { describe, expect, it, vi } from "vitest";
import { formatPortConflicts, scanPortConflicts } from "./port-scanner.js";
import type { ServiceDefinition } from "./types.js";

/**
 * Tests for port scanner conflict detection and reassignment.
 *
 * We mock isPortAvailable via vi.mock to avoid actual port scanning
 * during tests. The focus is on the conflict detection logic.
 */

// Mock the internal isPortAvailable to control port availability
vi.mock("node:net", () => {
	const portsInUse = new Set([80, 443, 3000]);

	return {
		default: {
			Socket: class MockSocket {
				connect(port: number) {
					// Simulate: ports in portsInUse are "in use"
					setTimeout(() => {
						if (portsInUse.has(port)) {
							(this as any).connectCb?.();
						} else {
							(this as any).errorCb?.();
						}
					}, 1);
				}
				once(event: string, cb: () => void) {
					if (event === "connect") (this as any).connectCb = cb;
					if (event === "error") (this as any).errorCb = cb;
					if (event === "timeout") (this as any).timeoutCb = cb;
				}
				setTimeout() {}
				removeAllListeners() {}
				destroy() {}
			},
			createServer() {
				return {
					once(event: string, cb: (err?: Error) => void) {
						if (event === "error") (this as any).errorCb = cb;
					},
					listen(_port: number, _host: string, cb: () => void) {
						cb();
					},
					close(cb: () => void) {
						cb();
					},
				};
			},
		},
	};
});

function makeService(
	id: string,
	ports: { host: number; container: number; exposed: boolean; description: string }[],
): ServiceDefinition {
	return {
		id,
		name: id,
		description: `${id} service`,
		icon: "",
		category: "test",
		image: `${id}:latest`,
		ports,
		volumes: [],
		environment: [],
		dependencies: [],
		conflicts: [],
		skills: [],
		memoryMB: 256,
		docsUrl: "",
	} as ServiceDefinition;
}

describe("formatPortConflicts", () => {
	it("returns empty array when no reassignments", () => {
		const services = [
			makeService("redis", [{ host: 6379, container: 6379, exposed: true, description: "Redis" }]),
		];
		const reassignments = new Map();
		const conflicts = formatPortConflicts(services, reassignments);
		expect(conflicts).toEqual([]);
	});

	it("returns conflicts with suggested ports", () => {
		const services = [
			makeService("redis", [{ host: 6379, container: 6379, exposed: true, description: "Redis" }]),
		];
		const reassignments = new Map([["redis", new Map([[6379, 7379]])]]);
		const conflicts = formatPortConflicts(services, reassignments);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]).toEqual({
			port: 6379,
			serviceId: "redis",
			description: "Redis",
			suggestedPort: 7379,
		});
	});

	it("handles multiple services with multiple port reassignments", () => {
		const services = [
			makeService("web", [
				{ host: 80, container: 80, exposed: true, description: "HTTP" },
				{ host: 443, container: 443, exposed: true, description: "HTTPS" },
			]),
			makeService("api", [{ host: 8080, container: 8080, exposed: true, description: "API" }]),
		];
		const reassignments = new Map([
			[
				"web",
				new Map([
					[80, 1080],
					[443, 1443],
				]),
			],
		]);
		const conflicts = formatPortConflicts(services, reassignments);
		expect(conflicts).toHaveLength(2);
		expect(conflicts[0]!.port).toBe(80);
		expect(conflicts[0]!.suggestedPort).toBe(1080);
		expect(conflicts[1]!.port).toBe(443);
		expect(conflicts[1]!.suggestedPort).toBe(1443);
	});

	it("uses service name as fallback when port has no description", () => {
		const services = [
			makeService("myapp", [{ host: 9000, container: 9000, exposed: true, description: "" }]),
		];
		const reassignments = new Map([["myapp", new Map([[9000, 10000]])]]);
		const conflicts = formatPortConflicts(services, reassignments);
		expect(conflicts[0]!.description).toBe("myapp port");
	});
});

describe("scanPortConflicts", () => {
	it("returns empty map for services with no ports", async () => {
		const services = [makeService("redis", [])];
		const result = await scanPortConflicts(services);
		expect(result.size).toBe(0);
	});

	it("returns empty map for services with no exposed ports", async () => {
		const services = [
			makeService("redis", [{ host: 6379, container: 6379, exposed: false, description: "Redis" }]),
		];
		const result = await scanPortConflicts(services);
		expect(result.size).toBe(0);
	});

	it("detects inter-service port conflicts", async () => {
		// Two services claiming the same host port
		const services = [
			makeService("web1", [{ host: 8080, container: 80, exposed: true, description: "HTTP" }]),
			makeService("web2", [{ host: 8080, container: 80, exposed: true, description: "HTTP" }]),
		];
		const result = await scanPortConflicts(services);

		// First service wins, second gets reassigned
		expect(result.has("web1")).toBe(false); // web1 keeps its port
		expect(result.has("web2")).toBe(true); // web2 gets reassigned
		const web2Reassignments = result.get("web2")!;
		expect(web2Reassignments.has(8080)).toBe(true);
		expect(web2Reassignments.get(8080)).toBeGreaterThan(8080);
	});
});
