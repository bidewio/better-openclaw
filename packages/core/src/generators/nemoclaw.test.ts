import { describe, expect, it } from "vitest";
import { generateNemoClaw } from "./nemoclaw.js";

describe("generateNemoClaw", () => {
	const defaultOptions = {
		projectName: "test-project",
		gatewayPort: 18789,
	};

	// ── File generation ──────────────────────────────────────────────────────

	it("generates all 3 expected files", () => {
		const files = generateNemoClaw(defaultOptions);
		expect(Object.keys(files)).toHaveLength(3);
		expect(files).toHaveProperty("nemoclaw-blueprint/policies/openclaw-sandbox.yaml");
		expect(files).toHaveProperty("nemoclaw-blueprint/inference.yaml");
		expect(files).toHaveProperty("scripts/nemoclaw-setup.sh");
	});

	it("all files are non-empty strings", () => {
		const files = generateNemoClaw(defaultOptions);
		for (const [path, content] of Object.entries(files)) {
			expect(content, `${path} should be non-empty`).toBeTruthy();
			expect(typeof content).toBe("string");
		}
	});

	// ── Sandbox policy ───────────────────────────────────────────────────────

	describe("sandbox policy", () => {
		const getPolicy = () =>
			generateNemoClaw(defaultOptions)["nemoclaw-blueprint/policies/openclaw-sandbox.yaml"];

		it("uses OpenShell runtime", () => {
			expect(getPolicy()).toContain("runtime: openshell");
		});

		it("enables Landlock isolation", () => {
			const policy = getPolicy();
			expect(policy).toContain("landlock:");
			expect(policy).toContain("enabled: true");
		});

		it("enables seccomp strict profile", () => {
			const policy = getPolicy();
			expect(policy).toContain("seccomp:");
			expect(policy).toContain("profile: strict");
		});

		it("enables network namespaces", () => {
			const policy = getPolicy();
			expect(policy).toContain("networkNamespace:");
			expect(policy).toMatch(/networkNamespace:\s*\n\s*enabled: true/);
		});

		it("has deny-by-default egress policy", () => {
			expect(getPolicy()).toContain("defaultPolicy: deny");
		});

		it("whitelists NVIDIA API endpoint", () => {
			expect(getPolicy()).toContain("integrate.api.nvidia.com");
		});

		it("whitelists NVIDIA Build endpoint", () => {
			expect(getPolicy()).toContain("build.nvidia.com");
		});

		it("whitelists npm registry", () => {
			expect(getPolicy()).toContain("registry.npmjs.org");
		});

		it("sets resource limits (memory, pids, cap_drop ALL)", () => {
			const policy = getPolicy();
			expect(policy).toContain("memory: 512m");
			expect(policy).toContain("pids: 256");
			expect(policy).toContain("drop:");
			expect(policy).toContain("- ALL");
		});

		it("has writable /sandbox and /tmp paths", () => {
			const policy = getPolicy();
			expect(policy).toContain("- /sandbox");
			expect(policy).toContain("- /tmp");
		});

		it("sets filesystem to read-only by default", () => {
			expect(getPolicy()).toContain("readOnly: true");
		});
	});

	// ── Inference profile ────────────────────────────────────────────────────

	describe("inference profile", () => {
		const getProfile = () =>
			generateNemoClaw(defaultOptions)["nemoclaw-blueprint/inference.yaml"];

		it("uses NVIDIA provider", () => {
			expect(getProfile()).toContain("name: nvidia");
		});

		it("points to NVIDIA API endpoint", () => {
			expect(getProfile()).toContain("integrate.api.nvidia.com/v1");
		});

		it("uses default Nemotron model", () => {
			expect(getProfile()).toContain("nvidia/nemotron-3-super-120b-a12b");
		});

		it("references NVIDIA_API_KEY env var", () => {
			expect(getProfile()).toContain("NVIDIA_API_KEY");
		});

		it("has disabled Ollama fallback by default", () => {
			const profile = getProfile();
			expect(profile).toContain("fallback:");
			expect(profile).toContain("enabled: false");
		});

		it("uses custom model when specified", () => {
			const files = generateNemoClaw({
				...defaultOptions,
				model: "nvidia/nemotron-mini-4b-instruct",
				contextWindow: 8192,
			});
			const profile = files["nemoclaw-blueprint/inference.yaml"];
			expect(profile).toContain("nvidia/nemotron-mini-4b-instruct");
			expect(profile).toContain("contextWindow: 8192");
		});
	});

	// ── Setup script ─────────────────────────────────────────────────────────

	describe("setup script", () => {
		const getScript = () =>
			generateNemoClaw(defaultOptions)["scripts/nemoclaw-setup.sh"];

		it("has bash shebang", () => {
			expect(getScript()).toMatch(/^#!/);
		});

		it("uses strict mode (set -euo pipefail)", () => {
			expect(getScript()).toContain("set -euo pipefail");
		});

		it("checks for Node.js prerequisite", () => {
			expect(getScript()).toContain("command -v node");
		});

		it("checks for Docker prerequisite", () => {
			expect(getScript()).toContain("command -v docker");
		});

		it("checks for NVIDIA_API_KEY", () => {
			expect(getScript()).toContain("NVIDIA_API_KEY");
		});

		it("installs nemoclaw CLI", () => {
			expect(getScript()).toContain("npm install -g @nvidia/nemoclaw");
		});

		it("runs nemoclaw onboard", () => {
			expect(getScript()).toContain("nemoclaw onboard");
		});

		it("starts docker compose", () => {
			expect(getScript()).toContain("docker compose up -d");
		});

		it("includes health check with timeout", () => {
			const script = getScript();
			expect(script).toContain("healthz");
			expect(script).toContain("HEALTH_TIMEOUT");
		});

		it("includes project name", () => {
			expect(getScript()).toContain("test-project");
		});

		it("uses custom gateway port", () => {
			const files = generateNemoClaw({
				projectName: "custom-port",
				gatewayPort: 9999,
			});
			expect(files["scripts/nemoclaw-setup.sh"]).toContain("9999");
		});
	});
});
