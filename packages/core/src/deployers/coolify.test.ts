import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests for Coolify deployer utility functions and deploy orchestration.
 *
 * We mock `fetch` to simulate Coolify API responses and test the
 * multi-step deployment flow without making real HTTP requests.
 */

// Inline the utility functions for direct testing
function hashString(str: string) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return hash;
}

function parseEnvContent(envContent?: string) {
	if (!envContent) return [];
	const result = [];
	for (const line of envContent.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const idx = trimmed.indexOf("=");
		if (idx <= 0) continue;
		const key = trimmed.slice(0, idx);
		const value = trimmed.slice(idx + 1);
		result.push({ key, value, is_preview: false, is_build_time: false, is_literal: true });
	}
	return result;
}

describe("hashString", () => {
	it("returns 0 for empty string", () => {
		expect(hashString("")).toBe(0);
	});

	it("returns same hash for same input", () => {
		expect(hashString("hello")).toBe(hashString("hello"));
	});

	it("returns different hash for different input", () => {
		expect(hashString("hello")).not.toBe(hashString("world"));
	});

	it("detects compose changes", () => {
		const v1 = "version: '3'\nservices:\n  redis:\n    image: redis:7";
		const v2 = "version: '3'\nservices:\n  redis:\n    image: redis:8";
		expect(hashString(v1)).not.toBe(hashString(v2));
	});
});

describe("parseEnvContent", () => {
	it("returns empty array for undefined input", () => {
		expect(parseEnvContent(undefined)).toEqual([]);
	});

	it("returns empty array for empty string", () => {
		expect(parseEnvContent("")).toEqual([]);
	});

	it("parses simple key=value pairs", () => {
		const result = parseEnvContent("FOO=bar\nBAZ=qux");
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			key: "FOO",
			value: "bar",
			is_preview: false,
			is_build_time: false,
			is_literal: true,
		});
	});

	it("skips comments", () => {
		const result = parseEnvContent("# This is a comment\nFOO=bar");
		expect(result).toHaveLength(1);
		expect(result[0]!.key).toBe("FOO");
	});

	it("skips blank lines", () => {
		const result = parseEnvContent("FOO=bar\n\n\nBAZ=qux");
		expect(result).toHaveLength(2);
	});

	it("handles values containing equals signs", () => {
		const result = parseEnvContent("DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require");
		expect(result).toHaveLength(1);
		expect(result[0]!.key).toBe("DATABASE_URL");
		expect(result[0]!.value).toBe("postgres://user:pass@host:5432/db?sslmode=require");
	});

	it("handles empty values", () => {
		const result = parseEnvContent("EMPTY_VAR=");
		expect(result).toHaveLength(1);
		expect(result[0]!.key).toBe("EMPTY_VAR");
		expect(result[0]!.value).toBe("");
	});

	it("skips lines without = sign", () => {
		const result = parseEnvContent("INVALID_LINE\nVALID=yes");
		expect(result).toHaveLength(1);
		expect(result[0]!.key).toBe("VALID");
	});

	it("handles quoted values", () => {
		const result = parseEnvContent('PASSWORD="my secret"');
		expect(result[0]!.key).toBe("PASSWORD");
		expect(result[0]!.value).toBe('"my secret"');
	});
});

describe("CoolifyDeployer", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("can be imported and instantiated", async () => {
		const { CoolifyDeployer } = await import("./coolify.js");
		const deployer = new CoolifyDeployer();
		expect(deployer.name).toBe("Coolify");
		expect(deployer.id).toBe("coolify");
	});

	it("testConnection returns error on network failure", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new Error("Connection refused")),
		);
		const { CoolifyDeployer } = await import("./coolify.js");
		const deployer = new CoolifyDeployer();
		const result = await deployer.testConnection({
			instanceUrl: "https://coolify.example.com",
			apiKey: "test-key",
		});
		expect(result.ok).toBe(false);
		expect(result.error).toContain("Connection refused");
		vi.unstubAllGlobals();
	});

	it("testConnection returns ok on successful version response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				text: () => Promise.resolve('"v4.0.0"'),
			}),
		);
		const { CoolifyDeployer } = await import("./coolify.js");
		const deployer = new CoolifyDeployer();
		const result = await deployer.testConnection({
			instanceUrl: "https://coolify.example.com",
			apiKey: "test-key",
		});
		expect(result.ok).toBe(true);
		vi.unstubAllGlobals();
	});

	it("deploy returns error when no servers available", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				text: () => Promise.resolve("[]"),
			}),
		);
		const { CoolifyDeployer } = await import("./coolify.js");
		const deployer = new CoolifyDeployer();
		const result = await deployer.deploy({
			target: { instanceUrl: "https://coolify.example.com", apiKey: "test-key" },
			projectName: "test-project",
			composeYaml: "version: '3'",
			envContent: "",
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("No Coolify servers");
		expect(result.steps[0]!.status).toBe("error");
		vi.unstubAllGlobals();
	});
});
