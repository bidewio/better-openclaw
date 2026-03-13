import { describe, expect, it } from "vitest";
import { generate } from "../generate.js";

describe("generateEnvFiles (via generate)", () => {
	const baseInput = {
		projectName: "env-test",
		services: ["redis"],
		skillPacks: [] as string[],
		proxy: "none" as const,
		gpu: false,
		platform: "linux/amd64" as const,
		deployment: "local" as const,
		generateSecrets: true,
		openclawVersion: "latest",
	};

	it("generates .env and .env.example files", () => {
		const result = generate(baseInput);

		expect(result.files).toHaveProperty(".env");
		expect(result.files).toHaveProperty(".env.example");
	});

	it(".env.example has empty values for secrets", () => {
		const result = generate(baseInput);
		const envExample = result.files[".env.example"]!;

		// .env.example should have placeholder empty values for secrets
		expect(envExample).toContain("REDIS_PASSWORD=");
	});

	it(".env has populated secret values when generateSecrets is true", () => {
		const result = generate(baseInput);
		const env = result.files[".env"]!;

		// Find REDIS_PASSWORD line and check it has a value
		const redisLine = env.split("\n").find((l) => l.startsWith("REDIS_PASSWORD="));
		expect(redisLine).toBeDefined();
		// Value should not be empty
		const value = redisLine?.split("=")[1];
		expect(value?.length).toBeGreaterThan(0);
	});

	it("env files contain service-specific variables", () => {
		const result = generate({
			...baseInput,
			services: ["redis", "postgresql", "n8n"],
		});
		const env = result.files[".env"]!;

		expect(env).toContain("REDIS_PASSWORD");
		expect(env).toContain("POSTGRES_PASSWORD");
	});

	it("env files group variables by service with comments", () => {
		const result = generate(baseInput);
		const envExample = result.files[".env.example"]!;

		// Should have comment sections
		expect(envExample).toContain("#");
	});

	it(".env references domain when proxy is set", () => {
		const result = generate({
			...baseInput,
			proxy: "caddy",
			domain: "example.com",
		});
		const env = result.files[".env"]!;

		expect(env).toContain("example.com");
	});
});
