import {
	appendFileSync,
	existsSync,
	mkdirSync,
	renameSync,
	statSync,
	unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { LogSink, OperationsLogEntry } from "../types.js";

export interface FileSinkOptions {
	/** Log directory. Default: ~/.better-openclaw/logs */
	logDir?: string;
	/** Max file size in bytes before rotation. Default: 10 MB */
	maxFileSize?: number;
	/** Max number of rotated files to keep. Default: 5 */
	maxFiles?: number;
	/** Base filename (without extension). Default: "operations" */
	filename?: string;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_MAX_FILES = 5;

function defaultLogDir(): string {
	return (
		process.env.OPENCLAW_LOG_DIR ??
		join(homedir(), ".better-openclaw", "logs")
	);
}

/**
 * NDJSON file sink with size-based rotation.
 *
 * Writes one JSON object per line (newline-delimited JSON).
 * Rotates files when they exceed maxFileSize:
 *   operations.log → operations.1.log → operations.2.log → ...
 */
export class FileSink implements LogSink {
	private currentSize = 0;
	private initialized = false;
	private readonly logDir: string;
	private readonly maxFileSize: number;
	private readonly maxFiles: number;
	private readonly filename: string;
	private readonly logPath: string;

	constructor(options?: FileSinkOptions) {
		this.logDir = options?.logDir ?? defaultLogDir();
		this.maxFileSize =
			options?.maxFileSize ??
			(process.env.OPENCLAW_LOG_MAX_SIZE
				? Number.parseInt(process.env.OPENCLAW_LOG_MAX_SIZE, 10)
				: DEFAULT_MAX_SIZE);
		this.maxFiles =
			options?.maxFiles ??
			(process.env.OPENCLAW_LOG_MAX_FILES
				? Number.parseInt(process.env.OPENCLAW_LOG_MAX_FILES, 10)
				: DEFAULT_MAX_FILES);
		this.filename = options?.filename ?? "operations";
		this.logPath = join(this.logDir, `${this.filename}.log`);
	}

	write(entry: OperationsLogEntry): void {
		this.ensureDir();
		const line = `${JSON.stringify(entry)}\n`;
		appendFileSync(this.logPath, line, "utf-8");
		this.currentSize += Buffer.byteLength(line, "utf-8");

		if (this.currentSize >= this.maxFileSize) {
			this.rotate();
		}
	}

	private ensureDir(): void {
		if (this.initialized) return;

		if (!existsSync(this.logDir)) {
			mkdirSync(this.logDir, { recursive: true });
		}

		// Seed current size from existing file
		if (existsSync(this.logPath)) {
			try {
				this.currentSize = statSync(this.logPath).size;
			} catch {
				this.currentSize = 0;
			}
		}

		this.initialized = true;
	}

	private rotate(): void {
		// Delete the oldest file if it exists
		const oldest = join(
			this.logDir,
			`${this.filename}.${this.maxFiles}.log`,
		);
		if (existsSync(oldest)) {
			try {
				unlinkSync(oldest);
			} catch {
				// Ignore
			}
		}

		// Shift existing rotated files: N-1 → N, N-2 → N-1, ..., 1 → 2
		for (let i = this.maxFiles - 1; i >= 1; i--) {
			const from = join(this.logDir, `${this.filename}.${i}.log`);
			const to = join(this.logDir, `${this.filename}.${i + 1}.log`);
			if (existsSync(from)) {
				try {
					renameSync(from, to);
				} catch {
					// Ignore
				}
			}
		}

		// Rename current log to .1.log
		if (existsSync(this.logPath)) {
			try {
				renameSync(
					this.logPath,
					join(this.logDir, `${this.filename}.1.log`),
				);
			} catch {
				// Ignore
			}
		}

		this.currentSize = 0;
	}
}
