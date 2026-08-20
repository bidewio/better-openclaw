import * as yaml from "yaml";
import { generate } from "../generate.js";
import { getAllPresets, getPresetById } from "../presets/registry.js";
import { resolve } from "../resolver.js";

const allPresets = getAllPresets();

describe("preset smoke tests", () => {
	it("all presets are defined", () => {
		expect(allPresets.length).toBeGreaterThanOrEqual(5);
	});

	it("all preset IDs are unique", () => {
		const ids = allPresets.map((p) => p.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	for (const preset of allPresets) {
		it(`getPresetById returns correct preset for "${preset.id}"`, () => {
			const found = getPresetById(preset.id);
			expect(found).toBeDefined();
			expect(found?.id).toBe(preset.id);
			expect(found?.name).toBe(preset.name);
			expect(found?.services).toEqual(preset.services);
			expect(found?.skillPacks).toEqual(preset.skillPacks);
		});
	}

	for (const preset of allPresets) {
		it(`preset "${preset.id}" generates valid configuration`, () => {
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
				openclawImage: "official",
				openclawInstallMethod: "docker",
				deployTarget: "local",
				hardened: false,
			});

			expect(result.files["docker-compose.yml"]).toBeDefined();
			expect(result.files[".env.example"]).toBeDefined();
			expect(result.metadata.serviceCount).toBeGreaterThan(0);

			const composeContent = result.files["docker-compose.yml"];
			expect(composeContent).toBeDefined();
			if (!composeContent) {
				throw new Error("docker-compose.yml is missing");
			}
			const parsed = yaml.parse(composeContent);
			expect(parsed).toBeDefined();
			expect(parsed.services).toBeDefined();
		});
	}

	for (const preset of allPresets) {
		it(`preset "${preset.id}" resolves without errors`, () => {
			const result = resolve({
				services: preset.services,
				skillPacks: preset.skillPacks,
				proxy: "none",
				gpu: false,
				platform: "linux/amd64",
				monitoring: false,
			});

			expect(result.isValid).toBe(true);
		});
	}
});
