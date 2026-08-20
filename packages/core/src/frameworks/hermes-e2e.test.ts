import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { generate } from "../generate.js";
import { getFrameworkById } from "./registry.js";

describe("Hermes Agent end-to-end stack generation", () => {
	const result = generate({
		projectName: "hermes-test",
		primaryFramework: "hermes",
		services: ["redis", "qdrant", "searxng", "browserless"],
		skillPacks: [],
		proxy: "none",
		gpu: false,
		platform: "linux/amd64",
		deployment: "local",
		generateSecrets: true,
		openclawVersion: "latest",
	});

	it("generates successfully", () => {
		expect(result.files).toBeDefined();
		expect(Object.keys(result.files).length).toBeGreaterThan(0);
	});

	it("produces docker-compose.yml", () => {
		expect(result.files).toHaveProperty("docker-compose.yml");
	});

	describe("docker-compose.yml structure", () => {
		const composed = parse(result.files["docker-compose.yml"]!);

		it("has hermes-gateway service", () => {
			expect(composed.services).toHaveProperty("hermes-gateway");
		});

		it("hermes-gateway has correct image template", () => {
			const gw = composed.services["hermes-gateway"];
			expect(gw.image).toContain("HERMES_IMAGE");
			expect(gw.image).toContain("ghcr.io/nousresearch/hermes-agent");
		});

		it("hermes-gateway exposes API port 8642", () => {
			const gw = composed.services["hermes-gateway"];
			const ports: string[] = gw.ports;
			expect(ports.some((p: string) => p.includes("8642"))).toBe(true);
		});

		it("hermes-gateway exposes webhook port 8644", () => {
			const gw = composed.services["hermes-gateway"];
			const ports: string[] = gw.ports;
			expect(ports.some((p: string) => p.includes("8644"))).toBe(true);
		});

		it("hermes-gateway has healthcheck", () => {
			const gw = composed.services["hermes-gateway"];
			expect(gw.healthcheck).toBeDefined();
			expect(gw.healthcheck.test).toContain("curl");
		});

		it("hermes-gateway has hermes-data volume", () => {
			const gw = composed.services["hermes-gateway"];
			expect(gw.volumes).toBeDefined();
			const vols: string[] = gw.volumes;
			expect(vols.some((v: string) => v.includes("hermes-data"))).toBe(true);
		});

		it("hermes-gateway has API_SERVER_ENABLED=true", () => {
			const gw = composed.services["hermes-gateway"];
			expect(gw.environment.API_SERVER_ENABLED).toBe("true");
		});

		it("hermes-gateway has HERMES_HOME=/data", () => {
			const gw = composed.services["hermes-gateway"];
			expect(gw.environment.HERMES_HOME).toBe("/data");
		});

		it("hermes-gateway has LLM_MODEL env var", () => {
			const gw = composed.services["hermes-gateway"];
			expect(gw.environment.LLM_MODEL).toBeDefined();
		});

		it("hermes-gateway has provider API key references", () => {
			const gw = composed.services["hermes-gateway"];
			expect(gw.environment.OPENROUTER_API_KEY).toContain("OPENROUTER_API_KEY");
			expect(gw.environment.ANTHROPIC_API_KEY).toContain("ANTHROPIC_API_KEY");
		});

		it("has all companion services", () => {
			expect(composed.services).toHaveProperty("redis");
			expect(composed.services).toHaveProperty("qdrant");
			expect(composed.services).toHaveProperty("searxng");
			expect(composed.services).toHaveProperty("browserless");
		});

		it("companion services are on hermes-network", () => {
			for (const svcId of ["redis", "qdrant", "searxng", "browserless"]) {
				const svc = composed.services[svcId];
				expect(svc.networks).toContain("hermes-network");
			}
		});

		it("has hermes-network defined", () => {
			expect(composed.networks).toHaveProperty("hermes-network");
		});

		it("has hermes-data volume defined at top level", () => {
			expect(composed.volumes).toHaveProperty("hermes-data");
		});

		it("gateway depends on services with healthchecks", () => {
			const gw = composed.services["hermes-gateway"];
			if (gw.depends_on) {
				for (const [, condition] of Object.entries(gw.depends_on)) {
					expect((condition as { condition: string }).condition).toBe("service_healthy");
				}
			}
		});
	});

	describe("generated .env file", () => {
		const envFile = Object.entries(result.files).find(([path]) => path.endsWith(".env"));

		it("produces an .env file", () => {
			expect(envFile).toBeDefined();
		});

		it(".env contains Hermes section", () => {
			const content = envFile![1];
			expect(content).toContain("Hermes");
		});

		it(".env contains HERMES_IMAGE", () => {
			const content = envFile![1];
			expect(content).toContain("HERMES_IMAGE");
		});

		it(".env contains HERMES_API_PORT", () => {
			const content = envFile![1];
			expect(content).toContain("HERMES_API_PORT");
		});

		it(".env contains LLM_MODEL", () => {
			const content = envFile![1];
			expect(content).toContain("LLM_MODEL");
		});

		it("provider API keys are in docker-compose gateway environment", () => {
			const composed = parse(result.files["docker-compose.yml"]!);
			const gw = composed.services["hermes-gateway"];
			expect(gw.environment.OPENROUTER_API_KEY).toContain("OPENROUTER_API_KEY");
			expect(gw.environment.ANTHROPIC_API_KEY).toContain("ANTHROPIC_API_KEY");
		});
	});

	describe("generated config file", () => {
		const configFile = Object.entries(result.files).find(([path]) =>
			path.includes("hermes/config.yaml"),
		);

		it("produces hermes/config.yaml", () => {
			expect(configFile).toBeDefined();
		});

		it("config.yaml has model setting", () => {
			const content = configFile![1];
			expect(content).toContain("model:");
		});

		it("config.yaml has toolsets", () => {
			const content = configFile![1];
			expect(content).toContain("toolsets:");
		});

		it("config.yaml has api_server section", () => {
			const content = configFile![1];
			expect(content).toContain("api_server:");
			expect(content).toContain("enabled: true");
		});
	});

	describe("generated skill files", () => {
		it("lists generated files", () => {
			const filePaths = Object.keys(result.files);
			// Should have at least compose, env, config, readme
			expect(filePaths.length).toBeGreaterThan(3);
		});
	});

	describe("companion framework mode", () => {
		const companionResult = generate({
			projectName: "hermes-companion-test",
			primaryFramework: "openclaw",
			companionFrameworks: ["hermes"],
			services: ["redis"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			generateSecrets: true,
			openclawVersion: "latest",
		});

		it("generates successfully", () => {
			expect(companionResult.files).toBeDefined();
			expect(Object.keys(companionResult.files).length).toBeGreaterThan(0);
		});

		it("has hermes-companion service", () => {
			const composed = parse(companionResult.files["docker-compose.yml"]!);
			expect(composed.services).toHaveProperty("hermes-companion");
		});

		it("hermes-companion has API port", () => {
			const composed = parse(companionResult.files["docker-compose.yml"]!);
			const companion = composed.services["hermes-companion"];
			const ports: string[] = companion.ports;
			expect(ports.some((p: string) => p.includes("8642"))).toBe(true);
		});

		it("still has openclaw-gateway as primary", () => {
			const composed = parse(companionResult.files["docker-compose.yml"]!);
			expect(composed.services).toHaveProperty("openclaw-gateway");
		});
	});
});
