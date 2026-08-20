import { describe, expect, it } from "vitest";
import {
	getAllFrameworks,
	getCompanionFrameworks,
	getFrameworkById,
	getPrimaryFrameworks,
} from "./registry.js";

// Ensure all frameworks are auto-registered by importing the barrel
import "./index.js";

function requireFramework(id: string) {
	const framework = getFrameworkById(id);
	if (!framework) {
		throw new Error(`Framework not found: ${id}`);
	}
	return framework;
}

const EXPECTED_FRAMEWORK_IDS = [
	"openclaw",
	"copaw",
	"nanoclaw",
	"nanobot",
	"zeroclaw",
	"memu",
	"claude-code",
	"codex",
	"hermes",
];

describe("framework registry", () => {
	it("has all 9 frameworks registered", () => {
		const all = getAllFrameworks();
		expect(all.length).toBe(9);
		const ids = all.map((fw) => fw.id);
		for (const id of EXPECTED_FRAMEWORK_IDS) {
			expect(ids).toContain(id);
		}
	});

	it("returns undefined for unknown framework", () => {
		expect(getFrameworkById("nonexistent")).toBeUndefined();
	});

	it("retrieves each framework by id", () => {
		for (const id of EXPECTED_FRAMEWORK_IDS) {
			const fw = getFrameworkById(id);
			expect(fw).toBeDefined();
			expect(fw?.id).toBe(id);
			expect(fw?.name).toBeTruthy();
			expect(fw?.icon).toBeTruthy();
			expect(fw?.description).toBeTruthy();
		}
	});

	it("all frameworks expose required methods", () => {
		for (const fw of getAllFrameworks()) {
			expect(typeof fw.buildGatewayService).toBe("function");
			expect(typeof fw.generateConfig).toBe("function");
			expect(typeof fw.getBaseEnvVars).toBe("function");
			expect(typeof fw.getMandatoryServices).toBe("function");
			expect(typeof fw.getRecommendedServices).toBe("function");
			expect(typeof fw.getProviderEnvKeys).toBe("function");
			expect(typeof fw.getEnvSectionName).toBe("function");
		}
	});

	it("getPrimaryFrameworks returns only frameworks with canBePrimary", () => {
		const primaries = getPrimaryFrameworks();
		for (const fw of primaries) {
			expect(fw.canBePrimary).toBe(true);
		}
		expect(primaries.length).toBeGreaterThanOrEqual(1);
		// OpenClaw must always be a primary
		expect(primaries.some((fw) => fw.id === "openclaw")).toBe(true);
	});

	it("getCompanionFrameworks returns only frameworks with canBeCompanion", () => {
		const companions = getCompanionFrameworks();
		for (const fw of companions) {
			expect(fw.canBeCompanion).toBe(true);
		}
	});

	it("openclaw has mandatory services (convex, mission-control, tailscale)", () => {
		const openclaw = requireFramework("openclaw");
		const mandatory = openclaw.getMandatoryServices();
		expect(mandatory).toContain("convex");
		expect(mandatory).toContain("mission-control");
		expect(mandatory).toContain("tailscale");
	});

	it("memu has postgresql as mandatory service", () => {
		const memu = requireFramework("memu");
		expect(memu.getMandatoryServices()).toContain("postgresql");
	});

	it("non-openclaw frameworks do not require convex/mission-control/tailscale", () => {
		for (const id of [
			"copaw",
			"nanoclaw",
			"nanobot",
			"zeroclaw",
			"claude-code",
			"codex",
			"hermes",
		]) {
			const fw = requireFramework(id);
			const mandatory = fw.getMandatoryServices();
			expect(mandatory).not.toContain("convex");
			expect(mandatory).not.toContain("mission-control");
			expect(mandatory).not.toContain("tailscale");
		}
	});

	it("openclaw, copaw, and hermes recommend clawrouter", () => {
		const openclaw = requireFramework("openclaw");
		expect(openclaw.getRecommendedServices()).toContain("clawrouter");

		const copaw = requireFramework("copaw");
		expect(copaw.getRecommendedServices()).toContain("clawrouter");

		const hermes = requireFramework("hermes");
		expect(hermes.getRecommendedServices()).toContain("clawrouter");
	});

	it("other frameworks do not recommend clawrouter", () => {
		for (const id of ["nanoclaw", "nanobot", "zeroclaw", "claude-code", "codex"]) {
			const fw = requireFramework(id);
			expect(fw.getRecommendedServices()).not.toContain("clawrouter");
		}
	});

	it("each framework has a unique network name", () => {
		const names = getAllFrameworks().map((fw) => fw.networkName);
		expect(new Set(names).size).toBe(names.length);
	});

	it("each framework provides env vars via getBaseEnvVars", () => {
		for (const fw of getAllFrameworks()) {
			const vars = fw.getBaseEnvVars({});
			expect(Array.isArray(vars)).toBe(true);
			// Each env var should have key and comment
			for (const v of vars) {
				expect(v.key).toBeTruthy();
				expect(typeof v.comment).toBe("string");
			}
		}
	});
});
