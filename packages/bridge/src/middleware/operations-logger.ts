import { randomUUID } from "node:crypto";
import { OperationsLogger } from "@better-openclaw/core";
import { FileSink } from "@better-openclaw/core/logger/sinks/file-sink";
import type { MiddlewareHandler } from "hono";

/**
 * Hono middleware that creates a per-request OperationsLogger for the bridge.
 * Logs method, path, status, and duration for every request.
 */
export const operationsLoggerMiddleware = (): MiddlewareHandler => {
	const fileSink = new FileSink({
		logDir: process.env.OPENCLAW_LOG_DIR ?? "./logs",
		filename: "bridge-operations",
	});

	return async (c, next) => {
		const correlationId = c.req.header("X-Request-Id") ?? randomUUID();

		const logger = new OperationsLogger({
			source: "bridge",
			correlationId,
			sinks: [fileSink],
			minLevel: (process.env.OPENCLAW_LOG_LEVEL as "debug" | "info" | "warn" | "error") ?? "info",
		});

		c.set("logger" as never, logger as never);

		const start = Date.now();
		await next();

		logger.info("api_request", `${c.req.method} ${c.req.path}`, {
			method: c.req.method,
			path: c.req.path,
			statusCode: c.res.status,
			durationMs: Date.now() - start,
		});
	};
};
