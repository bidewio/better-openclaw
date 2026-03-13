import { describe, expect, it } from "vitest";
import type { ResolverOutput } from "../types.js";
import { generateCloneScripts } from "./clone-repos.js";

/** Minimal resolved output with no services */
function emptyResolved(): ResolverOutput {
	return {
		services: [],
		addedDependencies: [],
		removedConflicts: [],
		warnings: [],
		errors: [],
		isValid: true,
		estimatedMemoryMB: 0,
		aiProviders: [],
		gsdRuntimes: [],
	};
}

/** Create a resolved output with image-based services only */
function imageOnlyResolved(): ResolverOutput {
	return {
		...emptyResolved(),
		services: [
			{
				definition: {
					id: "redis",
					name: "Redis",
					description: "In-memory cache",
					category: "database",
					icon: "🔴",
					image: "redis",
					imageTag: "7-alpine",
					ports: [],
					volumes: [],
					environment: [],
					dependsOn: [],
					restartPolicy: "unless-stopped",
					networks: ["openclaw-network"],
					skills: [],
					openclawEnvVars: [],
					docsUrl: "https://redis.io",
					tags: [],
					maturity: "stable",
					requires: [],
					recommends: [],
					conflictsWith: [],
					gpuRequired: false,
				},
				addedBy: "user",
			},
		],
	};
}

/** Create a resolved output with a git-based service */
function gitServiceResolved(): ResolverOutput {
	return {
		...emptyResolved(),
		services: [
			{
				definition: {
					id: "open-saas",
					name: "Open SaaS",
					description: "SaaS boilerplate",
					category: "saas-boilerplate",
					icon: "🚀",
					gitSource: {
						repoUrl: "https://github.com/wasp-lang/open-saas.git",
						branch: "main",
						subdirectory: "template",
						postCloneCommands: ["cp .env.example .env"],
					},
					buildContext: {
						dockerfile: "Dockerfile",
						context: ".",
					},
					ports: [{ host: 3100, container: 3000, description: "Web app", exposed: true }],
					volumes: [],
					environment: [],
					dependsOn: [],
					restartPolicy: "unless-stopped",
					networks: ["openclaw-network"],
					skills: [],
					openclawEnvVars: [],
					docsUrl: "https://opensaas.sh/docs",
					tags: [],
					maturity: "beta",
					requires: [],
					recommends: [],
					conflictsWith: [],
					gpuRequired: false,
				},
				addedBy: "user",
			},
		],
	};
}

describe("generateCloneScripts", () => {
	it("returns empty object when no git-based services exist", () => {
		const result = generateCloneScripts(emptyResolved());
		expect(result).toEqual({});
	});

	it("returns empty object when only image-based services exist", () => {
		const result = generateCloneScripts(imageOnlyResolved());
		expect(result).toEqual({});
	});

	it("generates bash and PowerShell scripts for git-based services", () => {
		const result = generateCloneScripts(gitServiceResolved());
		expect(Object.keys(result)).toHaveLength(2);
		expect(result).toHaveProperty("scripts/clone-repos.sh");
		expect(result).toHaveProperty("scripts/clone-repos.ps1");
	});

	it("bash script contains clone command with repo URL", () => {
		const result = generateCloneScripts(gitServiceResolved());
		const bash = result["scripts/clone-repos.sh"];
		expect(bash).toContain("https://github.com/wasp-lang/open-saas.git");
		expect(bash).toContain('"open-saas"');
		expect(bash).toContain('"main"');
	});

	it("bash script includes postCloneCommands", () => {
		const result = generateCloneScripts(gitServiceResolved());
		const bash = result["scripts/clone-repos.sh"];
		expect(bash).toContain("cp .env.example .env");
	});

	it("bash script includes git check and idempotency logic", () => {
		const result = generateCloneScripts(gitServiceResolved());
		const bash = result["scripts/clone-repos.sh"];
		expect(bash).toContain("command -v git");
		expect(bash).toContain("clone_or_update");
		expect(bash).toContain("pull --ff-only");
		expect(bash).toContain("git clone --depth 1");
	});

	it("PowerShell script contains clone command with repo URL", () => {
		const result = generateCloneScripts(gitServiceResolved());
		const ps = result["scripts/clone-repos.ps1"];
		expect(ps).toContain("https://github.com/wasp-lang/open-saas.git");
		expect(ps).toContain('"open-saas"');
		expect(ps).toContain("Clone-OrUpdate");
	});

	it("bash script is executable (starts with shebang)", () => {
		const result = generateCloneScripts(gitServiceResolved());
		const bash = result["scripts/clone-repos.sh"];
		expect(bash).toMatch(/^#!/);
	});
});
