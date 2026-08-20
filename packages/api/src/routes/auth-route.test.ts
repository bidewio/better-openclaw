import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
	handler: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
	auth: {
		handler: authMocks.handler,
	},
}));

import { authRoute } from "./auth.js";

describe("authRoute", () => {
	const app = new Hono().route("/auth", authRoute);

	beforeEach(() => {
		authMocks.handler.mockReset();
		authMocks.handler.mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
	});

	it("forwards GET requests to better-auth handler", async () => {
		const res = await app.request("/auth/get-session");

		expect(res.status).toBe(200);
		expect(authMocks.handler).toHaveBeenCalledTimes(1);
		const [request] = authMocks.handler.mock.calls[0] ?? [];
		expect(request).toBeInstanceOf(Request);
		expect(new URL((request as Request).url).pathname).toBe("/auth/get-session");
	});

	it("forwards POST requests to better-auth handler", async () => {
		await app.request("/auth/sign-in/email", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "test@example.com", password: "secret" }),
		});

		expect(authMocks.handler).toHaveBeenCalledTimes(1);
		const [request] = authMocks.handler.mock.calls[0] ?? [];
		expect(new URL((request as Request).url).pathname).toBe("/auth/sign-in/email");
	});

	it("does not match unsupported methods", async () => {
		const res = await app.request("/auth/get-session", { method: "DELETE" });

		expect(res.status).toBe(404);
		expect(authMocks.handler).not.toHaveBeenCalled();
	});
});
