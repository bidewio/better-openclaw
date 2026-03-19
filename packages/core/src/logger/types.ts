/** Log severity levels. */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Outcome of an operation. */
export type OperationOutcome = "success" | "failure" | "warning" | "skipped" | "in_progress";

/** Source package that generated the log entry. */
export type LogSource = "cli" | "api" | "mcp" | "web" | "core";

/** High-level operation categories. */
export type OperationCategory =
	| "generation"
	| "deployment"
	| "file_operation"
	| "server_interaction"
	| "api_request"
	| "mcp_tool_call"
	| "validation"
	| "resolution"
	| "connection_test"
	| "system";

/** A single step within a multi-step operation. */
export interface OperationStep {
	name: string;
	status: OperationOutcome;
	detail?: string;
	startedAt: string;
	completedAt?: string;
	durationMs?: number;
}

/** Core log entry — every log event produces one of these. */
export interface OperationsLogEntry {
	/** Unique ID for this log entry. */
	id: string;
	/** ISO 8601 timestamp. */
	timestamp: string;
	/** Severity level. */
	level: LogLevel;
	/** Source package. */
	source: LogSource;
	/** Operation category. */
	category: OperationCategory;
	/** Human-readable message. */
	message: string;
	/** Outcome of the operation. */
	outcome?: OperationOutcome;
	/** Correlation ID — links related operations across packages. */
	correlationId: string;
	/** Session ID — groups operations in a single CLI run / API session. */
	sessionId?: string;
	/** Duration in milliseconds (for completed operations). */
	durationMs?: number;
	/** Sub-steps for multi-step operations. */
	steps?: OperationStep[];
	/** Structured context data (varies by category). */
	context?: Record<string, unknown>;
	/** Error information. */
	error?: {
		name: string;
		message: string;
		stack?: string;
		code?: string;
	};
	/** Files affected (for file_operation category). */
	filesAffected?: {
		created?: string[];
		modified?: string[];
		deleted?: string[];
	};
	/** Tags for filtering. */
	tags?: string[];
}

/** A sink receives log entries and writes them somewhere (file, console, HTTP, etc.). */
export interface LogSink {
	write(entry: OperationsLogEntry): void | Promise<void>;
	flush?(): void | Promise<void>;
	destroy?(): void | Promise<void>;
}

/** Options for creating an OperationsLogger. */
export interface OperationsLoggerOptions {
	source: LogSource;
	sinks?: LogSink[];
	correlationId?: string;
	sessionId?: string;
	minLevel?: LogLevel;
}
