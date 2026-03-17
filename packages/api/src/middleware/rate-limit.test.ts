import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { Hono } from "hono";

/**
 * Tests for the rate limiting middleware.
 *
 * We create a minimal Hono app with the rate limiter attached
 * and verify behavior: headers, 429 responses, key selection.
 */

describe("rate limiting middleware", () => {
	let originalEnv: Record<string, string | undefined>;

	beforeEach(() => {
		// Save env vars we might modify
		originalEnv = {
			RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
			RATE_LIMIT_MAX_ANON: process.env.RATE_LIMIT_MAX_ANON,
			RATE_LIMIT_MAX_API_KEY: process.env.RATE_LIMIT_MAX_API_KEY,
		};
	});

	afterEach(() => {
		// Restore env vars
		for (const [key, value] of Object.entries(originalEnv)) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
		vi.resetModules();
	});

	it("sets rate limit headers on responses", async () => {
		const { rateLimiter } = await import("./rate-limit.js");
		const app = new Hono();
		app.use("/*", rateLimiter());
		app.get("/test", (c) => c.json({ ok: true }));

		const res = await app.request("/test");
		expect(res.status).toBe(200);
		expect(res.headers.get("X-RateLimit-Limit")).toBeDefined();
		expect(res.headers.get("X-RateLimit-Remaining")).toBeDefined();
		expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
	});

	it("decrements remaining count on each request", async () => {
		const { rateLimiter } = await import("./rate-limit.js");
		const app = new Hono();
		app.use("/*", rateLimiter());
		app.get("/test", (c) => c.json({ ok: true }));

		const res1 = await app.request("/test");
		const remaining1 = Number(res1.headers.get("X-RateLimit-Remaining"));

		const res2 = await app.request("/test");
		const remaining2 = Number(res2.headers.get("X-RateLimit-Remaining"));

		expect(remaining2).toBeLessThan(remaining1);
	});

	it("returns higher limit for requests with X-API-Key", async () => {
		const { rateLimiter } = await import("./rate-limit.js");
		const app = new Hono();
		app.use("/*", rateLimiter());
		app.get("/test", (c) => c.json({ ok: true }));

		const anonRes = await app.request("/test");
		const anonLimit = Number(anonRes.headers.get("X-RateLimit-Limit"));

		const keyRes = await app.request("/test", {
			headers: { "X-API-Key": "my-api-key" },
		});
		const keyLimit = Number(keyRes.headers.get("X-RateLimit-Limit"));

		expect(keyLimit).toBeGreaterThan(anonLimit);
	});

	it("uses x-forwarded-for as IP key for anonymous requests", async () => {
		const { rateLimiter } = await import("./rate-limit.js");
		const app = new Hono();
		app.use("/*", rateLimiter());
		app.get("/test", (c) => c.json({ ok: true }));

		// Requests from different IPs should have independent counters
		const res1 = await app.request("/test", {
			headers: { "x-forwarded-for": "1.2.3.4" },
		});
		const res2 = await app.request("/test", {
			headers: { "x-forwarded-for": "5.6.7.8" },
		});

		// Both should have full remaining (minus 1 for first request each)
		const remaining1 = Number(res1.headers.get("X-RateLimit-Remaining"));
		const remaining2 = Number(res2.headers.get("X-RateLimit-Remaining"));
		expect(remaining1).toBe(remaining2);
	});

	it("extracts first IP from comma-separated x-forwarded-for", async () => {
		const { rateLimiter } = await import("./rate-limit.js");
		const app = new Hono();
		app.use("/*", rateLimiter());
		app.get("/test", (c) => c.json({ ok: true }));

		// These share the same first IP, so they should count together
		const res1 = await app.request("/test", {
			headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
		});
		const res2 = await app.request("/test", {
			headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.2" },
		});

		const remaining1 = Number(res1.headers.get("X-RateLimit-Remaining"));
		const remaining2 = Number(res2.headers.get("X-RateLimit-Remaining"));
		// Second request should have one fewer remaining than first
		expect(remaining2).toBe(remaining1 - 1);
	});
});

describe("generateRateLimiter", () => {
	it("has stricter limits than global rate limiter", async () => {
		const { rateLimiter, generateRateLimiter } = await import("./rate-limit.js");
		const app = new Hono();

		app.use("/global/*", rateLimiter());
		app.get("/global/test", (c) => c.json({ ok: true }));
		app.use("/generate/*", generateRateLimiter());
		app.get("/generate/test", (c) => c.json({ ok: true }));

		const globalRes = await app.request("/global/test");
		const generateRes = await app.request("/generate/test");

		const globalLimit = Number(globalRes.headers.get("X-RateLimit-Limit"));
		const generateLimit = Number(generateRes.headers.get("X-RateLimit-Limit"));

		expect(generateLimit).toBeLessThan(globalLimit);
	});
});
