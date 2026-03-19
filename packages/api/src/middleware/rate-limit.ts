import type { MiddlewareHandler } from "hono";
import { createRateLimitStore, type RateLimitStore } from "./rate-limit-store.js";

interface RateLimitConfig {
	windowMs: number;
	maxAnon: number;
	maxApiKey: number;
}

function getConfig(prefix: string): RateLimitConfig {
	const defaultWindowMs = 60 * 1000; // 1 minute
	const defaultMaxAnon = 30;
	const defaultMaxApiKey = 300;

	const windowMs = Number(
		process.env[`${prefix}RATE_LIMIT_WINDOW_MS`] ??
			process.env.RATE_LIMIT_WINDOW_MS ??
			defaultWindowMs,
	);
	const maxAnon = Number(
		process.env[`${prefix}RATE_LIMIT_MAX_ANON`] ??
			process.env.RATE_LIMIT_MAX_ANON ??
			defaultMaxAnon,
	);
	const maxApiKey = Number(
		process.env[`${prefix}RATE_LIMIT_MAX_API_KEY`] ??
			process.env.RATE_LIMIT_MAX_API_KEY ??
			defaultMaxApiKey,
	);

	return { windowMs, maxAnon, maxApiKey };
}

const store: RateLimitStore = createRateLimitStore();

function createRateLimiter(
	keyPrefix: string,
	configOverrides?: Partial<RateLimitConfig>,
): MiddlewareHandler {
	const config = { ...getConfig(keyPrefix), ...configOverrides };

	return async (c, next): Promise<Response | undefined> => {
		const apiKey = c.req.header("X-API-Key");
		const limit = apiKey ? config.maxApiKey : config.maxAnon;

		const ip =
			c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
			c.req.header("x-real-ip") ||
			"unknown";
		const key = apiKey ? `${keyPrefix}key:${apiKey}` : `${keyPrefix}ip:${ip}`;

		const { count, resetAt } = await store.increment(key, config.windowMs);

		const now = Date.now();
		const remaining = Math.max(0, limit - count);
		const resetSeconds = Math.ceil((resetAt - now) / 1000);

		c.header("X-RateLimit-Limit", String(limit));
		c.header("X-RateLimit-Remaining", String(remaining));
		c.header("X-RateLimit-Reset", String(resetSeconds));

		if (count > limit) {
			return c.json(
				{
					error: {
						code: "RATE_LIMITED",
						message: `Rate limit exceeded. Try again in ${resetSeconds} seconds.`,
					},
				},
				429,
				{ "Retry-After": String(resetSeconds) },
			);
		}

		await next();
		return undefined;
	};
}

/** Global rate limiter. Uses RATE_LIMIT_* env vars; defaults 30/min anon, 300/min with X-API-Key. */
export function rateLimiter(): MiddlewareHandler {
	return createRateLimiter("");
}

/** Stricter rate limiter for expensive routes (e.g. POST /generate). Uses RATE_LIMIT_GENERATE_* or same env; defaults 5/min anon, 10/min with key. */
export function generateRateLimiter(): MiddlewareHandler {
	const windowMs = Number(
		process.env.RATE_LIMIT_GENERATE_WINDOW_MS ?? process.env.RATE_LIMIT_WINDOW_MS ?? 60_000,
	);
	const maxAnon = Number(process.env.RATE_LIMIT_GENERATE_MAX_ANON ?? 5);
	const maxApiKey = Number(process.env.RATE_LIMIT_GENERATE_MAX_API_KEY ?? 10);
	return createRateLimiter("generate_", { windowMs, maxAnon, maxApiKey });
}
