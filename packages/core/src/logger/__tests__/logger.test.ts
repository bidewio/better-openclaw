import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OperationsLogger } from "../logger.js";
import { CallbackSink } from "../sinks/callback-sink.js";
import { ConsoleSink } from "../sinks/console-sink.js";
import { FileSink } from "../sinks/file-sink.js";
import type { OperationsLogEntry } from "../types.js";

type ErrorWithCode = Error & { code?: string };

describe("OperationsLogger", () => {
	it("creates log entries with auto-generated fields", () => {
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "cli",
			sinks: [new CallbackSink((e) => entries.push(e))],
		});

		logger.info("generation", "test message", { key: "value" });

		expect(entries).toHaveLength(1);
		const entry = entries[0];
		expect(entry.id).toBeTruthy();
		expect(entry.timestamp).toBeTruthy();
		expect(entry.source).toBe("cli");
		expect(entry.correlationId).toBeTruthy();
		expect(entry.sessionId).toBeTruthy();
		expect(entry.level).toBe("info");
		expect(entry.category).toBe("generation");
		expect(entry.message).toBe("test message");
		expect(entry.context).toEqual({ key: "value" });
	});

	it("respects minLevel filtering", () => {
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "api",
			sinks: [new CallbackSink((e) => entries.push(e))],
			minLevel: "warn",
		});

		logger.debug("system", "should be filtered");
		logger.info("system", "should be filtered");
		logger.warn("system", "should pass");
		logger.error("system", "should pass");

		expect(entries).toHaveLength(2);
		expect(entries[0].level).toBe("warn");
		expect(entries[1].level).toBe("error");
	});

	it("child logger preserves correlationId and sessionId", () => {
		const entries: OperationsLogEntry[] = [];
		const sink = new CallbackSink((e) => entries.push(e));
		const parent = new OperationsLogger({
			source: "cli",
			sinks: [sink],
			correlationId: "test-corr-id",
			sessionId: "test-sess-id",
		});

		const child = parent.child({ source: "core" });
		child.info("generation", "child message");

		expect(entries).toHaveLength(1);
		expect(entries[0].source).toBe("core");
		expect(entries[0].correlationId).toBe("test-corr-id");
		expect(entries[0].sessionId).toBe("test-sess-id");
	});

	it("sanitizes sensitive context keys", () => {
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "api",
			sinks: [new CallbackSink((e) => entries.push(e))],
		});

		logger.info("deployment", "deploying", {
			apiKey: "sk-secret-123",
			password: "hunter2",
			token: "tok_abc",
			projectName: "my-stack",
			url: "https://example.com",
		});

		const ctx = entries[0].context;
		if (!ctx) {
			throw new Error("Expected context to be present");
		}
		expect(ctx.apiKey).toBe("[REDACTED]");
		expect(ctx.password).toBe("[REDACTED]");
		expect(ctx.token).toBe("[REDACTED]");
		expect(ctx.projectName).toBe("my-stack");
		expect(ctx.url).toBe("https://example.com");
	});

	it("error() logs error details", () => {
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "core",
			sinks: [new CallbackSink((e) => entries.push(e))],
		});

		const err: ErrorWithCode = new Error("something broke");
		err.code = "ECONNREFUSED";
		logger.error("deployment", "deploy failed", err);

		expect(entries[0].level).toBe("error");
		expect(entries[0].error?.name).toBe("Error");
		expect(entries[0].error?.message).toBe("something broke");
		expect(entries[0].error?.code).toBe("ECONNREFUSED");
		expect(entries[0].error?.stack).toBeTruthy();
	});

	it("timed() logs start and success with duration", async () => {
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "cli",
			sinks: [new CallbackSink((e) => entries.push(e))],
		});

		const result = await logger.timed("generation", "generate stack", async () => {
			return 42;
		});

		expect(result).toBe(42);
		expect(entries).toHaveLength(2);
		expect(entries[0].outcome).toBe("in_progress");
		expect(entries[1].outcome).toBe("success");
		expect(entries[1].durationMs).toBeGreaterThanOrEqual(0);
	});

	it("timed() logs failure and re-throws", async () => {
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "api",
			sinks: [new CallbackSink((e) => entries.push(e))],
		});

		await expect(
			logger.timed("deployment", "deploy", async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		expect(entries).toHaveLength(2);
		expect(entries[0].outcome).toBe("in_progress");
		expect(entries[1].outcome).toBe("failure");
		expect(entries[1].error?.message).toBe("boom");
	});

	it("silently handles sink errors", () => {
		const failingSink = {
			write: () => {
				throw new Error("sink exploded");
			},
		};
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "cli",
			sinks: [failingSink, new CallbackSink((e) => entries.push(e))],
		});

		// Should not throw — second sink should still receive the entry
		logger.info("system", "test");
		expect(entries).toHaveLength(1);
	});

	it("silently handles async sink errors", () => {
		const failingSink = {
			write: () => Promise.reject(new Error("async boom")),
		};
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "cli",
			sinks: [failingSink, new CallbackSink((e) => entries.push(e))],
		});

		// Should not throw
		logger.info("system", "test");
		expect(entries).toHaveLength(1);
	});
});

