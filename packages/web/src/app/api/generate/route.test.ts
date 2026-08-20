import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

const coreMocks = vi.hoisted(() => ({
	safeParse: vi.fn(),
	generate: vi.fn(),
}));

// route.ts imports from the SUBPATH entrypoints, not the bare specifier —
// mocking "@better-openclaw/core" here silently does nothing and the real
// generator runs instead, which made these assertions meaningless.
vi.mock("@better-openclaw/core/schema", () => ({
	GenerationInputSchema: {
		safeParse: coreMocks.safeParse,
	},
}));

vi.mock("@better-openclaw/core/generate", () => ({
	generate: coreMocks.generate,
}));

import { POST } from "./route";

describe("POST /api/generate", () => {
	beforeEach(() => {
		coreMocks.safeParse.mockReset();
		coreMocks.generate.mockReset();
	});

	it("returns a validation error for invalid request bodies", async () => {
		coreMocks.safeParse.mockReturnValue({
			success: false,
			error: {
				issues: [{ path: ["services"], message: "Required" }],
			},
		});

		const response = await POST(
			new Request("http://localhost/api/generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			}),
		);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: {
				code: "VALIDATION_ERROR",
				message: "Invalid request body",
			},
		});
		expect(coreMocks.generate).not.toHaveBeenCalled();
	});

	it("returns the generated stack as JSON by default", async () => {
		const parsedInput = {
			projectName: "demo",
			services: ["redis"],
		};
		const generatedResult = {
			files: {
				"docker-compose.yml": "services:\n  redis:\n    image: redis:7",
			},
			metadata: {
				warnings: [],
			},
		};

		coreMocks.safeParse.mockReturnValue({ success: true, data: parsedInput });
		coreMocks.generate.mockReturnValue(generatedResult);

		const response = await POST(
			new Request("http://localhost/api/generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(parsedInput),
			}),
		);

		expect(coreMocks.generate).toHaveBeenCalledWith(parsedInput);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(generatedResult);
	});

	it("returns a zip archive when requested", async () => {
		const parsedInput = {
			projectName: "demo",
			services: ["redis"],
		};
		const generatedResult = {
			files: {
				"docker-compose.yml": "services:\n  redis:\n    image: redis:7",
				".env": "REDIS_PASSWORD=secret",
			},
			metadata: {
				warnings: [],
			},
		};

		coreMocks.safeParse.mockReturnValue({ success: true, data: parsedInput });
		coreMocks.generate.mockReturnValue(generatedResult);

		const response = await POST(
			new Request("http://localhost/api/generate?format=zip", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(parsedInput),
			}),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/zip");
		expect(response.headers.get("Content-Disposition")).toContain("demo.zip");

		const zip = await JSZip.loadAsync(await response.arrayBuffer());
		await expect(zip.file("demo/docker-compose.yml")?.async("string")).resolves.toContain(
			"redis:7",
		);
		await expect(zip.file("demo/.env")?.async("string")).resolves.toContain(
			"REDIS_PASSWORD=secret",
		);
	});

	it("returns a generation error when stack generation throws", async () => {
		const parsedInput = {
			projectName: "demo",
			services: ["redis"],
		};

		coreMocks.safeParse.mockReturnValue({ success: true, data: parsedInput });
		coreMocks.generate.mockImplementation(() => {
			throw new Error("Generation exploded");
		});

		const response = await POST(
			new Request("http://localhost/api/generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(parsedInput),
			}),
		);

		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toMatchObject({
			error: {
				code: "GENERATION_ERROR",
				message: "Generation exploded",
			},
		});
	});
});
