import { describe, expect, it } from "vitest";
import { resolve } from "../resolver.js";
import type { ResolverOutput } from "../types.js";
import { generateTraefikConfig } from "./traefik.js";

function resolveWith(services: string[]): ResolverOutput {
	return resolve({ services, skillPacks: [], proxy: "traefik", gpu: false });
}

function getLabels(
	serviceLabels: Map<string, Record<string, string>>,
	serviceId: string,
): Record<string, string> {
	const labels = serviceLabels.get(serviceId);
	expect(labels).toBeDefined();
	if (!labels) {
		throw new Error(`Expected labels for ${serviceId}`);
	}
	return labels;
}

describe("generateTraefikConfig", () => {
	const domain = "example.com";

	it("generates static config with domain email and entrypoints", () => {
		const resolved = resolveWith(["redis"]);
		const { staticConfig } = generateTraefikConfig(resolved, domain);

		expect(staticConfig).toContain("admin@example.com");
		expect(staticConfig).toContain('address: ":80"');
		expect(staticConfig).toContain('address: ":443"');
		expect(staticConfig).toContain("exposedByDefault: false");
		expect(staticConfig).toContain("openclaw-network");
	});

	it("generates labels for services with exposed ports", () => {
		const resolved = resolveWith(["redis"]);
		const { serviceLabels } = generateTraefikConfig(resolved, domain);

		const redisLabels = getLabels(serviceLabels, "redis");
		expect(redisLabels["traefik.enable"]).toBe("true");
		expect(redisLabels["traefik.http.routers.redis.rule"]).toBe("Host(`redis.example.com`)");
		expect(redisLabels["traefik.http.routers.redis.entrypoints"]).toBe("websecure");
		expect(redisLabels["traefik.http.routers.redis.tls.certresolver"]).toBe("letsencrypt");
		expect(redisLabels["traefik.http.services.redis.loadbalancer.server.port"]).toBe("6379");
	});

	it("generates HTTP to HTTPS redirect labels", () => {
		const resolved = resolveWith(["redis"]);
		const { serviceLabels } = generateTraefikConfig(resolved, domain);

		const redisLabels = getLabels(serviceLabels, "redis");
		expect(redisLabels["traefik.http.routers.redis-http.entrypoints"]).toBe("web");
		expect(redisLabels["traefik.http.routers.redis-http.middlewares"]).toBe("redirect-to-https");
	});

	it("assigns root domain to gateway", () => {
		const resolved = resolveWith(["redis"]);
		const { serviceLabels } = generateTraefikConfig(resolved, domain);

		const gwLabels = getLabels(serviceLabels, "openclaw-gateway");
		expect(gwLabels["traefik.http.routers.gateway.rule"]).toBe("Host(`example.com`)");
		expect(gwLabels["traefik.http.services.gateway.loadbalancer.server.port"]).toBe("18789");
	});

	it("adds global redirect middleware on traefik service", () => {
		const resolved = resolveWith(["redis"]);
		const { serviceLabels } = generateTraefikConfig(resolved, domain);

		const traefikLabels = getLabels(serviceLabels, "traefik");
		expect(traefikLabels["traefik.http.middlewares.redirect-to-https.redirectscheme.scheme"]).toBe(
			"https",
		);
		expect(
			traefikLabels["traefik.http.middlewares.redirect-to-https.redirectscheme.permanent"],
		).toBe("true");
	});

	it("skips proxy services and services without exposed ports", () => {
		const resolved = resolveWith(["redis", "ffmpeg"]);
		const { serviceLabels } = generateTraefikConfig(resolved, domain);

		// ffmpeg has no exposed ports
		expect(serviceLabels.has("ffmpeg")).toBe(false);
		// traefik itself is handled separately (not as a regular service)
		const traefikLabels = getLabels(serviceLabels, "traefik");
		expect(traefikLabels["traefik.http.routers.traefik.rule"]).toBeUndefined();
	});

	it("sanitizes service names with hyphens in router names", () => {
		const resolved = resolveWith(["open-webui"]);
		const { serviceLabels } = generateTraefikConfig(resolved, domain);

		const labels = getLabels(serviceLabels, "open-webui");
		// Router name has hyphens removed
		expect(labels["traefik.http.routers.openwebui.rule"]).toBe("Host(`open-webui.example.com`)");
	});
});
