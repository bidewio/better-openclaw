import type { LogSink, OperationsLogEntry } from "../types.js";

/**
 * Callback sink — delegates to a user-provided function.
 * Useful for tests, Sentry breadcrumbs, WebSocket streaming, etc.
 */
export class CallbackSink implements LogSink {
	constructor(private readonly onEntry: (entry: OperationsLogEntry) => void | Promise<void>) {}

	write(entry: OperationsLogEntry): void | Promise<void> {
		return this.onEntry(entry);
	}
}
