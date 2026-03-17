import { describe, expect, it } from "vitest";
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

describe("POST /api/v1/deploy/test — SSRF protection", () => {
	// ── Localhost / loopback ────────────────────────────────────────────

	it("blocks localhost", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://127.0.0.1" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_URL");
	});

	it("blocks ::1 (IPv6 loopback)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://[::1]" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_URL");
	});

	it("blocks 0.0.0.0", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://0.0.0.0" }),
		});
		expect(res.status).toBe(400);
	});

	it("blocks subdomain of localhost (foo.localhost)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://10.0.0.1" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.message).toContain("private network");
	});

	it("blocks 172.16.x.x (RFC 1918)", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...validPayload, instanceUrl: "ftp://example.com" }),
		});
		expect(res.status).toBe(400);
	});

	it("rejects invalid URLs", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...validPayload, instanceUrl: "not-a-url" }),
		});
		expect(res.status).toBe(400);
	});

	// ── Provider validation ────────────────────────────────────────────

	it("rejects unknown provider", async () => {
		const res = await app.request("/api/v1/deploy/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...validPayload, instanceUrl: "https://10.0.0.1" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_URL");
	});
});
