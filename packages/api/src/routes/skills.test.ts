import { describe, expect, it } from "vitest";
import { app } from "../app.js";

describe("GET /api/v1/skills", () => {
	it("returns all skill packs when no filter", async () => {
		const res = await app.request("/api/v1/skills");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty("skillPacks");
		expect(body).toHaveProperty("total");
		expect(body.total).toBeGreaterThan(0);
		expect(body.skillPacks).toBeInstanceOf(Array);
		expect(body.skillPacks.length).toBe(body.total);
	});

	it("filters by compatible services", async () => {
		const res = await app.request("/api/v1/skills?services=redis");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty("skillPacks");
		expect(body).toHaveProperty("filteredBy");
		expect(body.filteredBy).toContain("redis");
	});

	it("handles comma-separated service IDs", async () => {
		const res = await app.request("/api/v1/skills?services=redis,qdrant");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.filteredBy).toContain("redis");
		expect(body.filteredBy).toContain("qdrant");
	});

	it("returns fewer results when filtering by service", async () => {
		const allRes = await app.request("/api/v1/skills");
		const allBody = await allRes.json();

		const filteredRes = await app.request("/api/v1/skills?services=redis");
		const filteredBody = await filteredRes.json();

		expect(filteredBody.total).toBeLessThanOrEqual(allBody.total);
	});

	it("returns total count matching array length", async () => {
		const res = await app.request("/api/v1/skills");
		const body = await res.json();
		expect(body.skillPacks.length).toBe(body.total);
	});
});
