import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const analyticsState = vi.hoisted(() => ({
	insertedEvents: [] as Record<string, unknown>[],
	selectQueue: [] as unknown[],
	executeQueue: [] as unknown[],
}));

const coreMocks = vi.hoisted(() => ({
	getServiceById: vi.fn(),
}));

vi.mock("@better-openclaw/core", () => ({
	getServiceById: coreMocks.getServiceById,
}));

vi.mock("drizzle-orm", () => ({
	count: () => ({ kind: "count" }),
	desc: (value: unknown) => ({ kind: "desc", value }),
	eq: (left: unknown, right: unknown) => ({ kind: "eq", left, right }),
	sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

vi.mock("@better-openclaw/db", () => {
	const analyticsEvent = {
		source: "analyticsEvent.source",
		buildMethod: "analyticsEvent.buildMethod",
		presetId: "analyticsEvent.presetId",
		services: "analyticsEvent.services",
		deployment: "analyticsEvent.deployment",
		deploymentType: "analyticsEvent.deploymentType",
		platform: "analyticsEvent.platform",
		proxy: "analyticsEvent.proxy",
		createdAt: "analyticsEvent.createdAt",
		gpu: "analyticsEvent.gpu",
		monitoring: "analyticsEvent.monitoring",
		hasDomain: "analyticsEvent.hasDomain",
	};

	const db = {
		insert: () => ({
			values: async (payload: Record<string, unknown>) => {
				analyticsState.insertedEvents.push(payload);
			},
		}),
		select: () => {
			const result = analyticsState.selectQueue.shift() ?? [];
			const promise = Promise.resolve(result);
			const builder = Object.assign(promise, {
				from: () => builder,
				where: () => builder,
				groupBy: () => builder,
				orderBy: () => builder,
			});
			return builder;
		},
		execute: async () => analyticsState.executeQueue.shift() ?? [],
	};

	return { analyticsEvent, db };
});

import { analyticsRoute } from "./analytics.js";

describe("analyticsRoute", () => {
	const app = new Hono().route("/analytics", analyticsRoute);

	beforeEach(() => {
		analyticsState.insertedEvents = [];
		analyticsState.selectQueue = [];
		analyticsState.executeQueue = [];
		coreMocks.getServiceById.mockReset();
	});

	it("validates POST /event payloads", async () => {
		const res = await app.request("/analytics/event", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ source: "web" }),
		});

		expect(res.status).toBe(400);
		expect(analyticsState.insertedEvents).toHaveLength(0);
	});

	it("tracks valid events", async () => {
		const res = await app.request("/analytics/event", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				source: "web",
				buildMethod: "custom",
				presetId: null,
				services: ["redis", "qdrant"],
				serviceCount: 2,
				proxy: "none",
				deployment: "local",
				deploymentType: "docker",
				platform: "linux/amd64",
				gpu: false,
				monitoring: true,
				hasDomain: false,
				openclawImage: "official",
				estimatedMemoryMB: 2048,
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(201);
		expect(body.success).toBe(true);
		expect(analyticsState.insertedEvents).toHaveLength(1);
		expect(analyticsState.insertedEvents[0].skillPacks).toEqual([]);
	});

	it("returns aggregated stats shape", async () => {
		analyticsState.selectQueue.push(
			[{ total: 5 }],
			[
				{ source: "cli", total: 2 },
				{ source: "web", total: 1 },
				{ source: "api", total: 1 },
				{ source: "mcp", total: 1 },
			],
			[{ preset: "researcher", total: 3 }],
			[{ target: "local", total: 4 }],
			[{ type: "docker", total: 4 }],
			[{ platform: "linux/amd64", total: 5 }],
			[{ proxy: "none", total: 5 }],
		);

		analyticsState.executeQueue.push(
			{
				rows: [
					{ service: "redis", count: 4 },
					{ service: "qdrant", count: 2 },
				],
			},
			[{ date: "2026-03-01", count: 2 }],
			{ rows: [{ month: "2026-03", count: 5 }] },
			{
				rows: [
					{
						gpu_percent: 33.333,
						monitoring_percent: 66.666,
						domain_percent: 50,
					},
				],
			},
		);

		coreMocks.getServiceById.mockImplementation((serviceId: string) => {
			if (serviceId === "redis") return { category: "database" };
			if (serviceId === "qdrant") return { category: "vector" };
			return undefined;
		});

		const res = await app.request("/analytics/stats");
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.totals).toMatchObject({
			totalStacks: 5,
			cliCount: 2,
			webCount: 2,
			apiCount: 1,
			mcpCount: 1,
			topService: "redis",
			topPreset: "researcher",
		});
		expect(body.services.topServices).toEqual([
			{ service: "redis", count: 4 },
			{ service: "qdrant", count: 2 },
		]);
		expect(body.services.categories).toEqual([
			{ category: "database", count: 4 },
			{ category: "vector", count: 2 },
		]);
		expect(body.timeline.daily).toEqual([{ date: "2026-03-01", count: 2 }]);
		expect(body.timeline.monthly).toEqual([{ month: "2026-03", count: 5 }]);
		expect(body.features).toMatchObject({
			gpuPercent: 33.3,
			monitoringPercent: 66.7,
			domainPercent: 50,
		});
	});
});
