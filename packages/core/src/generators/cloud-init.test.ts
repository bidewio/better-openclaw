import { describe, expect, it } from "vitest";
import { generateCloudInit } from "./cloud-init.js";

describe("generateCloudInit", () => {
	const baseOptions = {
		composeYaml: "version: '3'\nservices:\n  redis:\n    image: redis:7",
		envContent: "REDIS_PASSWORD=secret123",
		projectName: "my-stack",
	};

	it("generates valid cloud-init YAML starting with #cloud-config", () => {
		const result = generateCloudInit(baseOptions);
		expect(result).toMatch(/^#cloud-config/);
	});

	it("embeds the compose YAML content", () => {
		const result = generateCloudInit(baseOptions);
		expect(result).toContain("redis:7");
	});

	it("embeds the env content with restrictive permissions", () => {
		const result = generateCloudInit(baseOptions);
		expect(result).toContain("REDIS_PASSWORD=secret123");
		expect(result).toContain('"0600"');
	});

	it("includes project name in the output", () => {
		const result = generateCloudInit(baseOptions);
		expect(result).toContain("my-stack");
	});

	it("uses default gateway port 18789 when not specified", () => {
		const result = generateCloudInit(baseOptions);
		expect(result).toContain("18789");
	});

	it("uses custom gateway port when specified", () => {
		const result = generateCloudInit({ ...baseOptions, gatewayPort: 9999 });
		expect(result).toContain("9999");
		expect(result).not.toContain("18789");
	});

	it("includes Docker installation via convenience script", () => {
		const result = generateCloudInit(baseOptions);
		expect(result).toContain("get.docker.com");
	});

	it("includes health check polling logic", () => {
		const result = generateCloudInit(baseOptions);
		expect(result).toContain("RETRIES=");
		expect(result).toContain("curl");
	});

	it("includes runcmd section", () => {
		const result = generateCloudInit(baseOptions);
		expect(result).toContain("runcmd:");
	});

	it("includes final_message", () => {
		const result = generateCloudInit(baseOptions);
		expect(result).toContain("final_message:");
	});

	it("includes required packages", () => {
		const result = generateCloudInit(baseOptions);
		expect(result).toContain("packages:");
		expect(result).toContain("curl");
		expect(result).toContain("git");
	});
});
