import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import { optionalApiKey, requireApiKey } from "./api-key.js";

function createApp(middleware: ReturnType<typeof requireApiKey>) {
	const app = new Hono();
	app.use("/*", middleware);
	app.get("/test", (c) => c.json({ ok: true }));
	return app;
}

describe("requireApiKey", () => {
	const originalEnv = process.env.API_KEYS;

	afterEach(() => {
		if (originalEnv === undefined) {
			delete process.env.API_KEYS;
		} else {
			process.env.API_KEYS = originalEnv;
		}
	});

	it("rejects requests without X-API-Key header", async () => {
		const app = createApp(requireApiKey());
		const res = await app.request("/test");
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("UNAUTHORIZED");
	});

	it("accepts any key when API_KEYS env is not set", async () => {
		delete process.env.API_KEYS;
		const app = createApp(requireApiKey());
		const res = await app.request("/test", {
			headers: { "X-API-Key": "any-key-works" },
		});
		expect(res.status).toBe(200);
	});
});

describe("optionalApiKey", () => {
	const originalEnv = process.env.API_KEYS;

	afterEach(() => {
		if (originalEnv === undefined) {
			delete process.env.API_KEYS;
		} else {
			process.env.API_KEYS = originalEnv;
		}
	});

	it("allows requests without X-API-Key header", async () => {
		const app = createApp(optionalApiKey());
		const res = await app.request("/test");
		expect(res.status).toBe(200);
	});

	it("allows requests with any key when API_KEYS not configured", async () => {
		delete process.env.API_KEYS;
		const app = createApp(optionalApiKey());
		const res = await app.request("/test", {
			headers: { "X-API-Key": "any-key" },
		});
		expect(res.status).toBe(200);
	});
});
