export interface RateLimitResult {
	count: number;
	resetAt: number; // epoch ms
}

export interface RateLimitStore {
	increment(key: string, windowMs: number): Promise<RateLimitResult>;
}

interface RedisPipelineLike {
	incr(key: string): void;
	pttl(key: string): void;
	exec(): Promise<Array<[unknown, number]>>;
}

interface RedisClientLike {
	on(event: "error" | "connect", listener: () => void): void;
	connect(): Promise<void>;
	multi(): RedisPipelineLike;
	pexpire(key: string, ttlMs: number): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

interface MemoryEntry {
	count: number;
	resetAt: number;
}

export class MemoryRateLimitStore implements RateLimitStore {
	private map = new Map<string, MemoryEntry>();
	private cleanupTimer: ReturnType<typeof setInterval>;

	constructor() {
		// Cleanup expired entries every 5 minutes
		this.cleanupTimer = setInterval(
			() => {
				const now = Date.now();
				for (const [key, entry] of this.map) {
					if (entry.resetAt <= now) this.map.delete(key);
				}
			},
			5 * 60 * 1000,
		);
		// Allow the process to exit without waiting for the timer
		if (this.cleanupTimer.unref) this.cleanupTimer.unref();
	}

	async increment(key: string, windowMs: number): Promise<RateLimitResult> {
		const now = Date.now();
		let entry = this.map.get(key);

		if (!entry || entry.resetAt <= now) {
			entry = { count: 0, resetAt: now + windowMs };
			this.map.set(key, entry);
		}

		entry.count++;
		return { count: entry.count, resetAt: entry.resetAt };
	}
}

// ---------------------------------------------------------------------------
// Redis store
// ---------------------------------------------------------------------------

export class RedisRateLimitStore implements RateLimitStore {
	private redisUrl: string;
	private client: RedisClientLike | null = null;
	private connectPromise: Promise<void> | null = null;
	private useFallback = false;
	private fallback = new MemoryRateLimitStore();

	constructor(redisUrl: string) {
		this.redisUrl = redisUrl;
	}

	private async getClient(): Promise<RedisClientLike> {
		if (this.client) return this.client;
		if (this.connectPromise) {
			await this.connectPromise;
			if (!this.client) {
				throw new Error("Redis client not initialized");
			}
			return this.client;
		}

		this.connectPromise = (async () => {
			const { default: Redis } = await import("ioredis");
			this.client = new Redis(this.redisUrl, {
				maxRetriesPerRequest: 1,
				lazyConnect: true,
				connectTimeout: 3000,
			}) as unknown as RedisClientLike;

			this.client.on("error", () => {
				this.useFallback = true;
			});

			this.client.on("connect", () => {
				this.useFallback = false;
			});

			await this.client.connect();
		})();

		await this.connectPromise;
		if (!this.client) {
			throw new Error("Redis client not initialized");
		}
		return this.client;
	}

	async increment(key: string, windowMs: number): Promise<RateLimitResult> {
		if (this.useFallback) {
			return this.fallback.increment(key, windowMs);
		}

		try {
			const client = await this.getClient();

			const pipeline = client.multi();
			pipeline.incr(key);
			pipeline.pttl(key);
			const results = await pipeline.exec();

			// results = [[err, count], [err, pttl]]
			const countResult = results[0];
			const pttlResult = results[1];
			const count: number = typeof countResult?.[1] === "number" ? countResult[1] : 0;
			const pttl: number = typeof pttlResult?.[1] === "number" ? pttlResult[1] : -1;

			// Set expiry only on first increment (PTTL returns -1 when no expiry)
			if (pttl === -1) {
				await client.pexpire(key, windowMs);
			}

			const resetAt = pttl > 0 ? Date.now() + pttl : Date.now() + windowMs;

			return { count, resetAt };
		} catch {
			this.useFallback = true;
			return this.fallback.increment(key, windowMs);
		}
	}
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createRateLimitStore(): RateLimitStore {
	const redisUrl = process.env.REDIS_URL;
	if (redisUrl) {
		return new RedisRateLimitStore(redisUrl);
	}
	return new MemoryRateLimitStore();
}
