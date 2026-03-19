import { describe, expect, it } from "vitest";
import type { GsdRuntime } from "../types.js";
import { generateGsdScripts } from "./get-shit-done.js";

describe("generateGsdScripts", () => {
	it("returns undefined when runtimes is undefined", () => {
		expect(generateGsdScripts(undefined)).toBeUndefined();
	});

	it("returns undefined when runtimes is empty", () => {
		expect(generateGsdScripts([])).toBeUndefined();
	});

	it("generates both sh and ps1 scripts", () => {
		const result = generateGsdScripts(["claude"]);
		expect(result).toBeDefined();
		expect(result?.sh).toBeDefined();
		expect(result?.ps1).toBeDefined();
	});

	it("sh script starts with shebang", () => {
		const result = generateGsdScripts(["claude"]);
		expect(result?.sh).toMatch(/^#!/);
	});

	it("includes runtime flags in sh script", () => {
		const runtimes: GsdRuntime[] = ["claude", "codex"];
		const result = generateGsdScripts(runtimes);
		expect(result?.sh).toContain("--claude");
		expect(result?.sh).toContain("--codex");
	});

	it("includes runtime flags in ps1 script", () => {
		const runtimes: GsdRuntime[] = ["claude", "codex"];
		const result = generateGsdScripts(runtimes);
		expect(result?.ps1).toContain("--claude");
		expect(result?.ps1).toContain("--codex");
	});

	it("uses npx to run get-shit-done", () => {
		const result = generateGsdScripts(["claude"]);
		expect(result?.sh).toContain("npx get-shit-done-cc@latest");
		expect(result?.ps1).toContain("npx get-shit-done-cc@latest");
	});

	it("includes npx availability check", () => {
		const result = generateGsdScripts(["claude"]);
		expect(result?.sh).toContain("command -v npx");
		expect(result?.ps1).toContain("Get-Command npx");
	});

	it("lists runtimes in output message", () => {
		const runtimes: GsdRuntime[] = ["claude", "codex"];
		const result = generateGsdScripts(runtimes);
		expect(result?.sh).toContain("claude, codex");
		expect(result?.ps1).toContain("claude, codex");
	});
});
