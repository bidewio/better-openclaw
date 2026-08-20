import { randomUUID } from "node:crypto";
import type {
	LogLevel,
	LogSink,
	LogSource,
	OperationCategory,
	OperationOutcome,
	OperationStep,
	OperationsLogEntry,
	OperationsLoggerOptions,
} from "./types.js";

/** Keys that must never appear in logged context. */
const SENSITIVE_KEYS = new Set([
	"apikey",
	"api_key",
	"password",
	"token",
	"secret",
	"authorization",
	"credentials",
	"private_key",
	"privatekey",
]);

const LEVEL_ORDER: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

/** Strip sensitive keys from a context object (deep recursive). */
function sanitizeContext(
	ctx: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!ctx) return ctx;
	return sanitizeValue(ctx) as Record<string, unknown>;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
	// Prevent infinite recursion on deeply nested objects
	if (depth > 10) return "[TRUNCATED]";

	if (value === null || value === undefined) return value;
	if (typeof value !== "object") return value;
	if (value instanceof Date) return value.toISOString();

	if (Array.isArray(value)) {
		return value.map((item) => sanitizeValue(item, depth + 1));
	}

	const clean: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
		if (SENSITIVE_KEYS.has(key.toLowerCase())) {
			clean[key] = "[REDACTED]";
		} else {
			clean[key] = sanitizeValue(val, depth + 1);
		}
	}
	return clean;
}

/**
 * Tracks individual steps within a multi-step operation (e.g. deploy, generate).
 */
export class StepTracker {
	private steps: OperationStep[] = [];
	private currentStep: OperationStep | null = null;
	private readonly operationStart = Date.now();

	constructor(
		private readonly logger: OperationsLogger,
		private readonly category: OperationCategory,
		private readonly operationName: string,
	) {}

	/** Start a new step. Automatically completes the previous step if still open. */
	begin(name: string, detail?: string): void {
		if (this.currentStep && this.currentStep.status === "in_progress") {
			this.currentStep.status = "success";
			this.currentStep.completedAt = new Date().toISOString();
			this.currentStep.durationMs = Date.now() - new Date(this.currentStep.startedAt).getTime();
		}
		this.currentStep = {
			name,
			status: "in_progress",
			detail,
			startedAt: new Date().toISOString(),
		};
		this.steps.push(this.currentStep);
		this.logger.debug(this.category, `[${this.operationName}] ${name}`, {
			step: name,
			detail,
		});
	}

	/** Mark the current step as completed. */
	complete(detail?: string): void {
		if (!this.currentStep) return;
		this.currentStep.status = "success";
		this.currentStep.completedAt = new Date().toISOString();
		this.currentStep.durationMs = Date.now() - new Date(this.currentStep.startedAt).getTime();
		if (detail) this.currentStep.detail = detail;
	}

	/** Mark the current step as failed. */
	fail(error: string): void {
		if (!this.currentStep) return;
		this.currentStep.status = "failure";
		this.currentStep.completedAt = new Date().toISOString();
		this.currentStep.durationMs = Date.now() - new Date(this.currentStep.startedAt).getTime();
		this.currentStep.detail = error;
	}

	/** Record a skipped step. */
	skip(name: string, reason?: string): void {
		this.steps.push({
			name,
			status: "skipped",
			detail: reason,
			startedAt: new Date().toISOString(),
			completedAt: new Date().toISOString(),
			durationMs: 0,
		});
	}

	/** Finalize and log the full operation summary. Returns all steps. */
	finalize(outcome: OperationOutcome): OperationStep[] {
		// Close any open step
		if (this.currentStep && this.currentStep.status === "in_progress") {
			this.currentStep.status = outcome === "failure" ? "failure" : "success";
			this.currentStep.completedAt = new Date().toISOString();
			this.currentStep.durationMs = Date.now() - new Date(this.currentStep.startedAt).getTime();
		}

		this.logger.log({
			level: outcome === "failure" ? "error" : "info",
			category: this.category,
			message: `${this.operationName} ${outcome}`,
			outcome,
			durationMs: Date.now() - this.operationStart,
			steps: this.steps,
		});
		return this.steps;
	}

	/** Get the current list of steps (snapshot). */
	getSteps(): OperationStep[] {
		return [...this.steps];
	}
}

/**
 * Centralized operations logger.
 *
 * Follows fire-and-forget semantics — sink errors are silently caught and
 * logging never blocks or crashes the main flow.
 */
