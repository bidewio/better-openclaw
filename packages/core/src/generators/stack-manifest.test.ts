import { describe, expect, it } from "vitest";
import type { GenerationInput, ResolverOutput } from "../types.js";
import { generateStackManifest, type StackManifest } from "./stack-manifest.js";

function parseManifest(files: Record<string, string>): StackManifest {
	const content = files["stack-manifest.json"];
	if (!content) {
		throw new Error("Missing stack-manifest.json");
	}
	return JSON.parse(content) as StackManifest;
}

function makeResolved(serviceIds: string[]): ResolverOutput {
	return {
		services: serviceIds.map((id) => ({
			definition: {
				id,
				name: id.charAt(0).toUpperCase() + id.slice(1),
				description: `${id} service`,
				icon: "📦",
				category: "test",
				image: `${id}:latest`,
				imageTag: "latest",
				ports: [{ container: 8080, host: 8080, exposed: true, description: `${id} port` }],
				volumes: [],
				environment: [],
				dependencies: [],
				conflicts: [],
				skills: [],
				memoryMB: 256,
				docsUrl: `https://docs.example.com/${id}`,
			},
			addedBy: "user" as const,
		})),
		addedDependencies: [],
		estimatedMemoryMB: 512,
	} as unknown as ResolverOutput;
}

const baseInput: GenerationInput = {
	projectName: "test-stack",
	services: ["redis"],
	skillPacks: [],
	proxy: "caddy",
	domain: "example.com",
	gpu: false,
	platform: "linux/amd64",
	deployment: "local",
	generateSecrets: true,
	openclawVersion: "latest",
} as unknown as GenerationInput;

describe("generateStackManifest", () => {
	it("returns a single file: stack-manifest.json", () => {
		const files = generateStackManifest(makeResolved(["redis"]), baseInput);
		expect(Object.keys(files)).toEqual(["stack-manifest.json"]);
	});

	it("produces valid JSON", () => {
		const files = generateStackManifest(makeResolved(["redis"]), baseInput);
		const manifest = parseManifest(files);
		expect(manifest).toBeDefined();
	});

	it("includes format version", () => {
		const files = generateStackManifest(makeResolved(["redis"]), baseInput);
		const manifest = parseManifest(files);
		expect(manifest.formatVersion).toBe("1");
	});

	it("includes project name from input", () => {
		const files = generateStackManifest(makeResolved(["redis"]), baseInput);
		const manifest = parseManifest(files);
		expect(manifest.projectName).toBe("test-stack");
	});

	it("includes deployment configuration", () => {
		const files = generateStackManifest(makeResolved(["redis"]), baseInput);
		const manifest = parseManifest(files);
		expect(manifest.deployment).toBe("local");
		expect(manifest.proxy).toBe("caddy");
		expect(manifest.domain).toBe("example.com");
	});

	it("lists all services with correct structure", () => {
		const files = generateStackManifest(makeResolved(["redis", "postgresql"]), baseInput);
		const manifest = parseManifest(files);
		expect(manifest.services).toHaveLength(2);
		for (const svc of manifest.services) {
			expect(svc).toHaveProperty("id");
			expect(svc).toHaveProperty("name");
			expect(svc).toHaveProperty("category");
			expect(svc).toHaveProperty("ports");
			expect(svc).toHaveProperty("docsUrl");
			expect(svc).toHaveProperty("addedBy");
		}
	});

	it("includes metadata with service count", () => {
		const files = generateStackManifest(makeResolved(["redis", "postgresql"]), baseInput);
		const manifest = parseManifest(files);
		expect(manifest.metadata.serviceCount).toBe(2);
	});

	it("includes generatedAt timestamp", () => {
		const files = generateStackManifest(makeResolved(["redis"]), baseInput);
		const manifest = parseManifest(files);
		expect(manifest.generatedAt).toBeDefined();
		// Should be ISO 8601
		expect(() => new Date(manifest.generatedAt)).not.toThrow();
	});
});
