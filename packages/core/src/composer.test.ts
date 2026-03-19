import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { compose } from "./composer.js";
import { resolve } from "./resolver.js";
import type { ComposeOptions, ResolverOutput } from "./types.js";

const defaultOptions: ComposeOptions = {
	projectName: "test-project",
	proxy: "none",
	gpu: false,
	platform: "linux/amd64",
	deployment: "local",
	openclawVersion: "latest",
};

describe("compose", () => {
	it("generates minimal stack with just OpenClaw gateway when no companions", () => {
		const resolved = resolve({ services: [], skillPacks: [] });
		const yaml = compose(resolved, defaultOptions);
		const parsed = parse(yaml);

		// Should have the gateway service
		expect(parsed.services).toHaveProperty("openclaw-gateway");
		expect(parsed.services["openclaw-gateway"].image).toContain("ghcr.io/openclaw/openclaw");

		// Gateway should have core environment
		expect(parsed.services["openclaw-gateway"].environment.HOME).toBe("/home/node");
		expect(parsed.services["openclaw-gateway"].environment.TERM).toBe("xterm-256color");

		// Gateway uses bind-mount volumes (not named volumes in top-level volumes section)
		const gwVolumes = parsed.services["openclaw-gateway"].volumes as string[];
		expect(gwVolumes.some((v: string) => v.includes(".openclaw"))).toBe(true);

		// Should have network
		expect(parsed.networks).toHaveProperty("openclaw-network");
		expect(parsed.networks["openclaw-network"].driver).toBe("bridge");

		// Should have CLI companion service
		expect(parsed.services).toHaveProperty("openclaw-cli");

		// Gateway should have depends_on for mandatory services (convex, mission-control, tailscale)
		// Even with no user-selected services, mandatory services are always present
		expect(parsed.services).toHaveProperty("convex");
		expect(parsed.services).toHaveProperty("mission-control");

		// Gateway should have restart policy
		expect(parsed.services["openclaw-gateway"].restart).toBe("unless-stopped");
	});

	it("generates Redis companion with proper gateway depends_on", () => {
		const resolved = resolve({ services: ["redis"], skillPacks: [] });
		const yaml = compose(resolved, defaultOptions);
		const parsed = parse(yaml);

		// Should have gateway and redis services
		expect(parsed.services).toHaveProperty("openclaw-gateway");
		expect(parsed.services).toHaveProperty("redis");

		// Redis service should have correct image
		expect(parsed.services.redis.image).toBe("redis:8-alpine");

		// Gateway depends_on should include redis with service_healthy (redis has healthcheck)
		expect(parsed.services["openclaw-gateway"].depends_on).toHaveProperty("redis");
		expect(parsed.services["openclaw-gateway"].depends_on.redis.condition).toBe("service_healthy");

		// Redis should have a healthcheck
		expect(parsed.services.redis.healthcheck).toBeDefined();
		expect(parsed.services.redis.healthcheck.test).toContain("redis-cli ping");

		// Redis should have restart policy
		expect(parsed.services.redis.restart).toBe("unless-stopped");

		// Redis should be on openclaw-network
		expect(parsed.services.redis.networks).toContain("openclaw-network");

		// Gateway environment should include redis-related openclawEnvVars
		expect(parsed.services["openclaw-gateway"].environment).toHaveProperty("REDIS_HOST");
		expect(parsed.services["openclaw-gateway"].environment.REDIS_HOST).toBe("redis");
	});

	it("generates parseable YAML for a multi-service stack", () => {
		const resolved = resolve({ services: ["redis", "n8n"], skillPacks: [] });
		const yaml = compose(resolved, defaultOptions);

		// Should not throw when parsing
		expect(() => parse(yaml)).not.toThrow();

		const parsed = parse(yaml);
		expect(parsed).toHaveProperty("services");
		expect(parsed).toHaveProperty("volumes");
		expect(parsed).toHaveProperty("networks");

		// Should have gateway + redis + n8n + postgresql (n8n requires postgresql)
		expect(parsed.services).toHaveProperty("openclaw-gateway");
		expect(parsed.services).toHaveProperty("redis");
		expect(parsed.services).toHaveProperty("n8n");
		expect(parsed.services).toHaveProperty("postgresql");
	});

	it("includes all service volumes in top-level volumes section", () => {
		const resolved = resolve({ services: ["redis", "n8n"], skillPacks: [] });
		const yaml = compose(resolved, defaultOptions);
		const parsed = parse(yaml);

		// Collect all volume names from all resolved services
		const serviceVolumeNames = new Set<string>();
		for (const rs of resolved.services) {
			for (const vol of rs.definition.volumes) {
				serviceVolumeNames.add(vol.name);
			}
		}

		// All service volumes must appear in top-level volumes
		for (const volName of serviceVolumeNames) {
			expect(parsed.volumes).toHaveProperty(volName);
		}

		// Gateway uses bind-mount volumes (not in top-level volumes section)
		const gwVols = parsed.services["openclaw-gateway"].volumes as string[];
		expect(gwVols.some((v: string) => v.includes(".openclaw"))).toBe(true);
	});

	it("includes GPU passthrough when gpu=true and service requires it", () => {
		const resolved = resolve({ services: ["ollama"], skillPacks: [] });

		// Modify resolved output to simulate a GPU-required service
		const gpuResolved: ResolverOutput = {
			...resolved,
			services: resolved.services.map((s) => ({
				...s,
				definition: { ...s.definition, gpuRequired: true },
			})),
		};

		const yaml = compose(gpuResolved, { ...defaultOptions, gpu: true });
		const parsed = parse(yaml);

		// Ollama service should have GPU device reservation
		const ollamaService = parsed.services.ollama;
		expect(ollamaService.deploy).toBeDefined();
		expect(ollamaService.deploy.resources.reservations.devices).toEqual([
			{
				driver: "nvidia",
				count: "all",
				capabilities: ["gpu"],
			},
		]);
	});

	it("does not include GPU passthrough when gpu=false", () => {
		const resolved = resolve({ services: ["ollama"], skillPacks: [] });

		// Even if service requires GPU, gpu option is false
		const gpuResolved: ResolverOutput = {
			...resolved,
			services: resolved.services.map((s) => ({
				...s,
				definition: { ...s.definition, gpuRequired: true },
			})),
		};

		const yaml = compose(gpuResolved, { ...defaultOptions, gpu: false });
		const parsed = parse(yaml);

		// Should NOT have deploy with GPU devices
		const ollamaService = parsed.services.ollama;
		expect(ollamaService.deploy?.resources?.reservations?.devices).toBeUndefined();
	});

	it("does not map internal-only ports to host", () => {
		const resolved = resolve({ services: ["redis"], skillPacks: [] });

		// Modify redis to have an internal-only port
		const modifiedResolved: ResolverOutput = {
			...resolved,
			services: resolved.services.map((s) => ({
				...s,
				definition: {
					...s.definition,
					ports: [
						...s.definition.ports,
						{ host: 16379, container: 16379, description: "Redis cluster bus", exposed: false },
					],
				},
			})),
		};

		const yaml = compose(modifiedResolved, defaultOptions);
		const parsed = parse(yaml);

		// Should only have the exposed port, not the internal one
		const redisPorts = parsed.services.redis.ports;
		expect(redisPorts).toHaveLength(1);
		expect(redisPorts[0]).toContain("6379");
		expect(redisPorts[0]).not.toContain("16379");
	});

	it("uses service_started condition for services without healthcheck", () => {
		const resolved = resolve({ services: ["minio"], skillPacks: [] });

		const yaml = compose(resolved, defaultOptions);
		const parsed = parse(yaml);

		// Minio may or may not have a healthcheck – the gateway depends_on
		// condition should reflect the definition accurately
		const gatewayDeps = parsed.services["openclaw-gateway"].depends_on;
		for (const [id, dep] of Object.entries(gatewayDeps)) {
			const svc = resolved.services.find((s) => s.definition.id === id);
			if (svc?.definition.healthcheck) {
				expect((dep as { condition: string }).condition).toBe("service_healthy");
			} else {
				expect((dep as { condition: string }).condition).toBe("service_started");
			}
		}
	});

	it("gateway is always the first service in the output", () => {
		const resolved = resolve({ services: ["redis", "ollama"], skillPacks: [] });
		const yaml = compose(resolved, defaultOptions);
		const parsed = parse(yaml);

		// First key in services should be openclaw-gateway
		const serviceKeys = Object.keys(parsed.services);
		expect(serviceKeys[0]).toBe("openclaw-gateway");
	});

	// ── Multi-framework tests ──────────────────────────────────────────────

	it("generates zeroclaw-gateway when primaryFramework is zeroclaw", () => {
		const resolved = resolve({ services: ["redis"], skillPacks: [], primaryFramework: "zeroclaw" });
		const yaml = compose(resolved, {
			...defaultOptions,
			primaryFramework: "zeroclaw",
		});
		const parsed = parse(yaml);

		// Should have zeroclaw-gateway, NOT openclaw-gateway
		expect(parsed.services).toHaveProperty("zeroclaw-gateway");
		expect(parsed.services).not.toHaveProperty("openclaw-gateway");
		expect(parsed.services).not.toHaveProperty("openclaw-cli");

		// Network should be zeroclaw-network
		expect(parsed.networks).toHaveProperty("zeroclaw-network");
		expect(parsed.services.redis.networks).toContain("zeroclaw-network");
	});

	it("generates claude-code-gateway when primaryFramework is claude-code", () => {
		const resolved = resolve({ services: [], skillPacks: [], primaryFramework: "claude-code" });
		const yaml = compose(resolved, {
			...defaultOptions,
			primaryFramework: "claude-code",
		});
		const parsed = parse(yaml);

		expect(parsed.services).toHaveProperty("claude-code-gateway");
		expect(parsed.networks).toHaveProperty("claude-code-network");
	});

	it("does NOT include convex/mission-control in non-openclaw framework stacks", () => {
		const resolved = resolve({ services: ["redis"], skillPacks: [], primaryFramework: "copaw" });
		const yaml = compose(resolved, {
			...defaultOptions,
			primaryFramework: "copaw",
		});
		const parsed = parse(yaml);

		expect(parsed.services).not.toHaveProperty("convex");
		expect(parsed.services).not.toHaveProperty("mission-control");
		expect(parsed.services).not.toHaveProperty("tailscale");
	});

	it("adds companion framework containers", () => {
		const resolved = resolve({ services: ["redis"], skillPacks: [] });
		const yaml = compose(resolved, {
			...defaultOptions,
			companionFrameworks: ["claude-code"],
		});
		const parsed = parse(yaml);

		// Primary should still be openclaw
		expect(parsed.services).toHaveProperty("openclaw-gateway");
		// Companion should exist
		expect(parsed.services).toHaveProperty("claude-code-companion");
	});
});