export class OperationsLogger {
	private readonly source: LogSource;
	private readonly sinks: LogSink[];
	private readonly correlationId: string;
	private readonly sessionId: string;
	private readonly minLevel: LogLevel;

	constructor(options: OperationsLoggerOptions) {
		this.source = options.source;
		this.sinks = options.sinks ?? [];
		this.correlationId = options.correlationId ?? randomUUID();
		this.sessionId = options.sessionId ?? randomUUID();
		this.minLevel = options.minLevel ?? "info";
	}

	/** Create a child logger that inherits correlation/session but can override source or sinks. */
	child(overrides: Partial<OperationsLoggerOptions>): OperationsLogger {
		return new OperationsLogger({
			source: overrides.source ?? this.source,
			sinks: overrides.sinks ?? this.sinks,
			correlationId: overrides.correlationId ?? this.correlationId,
			sessionId: overrides.sessionId ?? this.sessionId,
			minLevel: overrides.minLevel ?? this.minLevel,
		});
	}

	/** Log an operation with full context. Fire-and-forget to all sinks. */
	log(
		entry: Omit<OperationsLogEntry, "id" | "timestamp" | "source" | "correlationId" | "sessionId">,
	): void {
		if (!this.shouldLog(entry.level)) return;

		const full: OperationsLogEntry = {
			id: randomUUID(),
			timestamp: new Date().toISOString(),
			source: this.source,
			correlationId: this.correlationId,
			sessionId: this.sessionId,
			...entry,
			context: sanitizeContext(entry.context),
		};

		for (const sink of this.sinks) {
			try {
				const result = sink.write(full);
				if (result instanceof Promise) {
					result.catch(() => {});
				}
			} catch {
				// Sink failures must never crash the main flow
			}
		}
	}

	info(category: OperationCategory, message: string, context?: Record<string, unknown>): void {
		this.log({ level: "info", category, message, context });
	}

	warn(category: OperationCategory, message: string, context?: Record<string, unknown>): void {
		this.log({ level: "warn", category, message, context });
	}

	error(
		category: OperationCategory,
		message: string,
		err?: Error | null,
		context?: Record<string, unknown>,
	): void {
		this.log({
			level: "error",
			category,
			message,
			context,
			error: err
				? {
						name: err.name,
						message: err.message,
						stack: err.stack,
						code: (err as { code?: string }).code,
					}
				: undefined,
		});
	}

	debug(category: OperationCategory, message: string, context?: Record<string, unknown>): void {
		this.log({ level: "debug", category, message, context });
	}

	/**
	 * Log a timed operation. Wraps an async/sync function with start/end/duration logging.
	 * Re-throws the original error on failure.
	 */
	async timed<T>(
		category: OperationCategory,
		message: string,
		fn: () => T | Promise<T>,
		context?: Record<string, unknown>,
	): Promise<T> {
		const start = Date.now();
		this.log({
			level: "info",
			category,
			message,
			outcome: "in_progress",
			context,
		});
		try {
			const result = await fn();
			this.log({
				level: "info",
				category,
				message,
				outcome: "success",
				durationMs: Date.now() - start,
				context,
			});
			return result;
		} catch (err) {
			this.log({
				level: "error",
				category,
				message,
				outcome: "failure",
				durationMs: Date.now() - start,
				error:
					err instanceof Error
						? {
								name: err.name,
								message: err.message,
								stack: err.stack,
								code: (err as { code?: string }).code,
							}
						: { name: "UnknownError", message: String(err) },
				context,
			});
			throw err;
		}
	}

	/** Create a step tracker for multi-step operations (deploy, generate pipeline). */
	createStepTracker(category: OperationCategory, operationName: string): StepTracker {
		return new StepTracker(this, category, operationName);
	}

	/** Flush all sinks. */
	async flush(): Promise<void> {
		for (const sink of this.sinks) {
			if (sink.flush) {
				try {
					await sink.flush();
				} catch {
					// Silent
				}
			}
		}
	}

	/** Destroy all sinks (cleanup timers, close streams). */
	async destroy(): Promise<void> {
		for (const sink of this.sinks) {
			if (sink.destroy) {
				try {
					await sink.destroy();
				} catch {
					// Silent
				}
			}
		}
	}

	getCorrelationId(): string {
		return this.correlationId;
	}

	getSessionId(): string {
		return this.sessionId;
	}

	private shouldLog(level: LogLevel): boolean {
		return LEVEL_ORDER[level] >= LEVEL_ORDER[this.minLevel];
	}
}
