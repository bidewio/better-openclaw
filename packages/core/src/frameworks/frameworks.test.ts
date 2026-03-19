import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { generate } from "../generate.js";
import { getAllFrameworks } from "./registry.js";

function parseCompose(result: ReturnType<typeof generate>) {
	const compose = result.files["docker-compose.yml"];
	if (!compose) {
		throw new Error("Missing docker-compose.yml");
	}
	return parse(compose);
}

/**
 * Smoke tests for all registered framework definitions.
 *
 * Each framework's buildGatewayService, generateConfig, and getBaseEnvVars
 * should produce valid output when invoked through the generate() pipeline.
 */

describe("framework smoke tests via generate()", () => {
	const primaryFrameworks = getAllFrameworks().filter((fw) => fw.canBePrimary);

	for (const fw of primaryFrameworks) {
		describe(`${fw.name} (${fw.id})`, () => {
			it("generates a valid stack with this framework as primary", () => {
				const result = generate({
					projectName: `${fw.id}-test`,
					services: ["redis"],
					skillPacks: [],
					proxy: "none",
					gpu: false,
					platform: "linux/amd64",
					deployment: "local",
					generateSecrets: true,
					openclawVersion: "latest",
					primaryFramework: fw.id,
				});

				expect(result.files).toHaveProperty("docker-compose.yml");
				const composed = parseCompose(result);
				expect(composed.services).toBeDefined();

				// Gateway service should exist with the framework's naming pattern
				const gatewayKey = `${fw.id}-gateway`;
				expect(composed.services).toHaveProperty(gatewayKey);
			});

			it("produces a docker-compose with the framework's network", () => {
				const result = generate({
					projectName: `${fw.id}-net-test`,
					services: ["redis"],
					skillPacks: [],
					proxy: "none",
					gpu: false,
					platform: "linux/amd64",
					deployment: "local",
					generateSecrets: true,
					openclawVersion: "latest",
					primaryFramework: fw.id,
				});

				const composed = parseCompose(result);
				if (fw.networkName) {
					expect(composed.networks).toHaveProperty(fw.networkName);
				}
			});

			it("getBaseEnvVars returns an array", () => {
				const envVars = fw.getBaseEnvVars({
					generateSecrets: true,
					domain: "example.com",
				});
				expect(envVars).toBeInstanceOf(Array);
			});

			it("getMandatoryServices returns an array", () => {
				const mandatory = fw.getMandatoryServices();
				expect(mandatory).toBeInstanceOf(Array);
			});

			it("getRecommendedServices returns an array", () => {
				const recommended = fw.getRecommendedServices();
				expect(recommended).toBeInstanceOf(Array);
			});

			it("getEnvSectionName returns a non-empty string", () => {
				const section = fw.getEnvSectionName();
				expect(typeof section).toBe("string");
				expect(section.length).toBeGreaterThan(0);
			});

			it("getProviderEnvKeys returns an array", () => {
				const keys = fw.getProviderEnvKeys();
				expect(keys).toBeInstanceOf(Array);
			});
		});
	}
});

describe("companion frameworks via generate()", () => {
	const companionFrameworks = getAllFrameworks().filter((fw) => fw.canBeCompanion);

	for (const fw of companionFrameworks) {
		it(`${fw.name} can be added as companion`, () => {
			const result = generate({
				projectName: `companion-${fw.id}-test`,
				services: ["redis"],
				skillPacks: [],
				proxy: "none",
				gpu: false,
				platform: "linux/amd64",
				deployment: "local",
				generateSecrets: true,
				openclawVersion: "latest",
				companionFrameworks: [fw.id],
			});

			const composed = parseCompose(result);
			expect(composed.services).toBeDefined();

			// Companion should appear in compose
			const companionKey = `${fw.id}-companion`;
			expect(composed.services).toHaveProperty(companionKey);
		});
	}
});
