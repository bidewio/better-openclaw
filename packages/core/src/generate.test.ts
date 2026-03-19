import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { generate } from "./generate.js";

describe("generate (end-to-end)", () => {
	it("generates a minimal stack (redis only)", () => {
		const result = generate({
			projectName: "test-stack",
			services: ["redis"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			generateSecrets: true,
			openclawVersion: "latest",
		});

		// Core files must be present
		expect(result.files).toHaveProperty("docker-compose.yml");
		expect(result.files).toHaveProperty(".env.example");
		expect(result.files).toHaveProperty(".env");
		expect(result.files).toHaveProperty("README.md");

		// docker-compose.yml must be valid YAML
		const composed = parse(result.files["docker-compose.yml"] ?? "");
		expect(composed).toHaveProperty("services");

		// .env.example should reference REDIS_PASSWORD
		expect(result.files[".env.example"]).toContain("REDIS_PASSWORD");

		// README should mention the project name
		expect(result.files["README.md"]).toContain("test-stack");

		// At least one service resolved
		expect(result.metadata.serviceCount).toBeGreaterThanOrEqual(1);
	});

	it("generates research-agent stack from skill pack", () => {
		const result = generate({
			projectName: "research-stack",
			services: [],
			skillPacks: ["research-agent"],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			generateSecrets: true,
			openclawVersion: "latest",
		});

		// Skill SKILL.md files for each skill in the research-agent pack
		expect(result.files).toHaveProperty("openclaw/workspace/skills/qdrant-memory/SKILL.md");
		expect(result.files).toHaveProperty("openclaw/workspace/skills/searxng-search/SKILL.md");
		expect(result.files).toHaveProperty("openclaw/workspace/skills/browserless-browse/SKILL.md");

		// docker-compose.yml should contain the expected services
		const composed = parse(result.files["docker-compose.yml"] ?? "");
		expect(composed.services).toHaveProperty("qdrant");
		expect(composed.services).toHaveProperty("searxng");
		expect(composed.services).toHaveProperty("browserless");
	});

	it("generates full preset stack", () => {
		const fullServices = [
			"redis",
			"postgresql",
			"qdrant",
			"n8n",
			"ffmpeg",
			"remotion",
			"minio",
			"caddy",
			"browserless",
			"searxng",
			"meilisearch",
			"uptime-kuma",
			"grafana",
			"prometheus",
			"ollama",
			"whisper",
			"gotify",
		];

		const result = generate({
			projectName: "full-stack",
			services: fullServices,
			skillPacks: [
				"video-creator",
				"research-agent",
				"social-media",
				"dev-ops",
				"knowledge-base",
				"local-ai",
			],
			proxy: "caddy",
			domain: "example.com",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			generateSecrets: true,
			openclawVersion: "latest",
		});

		// Should have many files
		const fileCount = Object.keys(result.files).length;
		expect(fileCount).toBeGreaterThan(10);

		// Should include the start script
		expect(result.files).toHaveProperty("scripts/start.sh");

		// Should not throw (it already didn't if we got here)
		expect(result.metadata.serviceCount).toBeGreaterThan(5);
	});

	it("generates caddy config when proxy is caddy", () => {
		const result = generate({
			projectName: "caddy-stack",
			services: ["redis"],
			skillPacks: [],
			proxy: "caddy",
			domain: "example.com",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			generateSecrets: true,
			openclawVersion: "latest",
		});

		expect(result.files).toHaveProperty("caddy/Caddyfile");
		expect((result.files["caddy/Caddyfile"] ?? "").length).toBeGreaterThan(0);
	});

	it("generates prometheus config when monitoring enabled", () => {
		const result = generate({
			projectName: "monitored-stack",
			services: [],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			generateSecrets: true,
			openclawVersion: "latest",
			monitoring: true,
		});

		expect(result.files).toHaveProperty("prometheus/prometheus.yml");
		// Verify it's valid YAML
		const promConfig = parse(result.files["prometheus/prometheus.yml"] ?? "");
		expect(promConfig).toBeDefined();
	});

	it("generates La Suite Meet stack with all expected services", () => {
		const lasuiteMeetServices = [
			"postgresql",
			"redis",
			"livekit",
			"lasuite-meet-backend",
			"lasuite-meet-frontend",
			"lasuite-meet-agents",
		];
		const result = generate({
			projectName: "lasuite-meet-stack",
			services: lasuiteMeetServices,
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			generateSecrets: true,
			openclawVersion: "latest",
		});

		// Services may be split across main and profile compose files
		const allServiceIds = new Set<string>();
		for (const [filename, content] of Object.entries(result.files)) {
			if (filename.endsWith(".yml") && content) {
				const doc = parse(content);
				if (doc?.services && typeof doc.services === "object") {
					for (const id of Object.keys(doc.services)) {
						allServiceIds.add(id);
					}
				}
			}
		}
		for (const id of lasuiteMeetServices) {
			expect(allServiceIds.has(id), `missing service ${id}`).toBe(true);
		}
		// Service count includes user services + mandatory platform services (convex, mission-control, tailscale)
		expect(result.metadata.serviceCount).toBeGreaterThanOrEqual(lasuiteMeetServices.length);
	});

	it("generates bare-metal installer for Windows (install.ps1)", () => {
		const result = generate({
			projectName: "win-stack",
			services: ["redis"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "windows/amd64",
			deployment: "local",
			deploymentType: "bare-metal",
			generateSecrets: true,
			openclawVersion: "latest",
		});
		expect(result.files).toHaveProperty("install.ps1");
		expect(result.files["install.ps1"]).toContain("docker compose");
		expect(result.files["install.ps1"]).toContain("PowerShell");
	});

	it("generates bare-metal installer for Linux/macOS (install.sh)", () => {
		const result = generate({
			projectName: "linux-stack",
			services: ["redis"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			deploymentType: "bare-metal",
			generateSecrets: true,
			openclawVersion: "latest",
		});
		expect(result.files).toHaveProperty("install.sh");
		expect(result.files["install.sh"]).toContain("docker");
		expect(result.files["install.sh"]).toContain("compose");
	});

	it("bare-metal with redis on Linux: native script, compose excludes redis, gateway has extra_hosts", () => {
		const result = generate({
			projectName: "bare-metal-redis",
			services: ["redis"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			deploymentType: "bare-metal",
			generateSecrets: true,
			openclawVersion: "latest",
		});

		// Native install script for Linux
		expect(result.files).toHaveProperty("native/install-linux.sh");
		expect(result.files["native/install-linux.sh"]).toContain("redis");

		// Docker compose must NOT include redis (native); only gateway/openclaw
		const composed = parse(result.files["docker-compose.yml"] ?? "");
		expect(composed.services).not.toHaveProperty("redis");
		expect(composed.services).toHaveProperty("openclaw-gateway");

		// Gateway must have extra_hosts for host.docker.internal
		const gateway = composed.services["openclaw-gateway"];
		expect(gateway).toBeDefined();
		expect(gateway.extra_hosts).toBeDefined();
		expect(
			(gateway.extra_hosts as string[]).some(
				(h: string) => h.includes("host.docker.internal") && h.includes("host-gateway"),
			),
		).toBe(true);

		// .env should set REDIS_HOST to host.docker.internal for gateway to reach native Redis
		expect(result.files[".env"]).toContain("REDIS_HOST=host.docker.internal");
	});

	it("throws on conflicting services", () => {
		expect(() =>
			generate({
				projectName: "conflict-stack",
				services: ["redis", "valkey"],
				skillPacks: [],
				proxy: "none",
				gpu: false,
				platform: "linux/amd64",
				deployment: "local",
				generateSecrets: true,
				openclawVersion: "latest",
			}),
		).toThrow();
	});

	it("generates scripts directory", () => {
		const result = generate({
			projectName: "scripts-stack",
			services: ["redis"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			generateSecrets: true,
			openclawVersion: "latest",
		});

		const expectedScripts = [
			"scripts/start.sh",
			"scripts/stop.sh",
			"scripts/update.sh",
			"scripts/backup.sh",
			"scripts/status.sh",
		];

		for (const script of expectedScripts) {
			expect(result.files).toHaveProperty(script);
			expect((result.files[script] ?? "").length).toBeGreaterThan(0);
		}
	});

	it("all generated .env.example vars have comments", () => {
		const result = generate({
			projectName: "env-comments-stack",
			services: ["redis", "qdrant", "n8n"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			generateSecrets: true,
			openclawVersion: "latest",
		});

		const envExample = result.files[".env.example"] ?? "";
		const lines = envExample.split("\n");

		// Walk through lines: every non-empty, non-comment KEY=VALUE line should
		// have a preceding comment line (starting with #).
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]?.trim() ?? "";
			if (line === "" || line.startsWith("#")) continue;

			// This line looks like KEY=VALUE
			if (line.includes("=")) {
				// There must be a comment somewhere before it (look backwards for a # line)
				let foundComment = false;
				for (let j = i - 1; j >= 0; j--) {
					const prev = lines[j]?.trim() ?? "";
					if (prev === "") continue; // skip blank lines
					if (prev.startsWith("#")) {
						foundComment = true;
						break;
					}
					// Hit another non-comment, non-empty line — no comment found
					break;
				}
				expect(foundComment).toBe(true);
			}
		}
	});
});
