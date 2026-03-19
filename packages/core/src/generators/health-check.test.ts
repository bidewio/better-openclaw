import { describe, expect, it } from "vitest";
import { generate } from "../generate.js";

describe("generateHealthCheck (via generate)", () => {
	const baseInput = {
		projectName: "health-test",
		services: ["redis", "postgresql"],
		skillPacks: [] as string[],
		proxy: "none" as const,
		gpu: false,
		platform: "linux/amd64" as const,
		deployment: "local" as const,
		generateSecrets: true,
		openclawVersion: "latest",
	};

	it("generates health-check.sh and health-check.ps1", () => {
		const result = generate(baseInput);

		expect(result.files).toHaveProperty("scripts/health-check.sh");
		expect(result.files).toHaveProperty("scripts/health-check.ps1");
	});

	it("health-check.sh contains project name", () => {
		const result = generate(baseInput);
		const sh = result.files["scripts/health-check.sh"] ?? "";

		expect(sh).toContain("health-test");
	});

	it("health-check.sh contains service-specific checks for each resolved service", () => {
		const result = generate(baseInput);
		const sh = result.files["scripts/health-check.sh"] ?? "";

		expect(sh).toContain("redis");
		expect(sh).toContain("postgresql");
	});

	it("health-check.sh includes port checks for exposed ports", () => {
		const result = generate(baseInput);
		const sh = result.files["scripts/health-check.sh"] ?? "";

		// Redis exposes port 6379, PostgreSQL exposes 5432
		expect(sh).toContain("6379");
		expect(sh).toContain("5432");
	});

	it("health-check.sh has usage/help docs", () => {
		const result = generate(baseInput);
		const sh = result.files["scripts/health-check.sh"] ?? "";

		expect(sh).toContain("--quick");
		expect(sh).toContain("--json");
		expect(sh).toContain("--verbose");
	});

	it("health-check.sh starts with shebang", () => {
		const result = generate(baseInput);
		const sh = result.files["scripts/health-check.sh"] ?? "";

		expect(sh.startsWith("#!/usr/bin/env bash")).toBe(true);
	});

	it("health-check.ps1 contains project name", () => {
		const result = generate(baseInput);
		const ps1 = result.files["scripts/health-check.ps1"] ?? "";

		expect(ps1).toContain("health-test");
	});

	it("health-check.ps1 contains service checks", () => {
		const result = generate(baseInput);
		const ps1 = result.files["scripts/health-check.ps1"] ?? "";

		expect(ps1).toContain("redis");
		expect(ps1).toContain("postgresql");
	});

	it("health-check.ps1 includes PowerShell-style parameters", () => {
		const result = generate(baseInput);
		const ps1 = result.files["scripts/health-check.ps1"] ?? "";

		expect(ps1).toContain("[switch]$Quick");
		expect(ps1).toContain("[switch]$Json");
	});

	it("health check scripts include all resolved services including dependencies", () => {
		const result = generate({
			...baseInput,
			services: ["postiz"], // postiz depends on redis and postgresql
		});
		const sh = result.files["scripts/health-check.sh"] ?? "";

		expect(sh).toContain("postiz");
		// Dependencies should be auto-resolved and included
		expect(sh).toContain("redis");
		expect(sh).toContain("postgresql");
	});

	it("health check script includes health check commands when service defines one", () => {
		const result = generate(baseInput);
		const sh = result.files["scripts/health-check.sh"] ?? "";

		// Redis has a healthcheck command (redis-cli ping)
		expect(sh).toContain("check_health_cmd");
	});

	it("health check scripts contain the phase structure", () => {
		const result = generate(baseInput);
		const sh = result.files["scripts/health-check.sh"] ?? "";

		expect(sh).toContain("Phase 1");
		expect(sh).toContain("phase_environment");
		expect(sh).toContain("check_container");
		expect(sh).toContain("check_port");
		expect(sh).toContain("phase_logs");
	});
});
