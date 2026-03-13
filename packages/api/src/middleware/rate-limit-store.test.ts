import { afterEach, describe, expect, it } from "vitest";
import {
	createRateLimitStore,
	MemoryRateLimitStore,
	RedisRateLimitStore,
} from "./rate-limit-store.js";

describe("MemoryRateLimitStore", () => {
	it("returns count=1 on first call", async () => {
		const store = new MemoryRateLimitStore();
		const result = await store.increment("test-key", 60_000);
		expect(result.count).toBe(1);
		expect(result.resetAt).toBeGreaterThan(Date.now() - 100);
	});

	it("increments count on subsequent calls within window", async () => {
		const store = new MemoryRateLimitStore();
		await store.increment("test-key", 60_000);
		const result2 = await store.increment("test-key", 60_000);
		const result3 = await store.increment("test-key", 60_000);
		expect(result2.count).toBe(2);
		expect(result3.count).toBe(3);
	});

	it("resets count after window expires", async () => {
		const store = new MemoryRateLimitStore();
		const first = await store.increment("test-key", 50);
		expect(first.count).toBe(1);

		await new Promise((resolve) => setTimeout(resolve, 80));

		const result = await store.increment("test-key", 50);
		expect(result.count).toBe(1);
	});

	it("tracks different keys independently", async () => {
		const store = new MemoryRateLimitStore();
		await store.increment("key-a", 60_000);
		await store.increment("key-a", 60_000);
		const resultA = await store.increment("key-a", 60_000);

		const resultB = await store.increment("key-b", 60_000);

		expect(resultA.count).toBe(3);
		expect(resultB.count).toBe(1);
	});
});

describe("createRateLimitStore", () => {
	const originalEnv = process.env.REDIS_URL;

	afterEach(() => {
		if (originalEnv === undefined) {
			delete process.env.REDIS_URL;
		} else {
			process.env.REDIS_URL = originalEnv;
		}
	});

	it("returns MemoryRateLimitStore when REDIS_URL is not set", () => {
		delete process.env.REDIS_URL;
		const store = createRateLimitStore();
		expect(store).toBeInstanceOf(MemoryRateLimitStore);
	});

	it("returns RedisRateLimitStore when REDIS_URL is set", () => {
		process.env.REDIS_URL = "redis://localhost:6379";
		const store = createRateLimitStore();
		expect(store).toBeInstanceOf(RedisRateLimitStore);
	});
});
