import { describe, expect, it } from "vitest";
import { getAllPresets, getPresetById } from "./registry.js";

describe("preset registry", () => {
	it("getPresetById returns undefined for unknown id", () => {
		expect(getPresetById("unknown")).toBeUndefined();
	});

	it("getPresetById returns La Suite Meet preset with correct services", () => {
		const preset = getPresetById("lasuite-meet");
		expect(preset).toBeDefined();
		expect(preset?.id).toBe("lasuite-meet");
		expect(preset?.name).toBe("La Suite Meet");
		expect(preset?.services).toEqual([
			"postgresql",
			"redis",
			"livekit",
			"lasuite-meet-backend",
			"lasuite-meet-frontend",
			"lasuite-meet-agents",
			"whisper",
			"ollama",
			"caddy",
		]);
		expect(preset?.skillPacks).toEqual([]);
		expect(preset?.estimatedMemoryMB).toBe(2048);
	});

	it("getAllPresets includes La Suite Meet", () => {
		const all = getAllPresets();
		const lasuite = all.find((p) => p.id === "lasuite-meet");
		expect(lasuite).toBeDefined();
		expect(lasuite?.name).toBe("La Suite Meet");
	});
});
