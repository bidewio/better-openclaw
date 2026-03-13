import { describe, expect, it } from "vitest";
import { resolve } from "./resolver.js";
import { getAllServices, getServiceById } from "./services/registry.js";
import {
	checkCompatibility,
	getImageReference,
	getImageTag,
	pinImageTags,
} from "./version-manager.js";

describe("getImageTag", () => {
	it("returns the tag for a known service", () => {
		const tag = getImageTag("redis");
		expect(tag).toBeDefined();
		expect(typeof tag).toBe("string");
	});

	it("returns undefined for an unknown service", () => {
		expect(getImageTag("nonexistent-service-xyz")).toBeUndefined();
	});
});

describe("getImageReference", () => {
	it("returns image:tag for a known service", () => {
		const ref = getImageReference("redis");
		expect(ref).toBeDefined();
		expect(ref).toContain(":");
		expect(ref).toMatch(/^.+:.+$/);
	});

	it("returns undefined for an unknown service", () => {
		expect(getImageReference("nonexistent-service-xyz")).toBeUndefined();
	});
});

describe("pinImageTags", () => {
	it("pins image tags from the registry for all services", () => {
		const resolved = resolve({
			services: ["redis", "postgresql"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
		});

		const pinned = pinImageTags(resolved);

		expect(pinned.services).toHaveLength(resolved.services.length);

		for (const svc of pinned.services) {
			// Git-based services (e.g., mission-control) don't have imageTag
			if (svc.definition.gitSource) continue;
			expect(svc.definition.imageTag).toBeDefined();
			expect(typeof svc.definition.imageTag).toBe("string");
			expect(svc.definition.imageTag?.length).toBeGreaterThan(0);
		}
	});

	it("does not mutate the original resolved output", () => {
		const resolved = resolve({
			services: ["redis"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
		});

		const redis = resolved.services.find((s) => s.definition.id === "redis");
		const originalTag = redis?.definition.imageTag;
		pinImageTags(resolved);

		const redisAfter = resolved.services.find((s) => s.definition.id === "redis");
		expect(redisAfter?.definition.imageTag).toBe(originalTag);
	});

	it("preserves non-tag properties", () => {
		const resolved = resolve({
			services: ["redis"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
		});

		const pinned = pinImageTags(resolved);
		const redis = pinned.services.find((s) => s.definition.id === "redis");
		expect(redis).toBeDefined();
		expect(redis?.definition.name).toBe("Redis");
		expect(pinned.estimatedMemoryMB).toBe(resolved.estimatedMemoryMB);
	});
});

describe("checkCompatibility", () => {
	it("warns when Redis and Valkey are both selected", () => {
		const all = getAllServices();
		const redis = all.find((s) => s.id === "redis");
		const valkey = all.find((s) => s.id === "valkey");

		if (redis && valkey) {
			const warnings = checkCompatibility([redis, valkey]);
			expect(
				warnings.some((w) => w.message.includes("Redis") && w.message.includes("Valkey")),
			).toBe(true);
		}
	});

	it("warns when Caddy and Traefik are both selected", () => {
		const all = getAllServices();
		const caddy = all.find((s) => s.id === "caddy");
		const traefik = all.find((s) => s.id === "traefik");

		if (caddy && traefik) {
			const warnings = checkCompatibility([caddy, traefik]);
			expect(
				warnings.some((w) => w.message.includes("Caddy") && w.message.includes("Traefik")),
			).toBe(true);
		}
	});

	it("warns about multiple vector databases", () => {
		const all = getAllServices();
		const qdrant = all.find((s) => s.id === "qdrant");
		const chromadb = all.find((s) => s.id === "chromadb");

		if (qdrant && chromadb) {
			const warnings = checkCompatibility([qdrant, chromadb]);
			expect(warnings.some((w) => w.message.includes("vector database"))).toBe(true);
		}
	});

	it("warns about GPU services", () => {
		const all = getAllServices();
		const gpuService = all.find((s) => s.gpuRequired);

		if (gpuService) {
			const warnings = checkCompatibility([gpuService]);
			expect(warnings.some((w) => w.message.includes("GPU"))).toBe(true);
		}
	});

	it("returns no warnings for a single non-conflicting service", () => {
		const redis = getServiceById("redis");
		if (redis) {
			const warnings = checkCompatibility([redis]);
			expect(
				warnings.filter((w) => w.type === "compatibility" && !w.message.includes("GPU")),
			).toHaveLength(0);
		}
	});
});
