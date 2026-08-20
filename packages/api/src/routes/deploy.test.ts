import { getDeployer } from "@better-openclaw/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.js";

/**
 * Tests for the SSRF protection logic in the deploy route.
 *
 * The validateInstanceUrl function blocks private IPs, localhost,
 * internal hostnames, and non-HTTPS in production.
 */

const validPayload = {
	provider: "dokploy",
	instanceUrl: "https://dokploy.example.com",
	apiKey: "test-key-abc123",
};

const jsonHeaders = {
	"Content-Type": "application/json",
	"X-API-Key": "test-suite-key",
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("POST /api/v1/deploy/test — SSRF protection", () => {
	// ── Localhost / loopback ────────────────────────────────────────────

	it("blocks localhost", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://localhost" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_URL");
		expect(body.error.message).toContain("localhost");
	});

	it("blocks 127.0.0.1", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://127.0.0.1" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_URL");
	});

	it("blocks ::1 (IPv6 loopback)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://[::1]" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_URL");
	});

	it("blocks fe80::/10 (IPv6 link-local)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://[fe80::1]" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_URL");
		expect(body.error.message).toContain("private network");
	});

	it("blocks fc00::/7 (IPv6 unique local addresses)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://[fd12:3456::1]" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_URL");
		expect(body.error.message).toContain("private network");
	});

	it("blocks IPv4-mapped loopback (::ffff:127.0.0.1)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://[::ffff:127.0.0.1]" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_URL");
		expect(body.error.message).toContain("private network");
	});

	it("blocks 0.0.0.0", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://0.0.0.0" }),
		});
		expect(res.status).toBe(400);
	});

	it("blocks subdomain of localhost (foo.localhost)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				...validPayload,
				instanceUrl: "https://foo.localhost",
			}),
		});
		expect(res.status).toBe(400);
	});

	// ── Private IP ranges ──────────────────────────────────────────────

	it("blocks 10.x.x.x (RFC 1918)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://10.0.0.1" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.message).toContain("private network");
	});

	it("blocks 172.16.x.x (RFC 1918)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				...validPayload,
				instanceUrl: "https://172.16.0.1",
			}),
		});
		expect(res.status).toBe(400);
	});

	it("blocks 172.31.x.x (RFC 1918 upper bound)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				...validPayload,
				instanceUrl: "https://172.31.255.255",
			}),
		});
		expect(res.status).toBe(400);
	});

	it("allows 172.32.x.x (not in private 172.16-31 range)", async () => {
		// 172.32 is outside the 172.16-31 private range.
		// SSRF check should NOT reject it. We test only the SSRF validation
		// by checking that the error (if any) is not INVALID_URL. We use an
		// unknown provider to avoid a real network call.
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				provider: "nonexistent",
				instanceUrl: "https://172.32.0.1",
				apiKey: "test-key",
			}),
		});
		const body = await res.json();
		// Should fail with INVALID_PROVIDER, not INVALID_URL
		expect(body.error.code).toBe("INVALID_PROVIDER");
	});

	it("blocks 192.168.x.x (RFC 1918)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				...validPayload,
				instanceUrl: "https://192.168.1.1",
			}),
		});
		expect(res.status).toBe(400);
	});

	it("blocks 169.254.x.x (link-local)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				...validPayload,
				instanceUrl: "https://169.254.169.254",
			}),
		});
		expect(res.status).toBe(400);
	});

	// ── Internal hostnames ─────────────────────────────────────────────

	it("blocks .internal domains", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				...validPayload,
				instanceUrl: "https://metadata.internal",
			}),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.message).toContain("internal hostname");
	});

	it("blocks .local domains", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				...validPayload,
				instanceUrl: "https://myhost.local",
			}),
		});
		expect(res.status).toBe(400);
	});

	it("blocks .svc.cluster.local (Kubernetes)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				...validPayload,
				instanceUrl: "https://myapp.default.svc.cluster.local",
			}),
		});
		expect(res.status).toBe(400);
	});

	// ── Scheme validation ──────────────────────────────────────────────

	it("blocks non-http(s) schemes (ftp)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "ftp://example.com" }),
		});
		expect(res.status).toBe(400);
	});

	it("rejects invalid URLs", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "not-a-url" }),
		});
		expect(res.status).toBe(400);
	});

	// ── Provider validation ────────────────────────────────────────────

	it("rejects unknown provider", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				...validPayload,
				provider: "nonexistent",
				instanceUrl: "https://example.com",
			}),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_PROVIDER");
		expect(body.error.message).toContain("Available:");
	});

	it("allows global IPv6 addresses", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				...validPayload,
				provider: "nonexistent",
				instanceUrl: "https://[2001:4860:4860::8888]",
			}),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_PROVIDER");
	});
});

describe("GET /api/v1/deploy/providers", () => {
	it("returns list of available providers", async () => {
		const res = await app.request("/api/v1/deploy/providers");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.providers).toBeInstanceOf(Array);
		expect(body.providers.length).toBeGreaterThan(0);
		for (const p of body.providers) {
			expect(p).toHaveProperty("id");
			expect(p).toHaveProperty("name");
		}
	});

	it("includes dokploy and coolify", async () => {
		const res = await app.request("/api/v1/deploy/providers");
		const body = await res.json();
		const ids = body.providers.map((p: { id: string }) => p.id);
		expect(ids).toContain("dokploy");
		expect(ids).toContain("coolify");
	});
});

describe("POST /api/v1/deploy/servers — SSRF protection", () => {
	it("blocks private IPs on server listing", async () => {
		const res = await app.request("/api/v1/deploy/servers", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://10.0.0.1" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_URL");
	});
});

describe("POST /api/v1/deploy — logger propagation", () => {
	it("passes request logger into deployer.deploy", async () => {
		const deployer = getDeployer("dokploy");
		expect(deployer).toBeDefined();
		if (!deployer) {
			throw new Error("Dokploy deployer is not registered");
		}

		const deploySpy = vi.spyOn(deployer, "deploy").mockResolvedValue({
			success: true,
			steps: [{ step: "mock", status: "done" }],
		});

		const res = await app.request("/api/v1/deploy", {
			method: "POST",
			headers: {
				...jsonHeaders,
				"x-request-id": "req-logger-propagation",
			},
			body: JSON.stringify({
				...validPayload,
				projectName: "logger-check",
				composeYaml: "services:\n  redis:\n    image: redis:7",
				envContent: "REDIS_URL=redis://localhost:6379",
			}),
		});

		expect(res.status).toBe(200);
		expect(deploySpy).toHaveBeenCalledTimes(1);
		const [input] = deploySpy.mock.calls[0] ?? [];
		expect(input).toBeDefined();
		expect(input?.logger).toBeDefined();
		expect(typeof input?.logger?.info).toBe("function");
	});
});
