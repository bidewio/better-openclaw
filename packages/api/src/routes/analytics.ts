import { getServiceById } from "@better-openclaw/core";
import { analyticsEvent, db } from "@better-openclaw/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { count, desc, eq, sql } from "drizzle-orm";

const route = new OpenAPIHono();

// ── Schemas ──────────────────────────────────────────────────────────────────

function extractRows<T>(result: unknown): T[] {
	if (Array.isArray(result)) {
		return result as T[];
	}
	if (typeof result === "object" && result !== null && "rows" in result) {
		const rows = (result as { rows?: unknown }).rows;
		if (Array.isArray(rows)) {
			return rows as T[];
		}
	}
	return [];
}

const AnalyticsEventSchema = z
	.object({
		source: z.enum(["cli", "web", "api", "mcp"]),
		buildMethod: z.enum(["preset", "custom"]),
		presetId: z.string().nullable(),
		services: z.array(z.string()),
		skillPacks: z.array(z.string()).default([]),
		serviceCount: z.number().int().positive(),
		proxy: z.enum(["none", "caddy", "traefik"]),
		deployment: z.enum(["local", "vps", "homelab", "clawexa"]),
		deploymentType: z.enum(["docker", "bare-metal"]),
		platform: z.string(),
		gpu: z.boolean().default(false),
		monitoring: z.boolean().default(false),
		hasDomain: z.boolean().default(false),
		openclawImage: z.enum(["official", "coolify", "alpine"]),
		estimatedMemoryMB: z.number().int().positive(),
	})
	.openapi("AnalyticsEvent");

// ── POST /event ──────────────────────────────────────────────────────────────

const trackEvent = createRoute({
	method: "post",
	path: "/event",
	tags: ["Analytics"],
	summary: "Track a stack generation event",
	description: "Anonymous event tracking — no PII collected.",
	request: {
		body: {
			required: true,
			content: { "application/json": { schema: AnalyticsEventSchema } },
		},
	},
	responses: {
		201: {
			description: "Event tracked",
			content: {
				"application/json": {
					schema: z.object({ success: z.boolean() }),
				},
			},
		},
		400: {
			description: "Validation error",
			content: {
				"application/json": {
					schema: z.object({
						error: z.object({ code: z.string(), message: z.string() }),
					}),
				},
			},
		},
	},
});

// biome-ignore lint/suspicious/noExplicitAny: Hono OpenAPI handler typing workaround
route.openapi(trackEvent, async (c: any) => {
	const data = c.req.valid("json");

	await db.insert(analyticsEvent).values({
		source: data.source,
		buildMethod: data.buildMethod,
		presetId: data.presetId,
		services: data.services,
		skillPacks: data.skillPacks,
		serviceCount: data.serviceCount,
		proxy: data.proxy,
		deployment: data.deployment,
		deploymentType: data.deploymentType,
		platform: data.platform,
		gpu: data.gpu,
		monitoring: data.monitoring,
		hasDomain: data.hasDomain,
		openclawImage: data.openclawImage,
		estimatedMemoryMB: data.estimatedMemoryMB,
	});

	return c.json({ success: true }, 201);
});

// ── GET /stats ───────────────────────────────────────────────────────────────

const getStats = createRoute({
	method: "get",
	path: "/stats",
	tags: ["Analytics"],
	summary: "Get aggregated analytics data",
	description: "Public endpoint returning aggregate metrics for the analytics dashboard.",
	responses: {
		200: {
			description: "Analytics statistics",
			content: {
				"application/json": {
					schema: z.object({
						totals: z.object({
							totalStacks: z.number(),
							cliCount: z.number(),
							webCount: z.number(),
							apiCount: z.number(),
							mcpCount: z.number(),
							topService: z.string().nullable(),
							topPreset: z.string().nullable(),
						}),
						timeline: z.object({
							daily: z.array(z.object({ date: z.string(), count: z.number() })),
							monthly: z.array(z.object({ month: z.string(), count: z.number() })),
						}),
						services: z.object({
							topServices: z.array(z.object({ service: z.string(), count: z.number() })),
							categories: z.array(z.object({ category: z.string(), count: z.number() })),
						}),
						presets: z.array(z.object({ preset: z.string(), count: z.number() })),
						deployment: z.object({
							targets: z.array(z.object({ target: z.string(), count: z.number() })),
							types: z.array(z.object({ type: z.string(), count: z.number() })),
							platforms: z.array(z.object({ platform: z.string(), count: z.number() })),
							proxies: z.array(z.object({ proxy: z.string(), count: z.number() })),
						}),
						features: z.object({
							sources: z.array(z.object({ source: z.string(), count: z.number() })),
							gpuPercent: z.number(),
							monitoringPercent: z.number(),
							domainPercent: z.number(),
						}),
					}),
				},
			},
		},
	},
});

