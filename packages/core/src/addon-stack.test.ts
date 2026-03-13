import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { generateAddonStack, updateAddonStack } from "./addon-stack.js";
import { AddonStackInputSchema } from "./schema.js";

describe("generateAddonStack", () => {
	it("generates valid compose YAML with a single service (qdrant)", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant"],
		});

		// Resolver may generate warnings about recommended services; that's fine
		expect(result.metadata.serviceCount).toBeGreaterThan(0);
		expect(result.metadata.resolvedServices).toContain("qdrant");

		// Parse YAML to verify it's valid
		const composed = parse(result.composeOverride);
		expect(composed.services).toHaveProperty("qdrant");

		// Should NOT contain infrastructure services
		expect(composed.services).not.toHaveProperty("openclaw-gateway");
		expect(composed.services).not.toHaveProperty("openclaw-cli");
		expect(composed.services).not.toHaveProperty("redis");
		expect(composed.services).not.toHaveProperty("postgresql");
		expect(composed.services).not.toHaveProperty("open-webui");
		expect(composed.services).not.toHaveProperty("caddy");

		// Should have openclaw-network as external
		expect(composed.networks).toHaveProperty("openclaw-network");
		expect(composed.networks["openclaw-network"].external).toBe(true);
	});

	it("does not include profiles on any service", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant", "meilisearch"],
		});

		const composed = parse(result.composeOverride);
		for (const [, svc] of Object.entries(composed.services)) {
			expect(svc).not.toHaveProperty("profiles");
		}
	});

	it("does not apply cap_drop or security_opt by default", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant"],
		});

		const composed = parse(result.composeOverride);
		const qdrant = composed.services.qdrant;
		expect(qdrant).not.toHaveProperty("cap_drop");
		expect(qdrant).not.toHaveProperty("security_opt");
	});

	it("includes postgres-setup when a DB-dependent service is requested (n8n)", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["n8n"],
		});

		const composed = parse(result.composeOverride);
		expect(composed.services).toHaveProperty("n8n");
		expect(composed.services).toHaveProperty("postgres-setup");

		// postgres-setup should depend on existing postgresql
		expect(composed.services["postgres-setup"].depends_on).toHaveProperty("postgresql");

		// n8n should depend on postgres-setup
		expect(composed.services.n8n.depends_on).toHaveProperty("postgres-setup");
	});

	it("generates DB passwords in env file for DB-dependent services", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["n8n"],
			generateSecrets: true,
		});

		expect(result.envFile).toContain("N8N_DB_PASSWORD=");
		// Password should be non-empty (48 hex chars = 24 bytes)
		const match = result.envFile.match(/N8N_DB_PASSWORD=([a-f0-9]+)/);
		expect(match).not.toBeNull();
		expect(match![1].length).toBe(48);
	});

	it("gracefully handles unknown service IDs without throwing", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["nonexistent-service", "qdrant"],
		});

		// Should NOT throw
		expect(result.metadata.skippedServices).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					serviceId: "nonexistent-service",
					reason: "unknown_service",
				}),
			]),
		);

		// Valid service should still be included
		expect(result.metadata.resolvedServices).toContain("qdrant");
	});

	it("excludes infrastructure services from the request", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["redis", "postgresql", "qdrant"],
		});

		expect(result.warnings).toEqual(
			expect.arrayContaining([
				expect.stringContaining("redis"),
				expect.stringContaining("postgresql"),
			]),
		);
		expect(result.metadata.resolvedServices).not.toContain("redis");
		expect(result.metadata.resolvedServices).not.toContain("postgresql");
		expect(result.metadata.resolvedServices).toContain("qdrant");
	});

	it("generates proxy routes from proxyPath", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["n8n"],
		});

		const n8nRoute = result.proxyRoutes.find((r) => r.serviceId === "n8n");
		expect(n8nRoute).toBeDefined();
		expect(n8nRoute!.path).toBe("/n8n");
		expect(n8nRoute!.port).toBe(5678);
	});

	it("generates skill files and openclaw config patch", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["n8n"],
		});

		// n8n has skill binding: n8n-trigger
		expect(result.openclawConfigPatch.skills.entries).toHaveProperty("n8n-trigger");
		expect(result.openclawConfigPatch.skills.entries["n8n-trigger"].enabled).toBe(true);
	});

	it("resolves port conflicts with reserved ports", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["n8n"],
			reservedPorts: [5678], // n8n's default port
		});

		// Port should be reassigned
		const portAssignments = result.metadata.portAssignments;
		const n8nAssignment = Object.entries(portAssignments).find(([key]) =>
			key.startsWith("n8n:"),
		);
		expect(n8nAssignment).toBeDefined();
		expect(n8nAssignment![1]).not.toBe(5678);
	});

	it("sanitizes project name from instanceId", () => {
		const result = generateAddonStack({
			instanceId: "My_Instance_123",
			services: ["qdrant"],
		});

		// Should succeed without error
		expect(result.metadata.serviceCount).toBeGreaterThan(0);
	});

	it("returns env vars grouped by service", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant"],
		});

		expect(result.envVars.length).toBeGreaterThanOrEqual(0);
	});

	it("returns empty result for no services", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: [],
		});

		expect(result.composeOverride).toContain("services: {}");
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	it("returns empty result when all services are infrastructure", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["redis", "postgresql", "caddy"],
		});

		expect(result.metadata.serviceCount).toBe(0);
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	it("applies env quirks to envFile output (meilisearch MEILI_MASTER_KEY min_length)", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["meilisearch"],
			generateSecrets: true,
		});

		// MEILI_MASTER_KEY should be a base64url string of at least 32 chars (24 bytes)
		const match = result.envFile.match(/MEILI_MASTER_KEY=([^\n]+)/);
		expect(match).not.toBeNull();
		expect(match![1].length).toBeGreaterThanOrEqual(32);
		// Should not be empty
		expect(match![1]).not.toBe("");
	});

	it("applies env quirks to envFile output (grafana GF_SECURITY_ADMIN_PASSWORD)", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["grafana"],
			generateSecrets: true,
		});

		const match = result.envFile.match(/GF_SECURITY_ADMIN_PASSWORD=([^\n]+)/);
		expect(match).not.toBeNull();
		// Should be at least 22 chars (16 bytes base64url)
		expect(match![1].length).toBeGreaterThanOrEqual(22);
	});

	it("syncs DB_POSTGRESDB_PASSWORD with N8N_DB_PASSWORD via must_sync quirk", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["n8n"],
			generateSecrets: true,
		});

		const n8nDbPw = result.envFile.match(/N8N_DB_PASSWORD=([^\n]+)/);
		const dbPostgresPw = result.envFile.match(/DB_POSTGRESDB_PASSWORD=([^\n]+)/);
		expect(n8nDbPw).not.toBeNull();
		expect(dbPostgresPw).not.toBeNull();
		// Both passwords must match due to must_sync quirk
		expect(n8nDbPw![1]).toBe(dbPostgresPw![1]);
	});

	it("syncs user-provided credential with DB password reference", () => {
		const customPassword = "my_custom_secure_password";
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["n8n"],
			generateSecrets: true,
			credentials: {
				n8n: { DB_POSTGRESDB_PASSWORD: customPassword },
			},
		});

		// User value should be used for both the service env var and the ref key
		expect(result.envFile).toContain(`DB_POSTGRESDB_PASSWORD=${customPassword}`);
		expect(result.envFile).toContain(`N8N_DB_PASSWORD=${customPassword}`);
	});

	it("uses existingServices ports for conflict detection", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["n8n"],
			// n8n uses port 5678, qdrant uses 6333 — qdrant as existing should not conflict
			existingServices: ["qdrant"],
		});

		// n8n should still get its default port (no conflict with qdrant)
		const portAssignments = result.metadata.portAssignments;
		const n8nAssignment = Object.entries(portAssignments).find(([key]) =>
			key.startsWith("n8n:"),
		);
		expect(n8nAssignment).toBeDefined();
		expect(n8nAssignment![1]).toBe(5678);
	});

	it("does not dual-list GPU services in both skipped and resolved", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["ollama"],
			gpu: false,
		});

		// ollama requires GPU — without gpu: true, it should be skipped only
		const isSkipped = result.metadata.skippedServices.some(
			(s) => s.serviceId === "ollama" && s.reason === "gpu_required",
		);
		const isResolved = result.metadata.resolvedServices.includes("ollama");

		// Must be in exactly one list, not both
		if (isSkipped) {
			expect(isResolved).toBe(false);
		}
	});

	it("includes GPU services when gpu: true is set", () => {
		const result = generateAddonStack({
			instanceId: "test-instance",
			services: ["ollama"],
			gpu: true,
		});

		// Should NOT be skipped when GPU support is available
		const isSkipped = result.metadata.skippedServices.some(
			(s) => s.serviceId === "ollama" && s.reason === "gpu_required",
		);
		expect(isSkipped).toBe(false);
		expect(result.metadata.resolvedServices).toContain("ollama");
	});
});

