import type { LogSink, OperationsLogEntry } from "../types.js";

/**
 * Human-readable console output sink.
 * Formats log entries as single-line summaries with optional step details.
 */
export class ConsoleSink implements LogSink {
	write(entry: OperationsLogEntry): void {
		const time = entry.timestamp.slice(11, 19);
		const lvl = entry.level.toUpperCase().padEnd(5);
		const src = entry.source;
		const outcome = entry.outcome ? ` (${entry.outcome})` : "";
		const duration = entry.durationMs != null ? ` [${entry.durationMs}ms]` : "";

		const line = `[${time}] [${lvl}] [${src}] ${entry.category}: ${entry.message}${outcome}${duration}`;

		switch (entry.level) {
			case "error":
				console.error(line);
				break;
			case "warn":
				console.warn(line);
				break;
			default:
				console.log(line);
		}

		if (entry.steps) {
			for (const step of entry.steps) {
				const icon =
					step.status === "success"
						? "+"
						: step.status === "failure"
							? "x"
							: step.status === "skipped"
								? "-"
								: "~";
				const stepDuration = step.durationMs != null ? ` [${step.durationMs}ms]` : "";
				const detail = step.detail ? ` (${step.detail})` : "";
				console.log(`  ${icon} ${step.name}${detail}${stepDuration}`);
			}
		}

		if (entry.error) {
			console.error(`  Error: ${entry.error.message}`);
			if (entry.error.stack) {
				console.error(`  ${entry.error.stack}`);
			}
		}
	}
}
