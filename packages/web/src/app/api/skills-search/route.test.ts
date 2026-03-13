import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("GET /api/skills-search", () => {
	const fetchMock = vi.fn<typeof fetch>();

	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);
		delete process.env.SKILLSMP_API_KEY;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns 400 when the query parameter is missing", async () => {
		const response = await GET(new Request("http://localhost/api/skills-search") as never);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			success: false,
			error: {
				code: "MISSING_QUERY",
			},
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns 500 when the SkillsMP API key is not configured", async () => {
		const response = await GET(
			new Request("http://localhost/api/skills-search?q=openclaw") as never,
		);

		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toMatchObject({
			success: false,
			error: {
				code: "NO_API_KEY",
			},
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("proxies successful upstream responses", async () => {
		process.env.SKILLSMP_API_KEY = "skillsmp-test-key";
		fetchMock.mockResolvedValue(
			new Response(
				JSON.stringify({
					success: true,
					data: [{ id: "skill-1", title: "OpenClaw Stack Generator" }],
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
					},
				},
			),
		);

		const response = await GET(
			new Request("http://localhost/api/skills-search?q=openclaw&page=2&limit=5&mode=ai") as never,
		);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://skillsmp.com/api/v1/skills/ai-search?q=openclaw",
			expect.objectContaining({
				headers: {
					Authorization: "Bearer skillsmp-test-key",
				},
				signal: expect.any(AbortSignal),
			}),
		);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			success: true,
			data: [{ id: "skill-1", title: "OpenClaw Stack Generator" }],
		});
	});

	it("passes through upstream failures", async () => {
		process.env.SKILLSMP_API_KEY = "skillsmp-test-key";
		fetchMock.mockResolvedValue(new Response("rate limited", { status: 429 }));

		const response = await GET(
			new Request("http://localhost/api/skills-search?q=openclaw") as never,
		);

		expect(response.status).toBe(429);
		await expect(response.json()).resolves.toMatchObject({
			success: false,
			error: {
				code: "UPSTREAM_ERROR",
				message: "SkillsMP returned 429",
			},
		});
	});
});
