import { FileSink, OperationsLogger } from "@better-openclaw/core";
import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";

/**
 * Hono middleware that creates a per-request OperationsLogger.
 *
 * Uses the existing X-Request-Id header as correlation ID.
 * The logger is available in route handlers via `c.get("logger")`.
 */
export const operationsLoggerMiddleware = (): MiddlewareHandler => {
	const fileSink = new FileSink({
		logDir: process.env.OPENCLAW_LOG_DIR ?? "./logs",
		filename: "operations",
	});

	return async (c, next) => {
		const correlationId = (c.get("requestId" as never) as string | undefined) ?? randomUUID();

		const logger = new OperationsLogger({
			source: "api",
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
