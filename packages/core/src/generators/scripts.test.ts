import { describe, expect, it } from "vitest";
import { generateScripts } from "./scripts.js";

describe("generateScripts", () => {
	it("generates all 10 expected scripts (5 bash + 5 PowerShell)", () => {
		const result = generateScripts();

		const expectedScripts = [
			"scripts/start.sh",
			"scripts/stop.sh",
			"scripts/update.sh",
			"scripts/backup.sh",
			"scripts/status.sh",
			"scripts/start.ps1",
			"scripts/stop.ps1",
			"scripts/update.ps1",
			"scripts/backup.ps1",
			"scripts/status.ps1",
		];

		for (const script of expectedScripts) {
			expect(result).toHaveProperty(script);
			const content = result[script];
			expect(content).toBeDefined();
			expect(content?.length).toBeGreaterThan(0);
		}
	});

	it("start.sh calls docker compose up", () => {
		const result = generateScripts();
		expect(result["scripts/start.sh"]).toContain("docker compose");
		expect(result["scripts/start.sh"]).toContain("up");
	});

	it("stop.sh calls docker compose down", () => {
		const result = generateScripts();
		expect(result["scripts/stop.sh"]).toContain("docker compose");
		expect(result["scripts/stop.sh"]).toContain("down");
	});

	it("update.sh calls docker compose pull", () => {
		const result = generateScripts();
		expect(result["scripts/update.sh"]).toContain("docker compose");
		expect(result["scripts/update.sh"]).toContain("pull");
	});

	it("backup.sh references volumes or backup", () => {
		const result = generateScripts();
		const backup = result["scripts/backup.sh"];
		expect(backup).toBeDefined();
		expect(backup?.length).toBeGreaterThan(50);
	});

	it("status.sh calls docker compose ps", () => {
		const result = generateScripts();
		expect(result["scripts/status.sh"]).toContain("docker compose");
		expect(result["scripts/status.sh"]).toContain("ps");
	});

	it("all bash scripts start with shebang", () => {
		const result = generateScripts();

		for (const [path, content] of Object.entries(result)) {
			if (path.endsWith(".sh")) {
				expect(content.startsWith("#!/")).toBe(true);
			}
		}
	});

	it("all PowerShell scripts start with #Requires", () => {
		const result = generateScripts();

		for (const [path, content] of Object.entries(result)) {
			if (path.endsWith(".ps1")) {
				expect(content.startsWith("#Requires")).toBe(true);
			}
		}
	});

	it("start.ps1 calls docker compose up", () => {
		const result = generateScripts();
		expect(result["scripts/start.ps1"]).toContain("docker compose");
		expect(result["scripts/start.ps1"]).toContain("up");
	});

	it("stop.ps1 calls docker compose down", () => {
		const result = generateScripts();
		expect(result["scripts/stop.ps1"]).toContain("docker compose");
		expect(result["scripts/stop.ps1"]).toContain("down");
	});

	it("update.ps1 calls docker compose pull", () => {
		const result = generateScripts();
		expect(result["scripts/update.ps1"]).toContain("docker compose");
		expect(result["scripts/update.ps1"]).toContain("pull");
	});

	it("backup.ps1 references volumes or backup", () => {
		const result = generateScripts();
		const backup = result["scripts/backup.ps1"];
		expect(backup).toBeDefined();
		expect(backup?.length).toBeGreaterThan(50);
	});

	it("status.ps1 calls docker compose ps", () => {
		const result = generateScripts();
		expect(result["scripts/status.ps1"]).toContain("docker compose");
		expect(result["scripts/status.ps1"]).toContain("ps");
	});
});
