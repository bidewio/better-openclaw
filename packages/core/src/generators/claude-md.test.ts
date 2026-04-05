import { describe, expect, it } from "vitest";
import { generate } from "../generate.js";
import { generateClaudeMd } from "./claude-md.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateStack(services: string[] = ["redis"], extra: Record<string, unknown> = {}) {
	return generate({
		projectName: "claude-md-test",
		primaryFramework: "openclaw" as any,
		services,
		skillPacks: [],
		proxy: "none",
		gpu: false,
		platform: "linux/amd64",
		deployment: "local",
		generateSecrets: true,
		openclawVersion: "latest",
		...extra,
	});
}

describe("generateClaudeMd", () => {
	it("generates a non-empty CLAUDE.md", () => {
		const result = generateStack();
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"];
		expect(claudeMd).toBeDefined();
		expect(claudeMd!.length).toBeGreaterThan(100);
	});

	it("includes project name in header", () => {
		const result = generateStack();
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("claude-md-test");
	});

	it("includes Architecture section with primary framework", () => {
		const result = generateStack();
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("## Architecture");
		expect(claudeMd).toContain("Primary framework");
	});

	it("includes Services table", () => {
		const result = generateStack(["redis", "postgresql"]);
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("## Services");
		expect(claudeMd).toContain("Redis");
		expect(claudeMd).toContain("PostgreSQL");
	});

	it("includes AI Providers section when providers are set", () => {
		const result = generateStack(["redis"], {
			aiProviders: ["openai", "anthropic"],
		});
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("## AI Providers");
		expect(claudeMd).toContain("OPENAI_API_KEY");
		expect(claudeMd).toContain("ANTHROPIC_API_KEY");
	});

	it("includes Key Paths section", () => {
		const result = generateStack();
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("## Key Paths");
		expect(claudeMd).toContain("openclaw/config/openclaw.json");
		expect(claudeMd).toContain("openclaw/workspace/skills/");
	});

	it("includes Environment Variables section with PUID/PGID", () => {
		const result = generateStack();
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("## Environment Variables");
		expect(claudeMd).toContain("PUID");
		expect(claudeMd).toContain("PGID");
	});

	it("includes Common Commands section", () => {
		const result = generateStack();
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("## Common Commands");
		expect(claudeMd).toContain("start.sh");
		expect(claudeMd).toContain("stop.sh");
		expect(claudeMd).toContain("docker compose logs");
	});

	it("includes Guidelines section", () => {
		const result = generateStack();
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("## Guidelines");
	});

	it("includes companion frameworks when set", () => {
		const result = generateStack(["redis"], {
			companionFrameworks: ["copaw"],
		});
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("Companion frameworks");
	});

	it("includes proxy info when set", () => {
		const result = generateStack(["redis"], {
			proxy: "caddy",
			domain: "example.com",
		});
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("caddy");
		expect(claudeMd).toContain("example.com");
	});

	it("includes deploy target", () => {
		const result = generateStack(["redis"], {
			deployTarget: "nemoclaw",
			aiProviders: ["nvidia"],
		});
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("nemoclaw");
	});

	it("includes Notifications section when providers configured", () => {
		const result = generateStack(["redis"], {
			notificationProviders: ["discord", "slack"],
		});
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("## Notifications");
		expect(claudeMd).toContain("discord");
		expect(claudeMd).toContain("slack");
	});

	it("omits Notifications section when no providers", () => {
		const result = generateStack();
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).not.toContain("## Notifications");
	});

	it("marks local providers as (local)", () => {
		const result = generateStack(["redis"], {
			aiProviders: ["ollama"],
		});
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("ollama (local)");
	});
});
