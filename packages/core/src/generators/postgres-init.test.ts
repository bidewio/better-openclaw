import { describe, expect, it } from "vitest";
import type { ResolverOutput } from "../types.js";
import { generatePostgresInit, getDbRequirements } from "./postgres-init.js";

function makeResolved(serviceIds: string[]): ResolverOutput {
	return {
		services: serviceIds.map((id) => ({
			definition: {
				id,
				name: id.charAt(0).toUpperCase() + id.slice(1),
				description: "",
				icon: "",
				category: "test",
				image: `${id}:latest`,
				ports: [],
				volumes: [],
				environment: [],
				dependencies: [],
				conflicts: [],
				skills: [],
				memoryMB: 256,
				docsUrl: "",
			},
			addedBy: "user" as const,
		})),
		addedDependencies: [],
		estimatedMemoryMB: 512,
	} as unknown as ResolverOutput;
}

describe("getDbRequirements", () => {
	it("returns empty array when no services need a DB", () => {
		const resolved = makeResolved(["redis", "minio"]);
		expect(getDbRequirements(resolved)).toEqual([]);
	});

	it("returns requirements for n8n", () => {
		const resolved = makeResolved(["n8n", "redis"]);
		const reqs = getDbRequirements(resolved);
		expect(reqs).toHaveLength(1);
		expect(reqs[0]).toEqual({
			serviceId: "n8n",
			serviceName: "N8n",
			dbName: "n8n",
			dbUser: "n8n",
			passwordEnvVar: "N8N_DB_PASSWORD",
		});
	});

	it("returns requirements for multiple services", () => {
		const resolved = makeResolved(["n8n", "outline", "postiz", "redis"]);
		const reqs = getDbRequirements(resolved);
		expect(reqs).toHaveLength(3);
		const ids = reqs.map((r) => r.serviceId);
		expect(ids).toContain("n8n");
		expect(ids).toContain("outline");
		expect(ids).toContain("postiz");
	});
});

describe("generatePostgresInit", () => {
	it("returns null when PostgreSQL is not in the stack", () => {
		const resolved = makeResolved(["n8n", "redis"]);
		expect(generatePostgresInit(resolved)).toBeNull();
	});

	it("returns null when PostgreSQL is present but no services need DBs", () => {
		const resolved = makeResolved(["postgresql", "redis", "minio"]);
		expect(generatePostgresInit(resolved)).toBeNull();
	});

	it("generates init script when PostgreSQL and DB-needing services are present", () => {
		const resolved = makeResolved(["postgresql", "n8n"]);
		const script = generatePostgresInit(resolved);
		expect(script).not.toBeNull();
		expect(script).toContain("#!/bin/bash");
		expect(script).toContain("create_db_and_user");
		expect(script).toContain('"n8n"');
		expect(script).toContain("N8N_DB_PASSWORD");
	});

	it("includes all services that need DBs", () => {
		const resolved = makeResolved(["postgresql", "n8n", "outline", "dify"]);
		const script = generatePostgresInit(resolved)!;
		expect(script).toContain('"n8n"');
		expect(script).toContain('"outline"');
		expect(script).toContain('"dify"');
	});

	it("uses environment variable substitution for passwords (not literals)", () => {
		const resolved = makeResolved(["postgresql", "n8n"]);
		const script = generatePostgresInit(resolved)!;
		// Passwords should be referenced as env vars, not hardcoded
		expect(script).toContain("${N8N_DB_PASSWORD:-$POSTGRES_PASSWORD}");
	});

	it("script uses psql with ON_ERROR_STOP", () => {
		const resolved = makeResolved(["postgresql", "n8n"]);
		const script = generatePostgresInit(resolved)!;
		expect(script).toContain("ON_ERROR_STOP=1");
	});

	it("script creates user with IF NOT EXISTS check", () => {
		const resolved = makeResolved(["postgresql", "n8n"]);
		const script = generatePostgresInit(resolved)!;
		expect(script).toContain("IF NOT EXISTS");
		expect(script).toContain("CREATE ROLE");
	});

	it("includes service names in summary line", () => {
		const resolved = makeResolved(["postgresql", "n8n", "outline"]);
		const script = generatePostgresInit(resolved)!;
		expect(script).toContain("N8n");
		expect(script).toContain("Outline");
	});
});