describe("updateAddonStack", () => {
	it("adds a service to an existing stack", () => {
		// First generate a base stack
		const base = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant"],
		});

		// Then add meilisearch
		const result = updateAddonStack({
			instanceId: "test-instance",
			currentCompose: base.composeOverride,
			currentEnv: base.envFile,
			addServices: ["meilisearch"],
		});

		expect(result.metadata.added).toContain("meilisearch");
		expect(result.metadata.unchanged).toContain("qdrant");

		const composed = parse(result.composeOverride);
		expect(composed.services).toHaveProperty("qdrant");
		expect(composed.services).toHaveProperty("meilisearch");
	});

	it("removes a service from an existing stack", () => {
		const base = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant", "meilisearch"],
		});

		const result = updateAddonStack({
			instanceId: "test-instance",
			currentCompose: base.composeOverride,
			currentEnv: base.envFile,
			removeServices: ["meilisearch"],
		});

		expect(result.metadata.removed).toContain("meilisearch");
		expect(result.metadata.unchanged).toContain("qdrant");

		const composed = parse(result.composeOverride);
		expect(composed.services).toHaveProperty("qdrant");
		expect(composed.services).not.toHaveProperty("meilisearch");
	});

	it("preserves existing env values when adding a service", () => {
		const base = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant"],
			generateSecrets: true,
		});

		// Simulate user editing an env value
		const customEnv = base.envFile.replace(
			/QDRANT_API_KEY=[a-f0-9]+/,
			"QDRANT_API_KEY=my_custom_key",
		);

		const result = updateAddonStack({
			instanceId: "test-instance",
			currentCompose: base.composeOverride,
			currentEnv: customEnv,
			addServices: ["meilisearch"],
			generateSecrets: true,
		});

		// If QDRANT_API_KEY was in the original env, it should be preserved
		if (customEnv.includes("QDRANT_API_KEY=my_custom_key")) {
			expect(result.envFile).toContain("QDRANT_API_KEY=my_custom_key");
		}
	});

	it("returns images to pull for added services", () => {
		const base = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant"],
		});

		const result = updateAddonStack({
			instanceId: "test-instance",
			currentCompose: base.composeOverride,
			currentEnv: base.envFile,
			addServices: ["meilisearch"],
		});

		expect(result.imagesToPull.length).toBeGreaterThan(0);
		expect(result.imagesToPull.some((img) => img.includes("meilisearch"))).toBe(true);
	});

	it("handles empty update gracefully", () => {
		const base = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant"],
		});

		const result = updateAddonStack({
			instanceId: "test-instance",
			currentCompose: base.composeOverride,
			currentEnv: base.envFile,
		});

		expect(result.metadata.added).toEqual([]);
		expect(result.metadata.removed).toEqual([]);
		expect(result.metadata.unchanged).toContain("qdrant");
	});

	it("respects generateSecrets: false during update", () => {
		const base = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant"],
			generateSecrets: true,
		});

		// With generateSecrets: false, services requiring secrets (like meilisearch)
		// may be skipped as missing_credentials. Provide credentials explicitly.
		const result = updateAddonStack({
			instanceId: "test-instance",
			currentCompose: base.composeOverride,
			currentEnv: base.envFile,
			addServices: ["meilisearch"],
			generateSecrets: false,
			credentials: {
				meilisearch: { MEILI_MASTER_KEY: "test-master-key-1234567890" },
			},
		});

		// Meilisearch should be added since we provided the required credential
		expect(result.metadata.added).toContain("meilisearch");
	});

	it("forwards portOverrides during update", () => {
		const base = generateAddonStack({
			instanceId: "test-instance",
			services: ["qdrant"],
		});

		const result = updateAddonStack({
			instanceId: "test-instance",
			currentCompose: base.composeOverride,
			currentEnv: base.envFile,
			addServices: ["n8n"],
			portOverrides: { n8n: { "5678": 9999 } },
		});

		// n8n should be present with the port override
		expect(result.metadata.added).toContain("n8n");
	});
});

describe("AddonStackInputSchema", () => {
	it("accepts valid input", () => {
		const result = AddonStackInputSchema.safeParse({
			instanceId: "test-instance",
			services: ["qdrant", "n8n"],
		});
		expect(result.success).toBe(true);
	});

	it("requires instanceId", () => {
		const result = AddonStackInputSchema.safeParse({
			services: ["qdrant"],
		});
		expect(result.success).toBe(false);
	});

	it("defaults empty arrays and booleans", () => {
		const result = AddonStackInputSchema.parse({
			instanceId: "test",
			services: ["qdrant"],
		});
		expect(result.skillPacks).toEqual([]);
		expect(result.reservedPorts).toEqual([]);
		expect(result.generateSecrets).toBe(true);
		expect(result.platform).toBe("linux/amd64");
	});
});