describe("StepTracker", () => {
	it("tracks steps and finalizes with summary", () => {
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "core",
			sinks: [new CallbackSink((e) => entries.push(e))],
		});

		const tracker = logger.createStepTracker("deployment", "Deploy to Dokploy");

		tracker.begin("Find project");
		tracker.complete("Project ID: abc123");

		tracker.begin("Create compose service");
		tracker.complete();

		tracker.skip("Set custom domain", "No domain configured");

		tracker.begin("Trigger deployment");
		tracker.complete();

		const steps = tracker.finalize("success");

		expect(steps).toHaveLength(4);
		expect(steps[0].name).toBe("Find project");
		expect(steps[0].status).toBe("success");
		expect(steps[0].detail).toBe("Project ID: abc123");
		expect(steps[1].name).toBe("Create compose service");
		expect(steps[1].status).toBe("success");
		expect(steps[2].name).toBe("Set custom domain");
		expect(steps[2].status).toBe("skipped");
		expect(steps[3].name).toBe("Trigger deployment");
		expect(steps[3].status).toBe("success");

		// Summary entry should be logged
		const summary = entries.find((e) => e.message === "Deploy to Dokploy success");
		expect(summary).toBeTruthy();
		expect(summary?.outcome).toBe("success");
		expect(summary?.steps).toHaveLength(4);
	});

	it("auto-completes previous step when beginning a new one", () => {
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "core",
			sinks: [new CallbackSink((e) => entries.push(e))],
			minLevel: "info", // filter out debug step logs
		});

		const tracker = logger.createStepTracker("generation", "Generate");

		tracker.begin("Step 1");
		tracker.begin("Step 2"); // should auto-complete Step 1
		tracker.begin("Step 3"); // should auto-complete Step 2

		const steps = tracker.finalize("success");
		expect(steps[0].status).toBe("success"); // auto-completed
		expect(steps[1].status).toBe("success"); // auto-completed
		expect(steps[2].status).toBe("success"); // closed by finalize
	});

	it("marks open step as failure when finalized with failure", () => {
		const entries: OperationsLogEntry[] = [];
		const logger = new OperationsLogger({
			source: "core",
			sinks: [new CallbackSink((e) => entries.push(e))],
		});

		const tracker = logger.createStepTracker("deployment", "Deploy");
		tracker.begin("Connect");
		tracker.fail("Connection refused");

		const steps = tracker.finalize("failure");
		expect(steps[0].status).toBe("failure");
		expect(steps[0].detail).toBe("Connection refused");
	});
});

describe("ConsoleSink", () => {
	it("writes formatted output to console", () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const sink = new ConsoleSink();

		sink.write({
			id: "test-id",
			timestamp: "2026-03-14T10:30:00.123Z",
			level: "info",
			source: "cli",
			category: "generation",
			message: "Stack generated",
			outcome: "success",
			correlationId: "corr-1",
			durationMs: 150,
		});

		expect(logSpy).toHaveBeenCalledWith(
			"[10:30:00] [INFO ] [cli] generation: Stack generated (success) [150ms]",
		);
		logSpy.mockRestore();
	});

	it("uses console.error for error level", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const sink = new ConsoleSink();

		sink.write({
			id: "test-id",
			timestamp: "2026-03-14T10:30:00.123Z",
			level: "error",
			source: "api",
			category: "deployment",
			message: "Deploy failed",
			correlationId: "corr-1",
			error: { name: "Error", message: "timeout" },
		});

		expect(errorSpy).toHaveBeenCalledTimes(2); // line + error detail
		errorSpy.mockRestore();
	});
});

describe("FileSink", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `openclaw-test-logs-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	it("writes NDJSON entries to file", () => {
		const sink = new FileSink({ logDir: testDir, filename: "test" });
		const entry: OperationsLogEntry = {
			id: "test-1",
			timestamp: "2026-03-14T10:30:00.123Z",
			level: "info",
			source: "cli",
			category: "generation",
			message: "test entry",
			correlationId: "corr-1",
		};

		sink.write(entry);

		const logFile = join(testDir, "test.log");
		expect(existsSync(logFile)).toBe(true);

		const content = readFileSync(logFile, "utf-8").trim();
		const parsed = JSON.parse(content);
		expect(parsed.id).toBe("test-1");
		expect(parsed.message).toBe("test entry");
	});

	it("rotates files when size limit is exceeded", () => {
		const sink = new FileSink({
			logDir: testDir,
			filename: "rot",
			maxFileSize: 200, // tiny limit for testing
			maxFiles: 3,
		});

		const entry: OperationsLogEntry = {
			id: "x",
			timestamp: "2026-03-14T10:30:00Z",
			level: "info",
			source: "cli",
			category: "system",
			message: "a".repeat(100), // each entry > 200 bytes as JSON
			correlationId: "c",
		};

		// Write enough entries to trigger rotation
		for (let i = 0; i < 5; i++) {
			sink.write({ ...entry, id: `entry-${i}` });
		}

		// Should have created rotated files
		const rotated1 = join(testDir, "rot.1.log");
		expect(existsSync(rotated1)).toBe(true);
	});
});

describe("CallbackSink", () => {
	it("calls the provided function with each entry", () => {
		const entries: OperationsLogEntry[] = [];
		const sink = new CallbackSink((e) => entries.push(e));

		const entry: OperationsLogEntry = {
			id: "test-1",
			timestamp: "2026-03-14T10:30:00Z",
			level: "info",
			source: "mcp",
			category: "mcp_tool_call",
			message: "generate-stack",
			correlationId: "c",
		};

		sink.write(entry);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toBe(entry);
	});
});
