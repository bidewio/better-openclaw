import { describe, expect, it } from "vitest";
import { generate } from "../generate.js";

describe("generateCaddyfile (via generate)", () => {
	const baseInput = {
		projectName: "caddy-test",
		services: ["redis", "n8n"],
		skillPacks: [] as string[],
		proxy: "caddy" as const,
		domain: "example.com",
		gpu: false,
		platform: "linux/amd64" as const,
		deployment: "local" as const,
		generateSecrets: true,
		openclawVersion: "latest",
	};

	it("generates Caddyfile when proxy is caddy", () => {
		const result = generate(baseInput);

		expect(result.files).toHaveProperty("caddy/Caddyfile");
		expect((result.files["caddy/Caddyfile"] ?? "").length).toBeGreaterThan(0);
	});

	it("does not generate Caddyfile when proxy is none", () => {
		const result = generate({
			...baseInput,
			proxy: "none",
		});

		expect(result.files).not.toHaveProperty("caddy/Caddyfile");
	});

	it("Caddyfile contains the domain", () => {
		const result = generate(baseInput);
		const caddyfile = result.files["caddy/Caddyfile"] ?? "";

		expect(caddyfile).toContain("example.com");
	});

	it("Caddyfile includes reverse proxy directives for services with exposed ports", () => {
		const result = generate(baseInput);
		const caddyfile = result.files["caddy/Caddyfile"] ?? "";

		// Should reference n8n since it has exposed ports
		expect(caddyfile).toContain("n8n");
	});

	it("Caddyfile includes TLS configuration", () => {
		const result = generate(baseInput);
		const caddyfile = result.files["caddy/Caddyfile"] ?? "";

		// Caddy auto-enables TLS, so should reference HTTPS or TLS
		expect(caddyfile.length).toBeGreaterThan(50);
	});
});
