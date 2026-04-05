import type { MiddlewareHandler } from "hono";
import { verifyBridgeToken } from "../lib/auth.js";

/**
 * Hono middleware that validates the BRIDGE_TOKEN.
 *
 * If BRIDGE_TOKEN env var is not set, all requests are allowed (dev mode).
 * Otherwise, the request must include `Authorization: Bearer <token>`.
 */
export const bridgeAuth = (): MiddlewareHandler => {
	return async (c, next) => {
		const expected = process.env.BRIDGE_TOKEN;

		// No token configured = development mode, allow all
		if (!expected) {
			await next();
			return;
		}

		const header = c.req.header("Authorization");
		const provided = header?.startsWith("Bearer ")
			? header.slice(7)
			: undefined;

		if (!verifyBridgeToken(provided, expected)) {
			return c.json(
				{ error: { code: "UNAUTHORIZED", message: "Invalid or missing bridge token" } },
				401,
			);
		}

		await next();
	};
};