// biome-ignore lint/suspicious/noExplicitAny: Hono OpenAPI handler typing workaround
route.openapi(getStats, async (c: any) => {
	const ae = analyticsEvent;

	// Run aggregation queries in parallel
	const [
		totalResult,
		sourceResult,
		topServicesResult,
		presetResult,
		deployTargetResult,
		deployTypeResult,
		platformResult,
		proxyResult,
		dailyResult,
		monthlyResult,
		featureResult,
	] = await Promise.all([
		// Total count
		db.select({ total: count() }).from(ae),

		// Count by source
		db.select({ source: ae.source, total: count() }).from(ae).groupBy(ae.source),

		// Top services (unnest JSONB array, count each)
		db.execute(sql`
			SELECT svc AS service, COUNT(*)::int AS count
			FROM ${ae}, jsonb_array_elements_text(${ae.services}) AS svc
			GROUP BY svc ORDER BY count DESC LIMIT 20
		`),

		// Preset distribution
		db
			.select({ preset: ae.presetId, total: count() })
			.from(ae)
			.where(eq(ae.buildMethod, "preset"))
			.groupBy(ae.presetId)
			.orderBy(desc(count())),

		// Deployment target
		db
			.select({ target: ae.deployment, total: count() })
			.from(ae)
			.groupBy(ae.deployment)
			.orderBy(desc(count())),

		// Deployment type
		db
			.select({ type: ae.deploymentType, total: count() })
			.from(ae)
			.groupBy(ae.deploymentType)
			.orderBy(desc(count())),

		// Platform
		db
			.select({ platform: ae.platform, total: count() })
			.from(ae)
			.groupBy(ae.platform)
			.orderBy(desc(count())),

		// Proxy
		db
			.select({ proxy: ae.proxy, total: count() })
			.from(ae)
			.groupBy(ae.proxy)
			.orderBy(desc(count())),

		// Daily timeline (last 30 days)
		db.execute(sql`
			SELECT to_char(date_trunc('day', ${ae.createdAt}), 'YYYY-MM-DD') AS date,
			       COUNT(*)::int AS count
			FROM ${ae}
			WHERE ${ae.createdAt} >= NOW() - INTERVAL '30 days'
			GROUP BY date ORDER BY date
		`),

		// Monthly timeline (last 12 months)
		db.execute(sql`
			SELECT to_char(date_trunc('month', ${ae.createdAt}), 'YYYY-MM') AS month,
			       COUNT(*)::int AS count
			FROM ${ae}
			WHERE ${ae.createdAt} >= NOW() - INTERVAL '12 months'
			GROUP BY month ORDER BY month
		`),

		// Feature percentages
		db.execute(sql`
			SELECT
				COUNT(*) FILTER (WHERE ${ae.gpu} = true)::float /
					GREATEST(COUNT(*), 1) * 100 AS gpu_percent,
				COUNT(*) FILTER (WHERE ${ae.monitoring} = true)::float /
					GREATEST(COUNT(*), 1) * 100 AS monitoring_percent,
				COUNT(*) FILTER (WHERE ${ae.hasDomain} = true)::float /
					GREATEST(COUNT(*), 1) * 100 AS domain_percent
			FROM ${ae}
		`),
	]);

	const total = totalResult[0]?.total ?? 0;

	// Build source counts map
	const sourceCounts: Record<string, number> = {};
	for (const row of sourceResult) {
		sourceCounts[row.source] = row.total;
	}

	// Derive top service from raw result
	const topServicesRows = extractRows<{
		service: string;
		count: number;
	}>(topServicesResult);
	const topService = topServicesRows[0]?.service ?? null;

	// Derive top preset
	const topPreset = presetResult[0]?.preset ?? null;

	// Build service categories from top services
	const categoryMap = new Map<string, number>();
	for (const row of topServicesRows) {
		const svc = getServiceById(row.service);
		const cat = svc?.category ?? "other";
		categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + row.count);
	}
	const categories = [...categoryMap.entries()]
		.map(([category, cnt]) => ({ category, count: cnt }))
		.sort((a, b) => b.count - a.count);

	const featureRows = extractRows<{
		gpu_percent: number;
		monitoring_percent: number;
		domain_percent: number;
	}>(featureResult);
	const feat = featureRows[0] ?? { gpu_percent: 0, monitoring_percent: 0, domain_percent: 0 };

	const dailyRows = extractRows<{
		date: string;
		count: number;
	}>(dailyResult);
	const monthlyRows = extractRows<{
		month: string;
		count: number;
	}>(monthlyResult);

	return c.json({
		totals: {
			totalStacks: total,
			cliCount: sourceCounts.cli ?? 0,
			webCount: (sourceCounts.web ?? 0) + (sourceCounts.api ?? 0),
			apiCount: sourceCounts.api ?? 0,
			mcpCount: sourceCounts.mcp ?? 0,
			topService,
			topPreset,
		},
		timeline: {
			daily: dailyRows.map((r) => ({ date: r.date, count: Number(r.count) })),
			monthly: monthlyRows.map((r) => ({ month: r.month, count: Number(r.count) })),
		},
		services: {
			topServices: topServicesRows.map((r) => ({
				service: r.service,
				count: Number(r.count),
			})),
			categories,
		},
		presets: presetResult.map((r) => ({
			preset: r.preset ?? "unknown",
			count: r.total,
		})),
		deployment: {
			targets: deployTargetResult.map((r) => ({ target: r.target, count: r.total })),
			types: deployTypeResult.map((r) => ({ type: r.type, count: r.total })),
			platforms: platformResult.map((r) => ({
				platform: r.platform,
				count: r.total,
			})),
			proxies: proxyResult.map((r) => ({ proxy: r.proxy, count: r.total })),
		},
		features: {
			sources: sourceResult.map((r) => ({ source: r.source, count: r.total })),
			gpuPercent: Math.round((Number(feat.gpu_percent) + Number.EPSILON) * 10) / 10,
			monitoringPercent: Math.round((Number(feat.monitoring_percent) + Number.EPSILON) * 10) / 10,
			domainPercent: Math.round((Number(feat.domain_percent) + Number.EPSILON) * 10) / 10,
		},
	});
});

export { route as analyticsRoute };
