import * as yaml from "yaml";
import { generate } from "./generate.js";
import { getAllPresets } from "./presets/registry.js";

const allPresets = getAllPresets();

describe("docker compose config integration tests", () => {
	for (const preset of allPresets) {
		describe(`preset "${preset.id}"`, () => {
			const result = generate({
				projectName: "test-project",
				services: preset.services,
				skillPacks: preset.skillPacks,
				aiProviders: [],
				gsdRuntimes: [],
				proxy: "none",
				gpu: false,
				platform: "linux/amd64",
				deployment: "local",
				deploymentType: "docker",
				generateSecrets: false,
				openclawVersion: "latest",
				monitoring: false,
			});

			const composeContent = result.files["docker-compose.yml"] ?? "";
			const parsed = yaml.parse(composeContent);

			it("parses as valid YAML", () => {
				expect(parsed).toBeDefined();
				expect(typeof parsed).toBe("object");
			});

			it("every service has an image field", () => {
				expect(parsed.services).toBeDefined();
				for (const [name, service] of Object.entries(parsed.services)) {
					expect(
						(service as Record<string, unknown>).image,
						`service "${name}" is missing an image field`,
					).toBeDefined();
				}
			});

			it("every service has restart or uses default", () => {
				for (const [name, service] of Object.entries(parsed.services)) {
					const svc = service as Record<string, unknown>;
					// A service should either have an explicit restart policy
					// or rely on the default (which means the field can be absent).
					// We just verify that if restart is set, it is a valid value.
					if (svc.restart !== undefined) {
						expect(
							["always", "unless-stopped", "on-failure", "no"].includes(svc.restart as string),
							`service "${name}" has invalid restart policy: ${svc.restart}`,
						).toBe(true);
					}
				}
			});

			it("has networks defined", () => {
				expect(parsed.networks).toBeDefined();
				expect(typeof parsed.networks).toBe("object");
			});

			it("named volumes referenced by services are declared in top-level volumes", () => {
				const topLevelVolumes = parsed.volumes
					? new Set(Object.keys(parsed.volumes))
					: new Set<string>();

				for (const [serviceName, service] of Object.entries(parsed.services)) {
					const svc = service as Record<string, unknown>;
					const volumes = svc.volumes as string[] | undefined;
					if (!volumes) continue;

					for (const vol of volumes) {
						const volStr = typeof vol === "string" ? vol : (vol as { source?: string })?.source;
						if (typeof volStr !== "string") continue;

						// Named volumes follow the pattern "name:path" (no leading . or /)
						// Bind mounts start with . or / or use an absolute path
						const parts = volStr.split(":");
						const source = parts[0] ?? "";
						const isNamedVolume =
							source.length > 0 &&
							!source.startsWith(".") &&
							!source.startsWith("/") &&
							!source.startsWith("~") &&
							!source.includes("\\") &&
							!source.startsWith("$") &&
							!source.includes("${");

						if (isNamedVolume) {
							expect(
								topLevelVolumes.has(source),
								`service "${serviceName}" references named volume "${source}" which is not declared in top-level volumes`,
							).toBe(true);
						}
					}
				}
			});
		});
	}
});
