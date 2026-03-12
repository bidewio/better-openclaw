import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const coreMocks = vi.hoisted(() => ({
	getAvailableDeployers: vi.fn(),
	getDeployer: vi.fn(),
	testConnection: vi.fn(),
	deploy: vi.fn(),
	listServers: vi.fn(),
}));

vi.mock("@better-openclaw/core", () => ({
	getAvailableDeployers: coreMocks.getAvailableDeployers,
	getDeployer: coreMocks.getDeployer,
}));

import { deployRoute } from "./deploy.js";

describe("deployRoute", () => {
	const app = new Hono().route("/deploy", deployRoute);

	beforeEach(() => {
		coreMocks.getAvailableDeployers.mockReset();
		coreMocks.getDeployer.mockReset();
		coreMocks.testConnection.mockReset();
		coreMocks.deploy.mockReset();
		coreMocks.listServers.mockReset();

		coreMocks.getAvailableDeployers.mockReturnValue(["dokploy", "coolify"]);
		coreMocks.getDeployer.mockImplementation((provider: string) => {
			if (provider === "dokploy") {
				return {
					name: "Dokploy",
					testConnection: coreMocks.testConnection,
					deploy: coreMocks.deploy,
					listServers: coreMocks.listServers,
				};
			}
			if (provider === "coolify") {
				return {
					name: "Coolify",
					testConnection: coreMocks.testConnection,
					deploy: coreMocks.deploy,
				};
			}
			return undefined;
		});
	});

	it("lists provider ids and names", async () => {
		const res = await app.request("/deploy/providers");
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.providers).toEqual([
			{ id: "dokploy", name: "Dokploy" },
			{ id: "coolify", name: "Coolify" },
		]);
	});

	it("rejects localhost URLs on connection tests", async () => {
		const res = await app.request("/deploy/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				provider: "dokploy",
				instanceUrl: "http://localhost:3000",
				apiKey: "token",
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error.code).toBe("INVALID_URL");
		expect(coreMocks.testConnection).not.toHaveBeenCalled();
	});

	it("rejects unknown providers", async () => {
		const res = await app.request("/deploy/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				provider: "unknown",
				instanceUrl: "https://dokploy.example.com",
				apiKey: "token",
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error.code).toBe("INVALID_PROVIDER");
	});

	it("relays successful connection tests to the deployer", async () => {
		coreMocks.testConnection.mockResolvedValueOnce({ ok: true });

		const res = await app.request("/deploy/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				provider: "dokploy",
				instanceUrl: "https://dokploy.example.com",
				apiKey: "token",
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toEqual({ ok: true, provider: "dokploy" });
		expect(coreMocks.testConnection).toHaveBeenCalledWith({
			instanceUrl: "https://dokploy.example.com",
			apiKey: "token",
		});
	});

	it("rejects private network URLs on deploy", async () => {
		const res = await app.request("/deploy", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				provider: "dokploy",
				instanceUrl: "http://10.0.0.5",
				apiKey: "token",
				projectName: "my-stack",
				composeYaml: "services: {}",
				envContent: "",
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error.code).toBe("INVALID_URL");
		expect(coreMocks.deploy).not.toHaveBeenCalled();
	});

	it("returns an empty servers list when provider does not expose server listing", async () => {
		const res = await app.request("/deploy/servers", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				provider: "coolify",
				instanceUrl: "https://coolify.example.com",
				apiKey: "token",
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.servers).toEqual([]);
	});
});
