import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { generate } from "../generate.js";
import { getAllFrameworks, getFrameworkById } from "./registry.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateStack(
	primaryFramework: string,
	services: string[] = ["redis"],
	extra: Record<string, unknown> = {},
) {
	return generate({
		projectName: `${primaryFramework}-e2e-test`,
		primaryFramework: primaryFramework as any,
		services,
		skillPacks: [],
		proxy: "none",
		gpu: false,
		platform: "linux/amd64",
		deployment: "local",
		generateSecrets: true,
		openclawVersion: "latest",
		...extra,
	});
}

function parseCompose(result: ReturnType<typeof generate>) {
	return parse(result.files["docker-compose.yml"]!);
}

// ─── OpenClaw Deep E2E ──────────────────────────────────────────────────────

describe("OpenClaw full stack end-to-end", () => {
	const SERVICES = ["redis", "postgresql", "qdrant", "n8n", "searxng", "browserless", "minio"];
	const result = generateStack("openclaw", SERVICES);
	const composed = parseCompose(result);

	describe("generation succeeds", () => {
		it("produces files and metadata", () => {
			expect(result.files).toBeDefined();
			expect(Object.keys(result.files).length).toBeGreaterThan(5);
			expect(result.metadata).toBeDefined();
			expect(result.metadata.serviceCount).toBeGreaterThanOrEqual(SERVICES.length);
		});

		it("produces docker-compose.yml", () => {
			expect(result.files).toHaveProperty("docker-compose.yml");
		});

		it("produces .env file", () => {
			expect(result.files).toHaveProperty(".env");
		});

		it("produces .env.example file", () => {
			expect(result.files).toHaveProperty(".env.example");
		});

		it("produces README.md", () => {
			expect(result.files).toHaveProperty("README.md");
		});
	});

	describe("openclaw-gateway service", () => {
		const gw = composed.services["openclaw-gateway"];

		it("exists", () => {
			expect(gw).toBeDefined();
		});

		it("has correct image template", () => {
			expect(gw.image).toContain("OPENCLAW_IMAGE");
			expect(gw.image).toContain("ghcr.io/openclaw/openclaw");
		});

		it("exposes gateway port 18789", () => {
			const ports: string[] = gw.ports;
			expect(ports.some((p: string) => p.includes("18789"))).toBe(true);
		});

		it("exposes bridge port 18790", () => {
			const ports: string[] = gw.ports;
			expect(ports.some((p: string) => p.includes("18790"))).toBe(true);
		});

		it("has healthcheck", () => {
			expect(gw.healthcheck).toBeDefined();
			expect(gw.healthcheck.test).toBeDefined();
		});

		it("has OPENCLAW_GATEWAY_TOKEN env var", () => {
			expect(gw.environment.OPENCLAW_GATEWAY_TOKEN).toContain("OPENCLAW_GATEWAY_TOKEN");
		});

		it("has AI provider API keys", () => {
			expect(gw.environment.OPENAI_API_KEY).toContain("OPENAI_API_KEY");
			expect(gw.environment.ANTHROPIC_API_KEY).toContain("ANTHROPIC_API_KEY");
		});

		it("has gateway command with --bind flag", () => {
			const cmd: string[] = gw.command;
			expect(cmd).toContain("gateway");
			expect(cmd).toContain("--bind");
		});

		it("is on openclaw-network", () => {
			expect(gw.networks).toContain("openclaw-network");
		});

		it("has openclaw volumes", () => {
			const vols: string[] = gw.volumes;
			expect(vols.some((v: string) => v.includes(".openclaw"))).toBe(true);
			expect(vols.some((v: string) => v.includes("workspace"))).toBe(true);
		});

		it("has restart policy", () => {
			expect(gw.restart).toBe("unless-stopped");
		});

		it("depends on services with healthcheck condition", () => {
			if (gw.depends_on) {
				for (const [, condition] of Object.entries(gw.depends_on)) {
					expect((condition as { condition: string }).condition).toBe("service_healthy");
				}
			}
		});
	});

	describe("openclaw-cli service", () => {
		const cli = composed.services["openclaw-cli"];

		it("exists", () => {
			expect(cli).toBeDefined();
		});

		it("uses network_mode service:openclaw-gateway", () => {
			expect(cli.network_mode).toBe("service:openclaw-gateway");
		});

		it("depends on openclaw-gateway", () => {
			expect(cli.depends_on).toContain("openclaw-gateway");
		});

		it("has stdin_open and tty for interactive use", () => {
			expect(cli.stdin_open).toBe(true);
			expect(cli.tty).toBe(true);
		});
	});

	describe("companion services", () => {
		it("has all requested services", () => {
			for (const svc of SERVICES) {
				expect(composed.services).toHaveProperty(svc);
			}
		});

		it("all companion services are on openclaw-network", () => {
			for (const svcId of SERVICES) {
				const svc = composed.services[svcId];
				expect(svc.networks).toContain("openclaw-network");
			}
		});

		it("postgresql has healthcheck", () => {
			const pg = composed.services["postgresql"];
			expect(pg.healthcheck).toBeDefined();
		});

		it("redis has healthcheck", () => {
			const redis = composed.services["redis"];
			expect(redis.healthcheck).toBeDefined();
		});
	});

	describe("network and volumes", () => {
		it("has openclaw-network defined", () => {
			expect(composed.networks).toHaveProperty("openclaw-network");
		});

		it("has top-level volumes", () => {
			expect(composed.volumes).toBeDefined();
		});
	});

	describe(".env file content", () => {
		const envContent = result.files[".env"]!;

		it("contains OPENCLAW_VERSION", () => {
			expect(envContent).toContain("OPENCLAW_VERSION");
		});

		it("contains OPENCLAW_GATEWAY_TOKEN", () => {
			expect(envContent).toContain("OPENCLAW_GATEWAY_TOKEN");
		});

		it("contains OPENCLAW_GATEWAY_PORT", () => {
			expect(envContent).toContain("OPENCLAW_GATEWAY_PORT");
		});

		it("contains OPENCLAW_GATEWAY_BIND", () => {
			expect(envContent).toContain("OPENCLAW_GATEWAY_BIND");
		});

		it("contains OPENCLAW_CONFIG_DIR", () => {
			expect(envContent).toContain("OPENCLAW_CONFIG_DIR");
		});

		it("provider API keys are in gateway compose environment (not .env)", () => {
			// Provider keys are injected into the docker-compose gateway env, not .env
			// .env only gets them when aiProviders is specified in input
			const gw = composed.services["openclaw-gateway"];
			expect(gw.environment.OPENAI_API_KEY).toContain("OPENAI_API_KEY");
			expect(gw.environment.ANTHROPIC_API_KEY).toContain("ANTHROPIC_API_KEY");
		});
	});

	describe("generated config", () => {
		const configFile = Object.entries(result.files).find(([path]) =>
			path.includes("openclaw.json"),
		);

		it("produces openclaw.json config", () => {
			expect(configFile).toBeDefined();
		});

		it("config is valid JSON", () => {
			expect(() => JSON.parse(configFile![1])).not.toThrow();
		});

		it("config has gateway section", () => {
			const config = JSON.parse(configFile![1]);
			expect(config).toHaveProperty("gateway");
		});

		it("config has agents section", () => {
			const config = JSON.parse(configFile![1]);
			expect(config).toHaveProperty("agents");
		});

		it("config has skills section", () => {
			const config = JSON.parse(configFile![1]);
			expect(config).toHaveProperty("skills");
		});
	});

	describe("skill files", () => {
		const skillFiles = Object.entries(result.files).filter(
			([path]) => path.includes("skills/") && path.endsWith("SKILL.md"),
		);

		it("generates skill files for services", () => {
			expect(skillFiles.length).toBeGreaterThan(0);
		});
	});

	describe("README", () => {
		const readme = result.files["README.md"]!;

		it("mentions the project name", () => {
			expect(readme).toContain("openclaw-e2e-test");
		});

		it("mentions services", () => {
			expect(readme).toContain("redis");
		});
	});

	describe("health check script", () => {
		const healthFile = Object.entries(result.files).find(([path]) => path.includes("health"));

		it("generates health check file", () => {
			expect(healthFile).toBeDefined();
		});
	});

	describe("docs", () => {
		it("generates SERVICES.md", () => {
			expect(result.files).toHaveProperty("docs/SERVICES.md");
		});

		it("SERVICES.md mentions each service", () => {
			const doc = result.files["docs/SERVICES.md"]!;
			expect(doc).toContain("Redis");
			expect(doc).toContain("PostgreSQL");
		});
	});
});

// ─── OpenClaw with Proxy ────────────────────────────────────────────────────

describe("OpenClaw with caddy proxy", () => {
	const result = generateStack("openclaw", ["redis"], {
		proxy: "caddy",
		domain: "example.com",
	});
	const composed = parseCompose(result);

	it("generates Caddyfile", () => {
		expect(result.files).toHaveProperty("caddy/Caddyfile");
	});

	it("has caddy service in compose", () => {
		expect(composed.services).toHaveProperty("caddy");
	});
});

describe("OpenClaw with traefik proxy", () => {
	const result = generateStack("openclaw", ["redis"], {
		proxy: "traefik",
		domain: "example.com",
	});

	it("generates traefik config", () => {
		expect(result.files).toHaveProperty("traefik/traefik.yml");
	});
});

// ─── OpenClaw with Companion Frameworks ─────────────────────────────────────

describe("OpenClaw with companion frameworks", () => {
	const companions = getAllFrameworks().filter((fw) => fw.canBeCompanion && fw.id !== "openclaw");

	for (const companion of companions) {
		it(`OpenClaw + ${companion.name} companion generates successfully`, () => {
			const result = generate({
				projectName: `oc-${companion.id}-test`,
				primaryFramework: "openclaw",
				companionFrameworks: [companion.id],
				services: ["redis"],
				skillPacks: [],
				proxy: "none",
				gpu: false,
				platform: "linux/amd64",
				deployment: "local",
				generateSecrets: true,
				openclawVersion: "latest",
			});

			expect(result.files).toHaveProperty("docker-compose.yml");
			const composed = parse(result.files["docker-compose.yml"]!);

			// Primary
			expect(composed.services).toHaveProperty("openclaw-gateway");

			// Companion
			const companionKey = `${companion.id}-companion`;
			expect(composed.services).toHaveProperty(companionKey);
		});
	}
});

// ─── OpenClaw with Monitoring ───────────────────────────────────────────────

describe("OpenClaw with monitoring stack", () => {
	const result = generateStack("openclaw", ["redis", "prometheus", "grafana"]);

	it("generates monitoring compose file", () => {
		// Monitoring services go in docker-compose.monitoring.yml, not base compose
		expect(result.files).toHaveProperty("docker-compose.monitoring.yml");
	});

	it("monitoring compose has prometheus and grafana services", () => {
		const monCompose = parse(result.files["docker-compose.monitoring.yml"]!);
		expect(monCompose.services).toHaveProperty("prometheus");
		expect(monCompose.services).toHaveProperty("grafana");
	});

	it("generates prometheus config", () => {
		expect(result.files).toHaveProperty("prometheus/prometheus.yml");
	});

	it("generates grafana datasource config", () => {
		const grafanaFiles = Object.entries(result.files).filter(([p]) => p.includes("grafana"));
		expect(grafanaFiles.length).toBeGreaterThan(0);
	});

	it("generates grafana dashboard", () => {
		expect(result.files).toHaveProperty("config/grafana/dashboards/openclaw-stack-overview.json");
	});
});

// ─── OpenClaw with PostgreSQL (init containers) ─────────────────────────────

describe("OpenClaw with PostgreSQL-dependent services", () => {
	const result = generateStack("openclaw", ["postgresql", "n8n"]);
	const composed = parseCompose(result);

	it("has postgresql service", () => {
		expect(composed.services).toHaveProperty("postgresql");
	});

	it("has n8n service", () => {
		expect(composed.services).toHaveProperty("n8n");
	});

	it("postgresql has healthcheck", () => {
		const pg = composed.services["postgresql"];
		expect(pg.healthcheck).toBeDefined();
	});

	it("generates postgres init script if applicable", () => {
		// n8n requires its own database — init script should exist
		const pgInit = result.files["postgres/init-databases.sh"];
		// This may or may not exist depending on whether services have DB_REQUIREMENTS
		// but n8n does need a separate database
		if (pgInit) {
			expect(pgInit).toContain("n8n");
		}
	});
});

// ─── CoPaw (copaw) ─────────────────────────────────────────────────────────

describe("CoPaw end-to-end", () => {
	const result = generateStack("copaw", ["redis", "qdrant"]);
	const composed = parseCompose(result);

	it("generates successfully", () => {
		expect(result.files).toBeDefined();
		expect(Object.keys(result.files).length).toBeGreaterThan(3);
	});

	it("has copaw-gateway service", () => {
		expect(composed.services).toHaveProperty("copaw-gateway");
	});

	it("copaw-gateway has image", () => {
		const gw = composed.services["copaw-gateway"];
		expect(gw.image).toBeDefined();
	});

	it("copaw-gateway is on copaw-network", () => {
		const gw = composed.services["copaw-gateway"];
		expect(gw.networks).toContain("copaw-network");
	});

	it("has copaw-network defined", () => {
		expect(composed.networks).toHaveProperty("copaw-network");
	});

	it("companion services on copaw-network", () => {
		for (const svcId of ["redis", "qdrant"]) {
			const svc = composed.services[svcId];
			expect(svc.networks).toContain("copaw-network");
		}
	});

	it("has .env file", () => {
		const envContent = result.files[".env"]!;
		expect(envContent).toBeDefined();
	});
});

// ─── NanoClaw ───────────────────────────────────────────────────────────────

describe("NanoClaw end-to-end", () => {
	const result = generateStack("nanoclaw", ["redis"]);
	const composed = parseCompose(result);

	it("generates successfully", () => {
		expect(result.files).toBeDefined();
	});

	it("has nanoclaw-gateway service", () => {
		expect(composed.services).toHaveProperty("nanoclaw-gateway");
	});

	it("nanoclaw-gateway is on nanoclaw-network", () => {
		const gw = composed.services["nanoclaw-gateway"];
		expect(gw.networks).toContain("nanoclaw-network");
	});

	it("has nanoclaw-network defined", () => {
		expect(composed.networks).toHaveProperty("nanoclaw-network");
	});

	it("has .env file with NanoClaw section", () => {
		const envContent = result.files[".env"]!;
		expect(envContent).toBeDefined();
	});
});

// ─── NanoBot ────────────────────────────────────────────────────────────────

describe("NanoBot end-to-end", () => {
	const result = generateStack("nanobot", ["redis"]);
	const composed = parseCompose(result);

	it("generates successfully", () => {
		expect(result.files).toBeDefined();
	});

	it("has nanobot-gateway service", () => {
		expect(composed.services).toHaveProperty("nanobot-gateway");
	});

	it("nanobot-gateway has healthcheck", () => {
		const gw = composed.services["nanobot-gateway"];
		expect(gw.healthcheck).toBeDefined();
	});

	it("nanobot-gateway exposes port 18790", () => {
		const gw = composed.services["nanobot-gateway"];
		const ports: string[] = gw.ports ?? [];
		expect(ports.some((p: string) => p.includes("18790"))).toBe(true);
	});

	it("is on nanobot-network", () => {
		const gw = composed.services["nanobot-gateway"];
		expect(gw.networks).toContain("nanobot-network");
	});

	it("has nanobot-network defined", () => {
		expect(composed.networks).toHaveProperty("nanobot-network");
	});
});

// ─── ZeroClaw ───────────────────────────────────────────────────────────────

describe("ZeroClaw end-to-end", () => {
	const result = generateStack("zeroclaw", ["redis"]);
	const composed = parseCompose(result);

	it("generates successfully", () => {
		expect(result.files).toBeDefined();
	});

	it("has zeroclaw-gateway service", () => {
		expect(composed.services).toHaveProperty("zeroclaw-gateway");
	});

	it("zeroclaw-gateway has healthcheck", () => {
		const gw = composed.services["zeroclaw-gateway"];
		expect(gw.healthcheck).toBeDefined();
	});

	it("zeroclaw-gateway exposes a port", () => {
		const gw = composed.services["zeroclaw-gateway"];
		const ports: string[] = gw.ports ?? [];
		expect(ports.length).toBeGreaterThan(0);
	});

	it("is on zeroclaw-network", () => {
		const gw = composed.services["zeroclaw-gateway"];
		expect(gw.networks).toContain("zeroclaw-network");
	});

	it("has zeroclaw-network defined", () => {
		expect(composed.networks).toHaveProperty("zeroclaw-network");
	});
});

// ─── MemU ───────────────────────────────────────────────────────────────────

describe("MemU end-to-end", () => {
	// MemU requires postgresql as mandatory
	const result = generateStack("memu", ["redis"]);
	const composed = parseCompose(result);

	it("generates successfully", () => {
		expect(result.files).toBeDefined();
	});

	it("has memu-gateway service", () => {
		expect(composed.services).toHaveProperty("memu-gateway");
	});

	it("memu-gateway has healthcheck", () => {
		const gw = composed.services["memu-gateway"];
		expect(gw.healthcheck).toBeDefined();
	});

	it("auto-includes mandatory postgresql", () => {
		// MemU getMandatoryServices() returns ["postgresql"]
		expect(composed.services).toHaveProperty("postgresql");
	});

	it("is on memu-network", () => {
		const gw = composed.services["memu-gateway"];
		expect(gw.networks).toContain("memu-network");
	});

	it("has memu-network defined", () => {
		expect(composed.networks).toHaveProperty("memu-network");
	});

	it("memu-gateway depends on postgresql", () => {
		const gw = composed.services["memu-gateway"];
		if (gw.depends_on) {
			expect(gw.depends_on).toHaveProperty("postgresql");
		}
	});
});

// ─── Claude Code ────────────────────────────────────────────────────────────

describe("Claude Code end-to-end", () => {
	const result = generateStack("claude-code", ["redis"]);
	const composed = parseCompose(result);

	it("generates successfully", () => {
		expect(result.files).toBeDefined();
	});

	it("has claude-code-gateway service", () => {
		expect(composed.services).toHaveProperty("claude-code-gateway");
	});

	it("claude-code-gateway has ANTHROPIC_API_KEY", () => {
		const gw = composed.services["claude-code-gateway"];
		expect(gw.environment.ANTHROPIC_API_KEY).toContain("ANTHROPIC_API_KEY");
	});

	it("is on claude-code-network", () => {
		const gw = composed.services["claude-code-gateway"];
		expect(gw.networks).toContain("claude-code-network");
	});

	it("has claude-code-network defined", () => {
		expect(composed.networks).toHaveProperty("claude-code-network");
	});
});

// ─── Codex ──────────────────────────────────────────────────────────────────

describe("Codex end-to-end", () => {
	const result = generateStack("codex", ["redis"]);
	const composed = parseCompose(result);

	it("generates successfully", () => {
		expect(result.files).toBeDefined();
	});

	it("has codex-gateway service", () => {
		expect(composed.services).toHaveProperty("codex-gateway");
	});

	it("codex-gateway has OPENAI_API_KEY", () => {
		const gw = composed.services["codex-gateway"];
		expect(gw.environment.OPENAI_API_KEY).toContain("OPENAI_API_KEY");
	});

	it("is on codex-network", () => {
		const gw = composed.services["codex-gateway"];
		expect(gw.networks).toContain("codex-network");
	});

	it("has codex-network defined", () => {
		expect(composed.networks).toHaveProperty("codex-network");
	});
});

// ─── Hermes ─────────────────────────────────────────────────────────────────

describe("Hermes end-to-end (via all-frameworks)", () => {
	const result = generateStack("hermes", ["redis", "qdrant"]);
	const composed = parseCompose(result);

	it("generates successfully", () => {
		expect(result.files).toBeDefined();
	});

	it("has hermes-gateway service", () => {
		expect(composed.services).toHaveProperty("hermes-gateway");
	});

	it("hermes-gateway has API port 8642", () => {
		const gw = composed.services["hermes-gateway"];
		const ports: string[] = gw.ports;
		expect(ports.some((p: string) => p.includes("8642"))).toBe(true);
	});

	it("hermes-gateway has healthcheck", () => {
		const gw = composed.services["hermes-gateway"];
		expect(gw.healthcheck).toBeDefined();
	});

	it("is on hermes-network", () => {
		const gw = composed.services["hermes-gateway"];
		expect(gw.networks).toContain("hermes-network");
	});

	it("has hermes-network defined", () => {
		expect(composed.networks).toHaveProperty("hermes-network");
	});
});

// ─── Cross-Framework Validation ─────────────────────────────────────────────

describe("Cross-framework validation", () => {
	const allFw = getAllFrameworks();

	it("all 9 frameworks are registered", () => {
		expect(allFw.length).toBe(9);
	});

	it("all primary frameworks generate valid docker-compose", () => {
		for (const fw of allFw.filter((f) => f.canBePrimary)) {
			const result = generateStack(fw.id, ["redis"]);
			expect(result.files).toHaveProperty("docker-compose.yml");

			const composed = parseCompose(result);
			expect(composed.services).toBeDefined();

			// Gateway service
			const gatewayKey = `${fw.id}-gateway`;
			expect(composed.services).toHaveProperty(gatewayKey);

			// Network
			if (fw.networkName) {
				expect(composed.networks).toHaveProperty(fw.networkName);
			}
		}
	});

	it("all companion frameworks can attach to openclaw", () => {
		const companions = allFw.filter((f) => f.canBeCompanion);
		for (const fw of companions) {
			const result = generate({
				projectName: `cross-${fw.id}`,
				primaryFramework: "openclaw",
				companionFrameworks: [fw.id],
				services: ["redis"],
				skillPacks: [],
				proxy: "none",
				gpu: false,
				platform: "linux/amd64",
				deployment: "local",
				generateSecrets: true,
				openclawVersion: "latest",
			});
			const composed = parseCompose(result);
			expect(composed.services).toHaveProperty(`${fw.id}-companion`);
		}
	});

	it("every framework getBaseEnvVars produces valid entries", () => {
		for (const fw of allFw) {
			const envVars = fw.getBaseEnvVars({
				generateSecrets: true,
				domain: "test.example.com",
			});
			expect(Array.isArray(envVars)).toBe(true);
			for (const entry of envVars) {
				expect(entry).toHaveProperty("key");
				expect(typeof entry.key).toBe("string");
				expect(entry.key.length).toBeGreaterThan(0);
			}
		}
	});

	it("every framework getProviderEnvKeys returns strings", () => {
		for (const fw of allFw) {
			const keys = fw.getProviderEnvKeys();
			expect(Array.isArray(keys)).toBe(true);
			for (const key of keys) {
				expect(typeof key).toBe("string");
			}
		}
	});

	it("every framework has valid compose YAML (parseable)", () => {
		for (const fw of allFw.filter((f) => f.canBePrimary)) {
			const result = generateStack(fw.id, ["redis"]);
			const yamlContent = result.files["docker-compose.yml"]!;
			expect(() => parse(yamlContent)).not.toThrow();
		}
	});

	it("no framework produces empty docker-compose services", () => {
		for (const fw of allFw.filter((f) => f.canBePrimary)) {
			const result = generateStack(fw.id, ["redis"]);
			const composed = parseCompose(result);
			const serviceCount = Object.keys(composed.services).length;
			expect(serviceCount).toBeGreaterThanOrEqual(2); // at least gateway + redis
		}
	});
});

// ─── Multi-Service Stress Test ──────────────────────────────────────────────

describe("OpenClaw large stack (many services)", () => {
	const MANY_SERVICES = [
		"redis",
		"postgresql",
		"qdrant",
		"chromadb",
		"meilisearch",
		"minio",
		"n8n",
		"searxng",
		"browserless",
		"ntfy",
		"neo4j",
	];

	// Services in base compose (no profile mapping for their categories):
	// database, vector-db, storage, automation, search, browser go to base compose
	// communication (ntfy) goes to docker-compose.communication.yml
	const BASE_COMPOSE_SERVICES = [
		"redis",
		"postgresql",
		"qdrant",
		"chromadb",
		"meilisearch",
		"minio",
		"n8n",
		"searxng",
		"browserless",
		"neo4j",
	];

	const result = generateStack("openclaw", MANY_SERVICES);
	const composed = parseCompose(result);

	it("generates without throwing", () => {
		expect(result.files).toBeDefined();
	});

	it("has base-compose services in docker-compose.yml", () => {
		for (const svc of BASE_COMPOSE_SERVICES) {
			expect(composed.services).toHaveProperty(svc);
		}
	});

	it("profiled services go to supplementary compose files", () => {
		// ntfy (communication) goes to separate compose file
		expect(result.files).toHaveProperty("docker-compose.communication.yml");
		const commCompose = parse(result.files["docker-compose.communication.yml"]!);
		expect(commCompose.services).toHaveProperty("ntfy");
	});

	it("base-compose services are on openclaw-network", () => {
		for (const svc of BASE_COMPOSE_SERVICES) {
			expect(composed.services[svc].networks).toContain("openclaw-network");
		}
	});

	it("metadata has correct service count", () => {
		// resolvedServices includes requested + mandatory (convex, mission-control, tailscale)
		expect(result.metadata.resolvedServices.length).toBeGreaterThanOrEqual(MANY_SERVICES.length);
	});

	it("memory estimate is reasonable", () => {
		expect(result.metadata.estimatedMemoryMB).toBeGreaterThan(0);
	});
});

// ─── Platform Variants ──────────────────────────────────────────────────────

describe("OpenClaw platform variants", () => {
	it("generates for linux/arm64", () => {
		const result = generateStack("openclaw", ["redis"], {
			platform: "linux/arm64",
		});
		expect(result.files).toHaveProperty("docker-compose.yml");
	});

	it("generates for windows/amd64 (bare-metal fallback)", () => {
		const result = generateStack("openclaw", ["redis"], {
			platform: "windows/amd64",
		});
		expect(result.files).toHaveProperty("docker-compose.yml");
	});

	it("generates for macos/arm64 (bare-metal fallback)", () => {
		const result = generateStack("openclaw", ["redis"], {
			platform: "macos/arm64",
		});
		expect(result.files).toHaveProperty("docker-compose.yml");
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// NemoClaw Deploy Target
// ═══════════════════════════════════════════════════════════════════════════════

describe("NemoClaw deploy target", () => {
	function generateNemoStack(services: string[] = ["redis"], extra: Record<string, unknown> = {}) {
		return generateStack("openclaw", services, {
			deployTarget: "nemoclaw",
			aiProviders: ["nvidia"],
			...extra,
		});
	}

	it("generates successfully with deployTarget nemoclaw", () => {
		const result = generateNemoStack();
		expect(result.files).toBeDefined();
		expect(Object.keys(result.files).length).toBeGreaterThan(0);
	});

	it("produces sandbox policy file", () => {
		const result = generateNemoStack();
		expect(result.files).toHaveProperty("nemoclaw-blueprint/policies/openclaw-sandbox.yaml");
		const policy = result.files["nemoclaw-blueprint/policies/openclaw-sandbox.yaml"];
		expect(policy).toContain("runtime: openshell");
		expect(policy).toContain("landlock:");
		expect(policy).toContain("seccomp:");
		expect(policy).toContain("defaultPolicy: deny");
		expect(policy).toContain("integrate.api.nvidia.com");
	});

	it("produces inference profile file", () => {
		const result = generateNemoStack();
		expect(result.files).toHaveProperty("nemoclaw-blueprint/inference.yaml");
		const profile = result.files["nemoclaw-blueprint/inference.yaml"];
		expect(profile).toContain("nvidia/nemotron-3-super-120b-a12b");
		expect(profile).toContain("NVIDIA_API_KEY");
	});

	it("produces setup script", () => {
		const result = generateNemoStack();
		expect(result.files).toHaveProperty("scripts/nemoclaw-setup.sh");
		const script = result.files["scripts/nemoclaw-setup.sh"];
		expect(script).toContain("nemoclaw onboard");
		expect(script).toContain("docker compose up -d");
	});

	it(".env contains NVIDIA_API_KEY", () => {
		const result = generateNemoStack();
		const env = result.files[".env"]!;
		expect(env).toContain("NVIDIA_API_KEY");
	});

	it(".env contains NEMOCLAW_MODEL and NEMOCLAW_CONTEXT_WINDOW", () => {
		const result = generateNemoStack();
		const env = result.files[".env"]!;
		expect(env).toContain("NEMOCLAW_MODEL");
		expect(env).toContain("NEMOCLAW_CONTEXT_WINDOW");
	});

	it("README has NemoClaw section", () => {
		const result = generateNemoStack();
		const readme = result.files["README.md"]!;
		expect(readme).toContain("NemoClaw");
		expect(readme).toContain("NVIDIA Hardened Sandbox");
		expect(readme).toContain("nemoclaw-setup.sh");
	});

	it("openclaw.json has nvidia provider", () => {
		const result = generateNemoStack();
		const configPath = "openclaw/config/openclaw.json";
		expect(result.files).toHaveProperty(configPath);
		const config = JSON.parse(result.files[configPath]!);
		expect(config.models.providers).toHaveProperty("nvidia");
	});

	it("forces hardened mode (compose has security_opt)", () => {
		const result = generateNemoStack();
		const composed = parseCompose(result);
		// Check that hardened mode is applied to companion services
		const serviceNames = Object.keys(composed.services ?? {});
		const nonGatewayServices = serviceNames.filter(
			(name) => !name.includes("gateway") && !name.includes("cli") && !name.includes("setup"),
		);
		if (nonGatewayServices.length > 0) {
			const firstService = composed.services[nonGatewayServices[0]];
			expect(firstService.security_opt).toContain("no-new-privileges:true");
		}
	});

	it("auto-injects nvidia into aiProviders even if not explicitly included", () => {
		// deployTarget=nemoclaw should force nvidia provider
		const result = generateStack("openclaw", ["redis"], {
			deployTarget: "nemoclaw",
			aiProviders: ["openai"], // no nvidia explicitly
		});
		const configPath = "openclaw/config/openclaw.json";
		const config = JSON.parse(result.files[configPath]!);
		expect(config.models.providers).toHaveProperty("nvidia");
	});

	it("still generates standard compose files alongside nemoclaw files", () => {
		const result = generateNemoStack();
		expect(result.files).toHaveProperty("docker-compose.yml");
		expect(result.files).toHaveProperty(".env");
		expect(result.files).toHaveProperty(".env.example");
		expect(result.files).toHaveProperty("README.md");
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// HolyClaude-Inspired Features (Notifications, PUID/PGID, Sentinel, CLAUDE.md)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Notification hooks", () => {
	it("openclaw.json has notifications section when providers selected", () => {
		const result = generateStack("openclaw", ["redis"], {
			notificationProviders: ["discord", "slack"],
		});
		const configPath = "openclaw/config/openclaw.json";
		const config = JSON.parse(result.files[configPath]!);
		expect(config.hooks).toHaveProperty("notifications");
		expect(config.hooks.notifications.enabled).toBe(true);
		expect(config.hooks.notifications.onStop).toBe(true);
		expect(config.hooks.notifications.onError).toBe(true);
		expect(config.hooks.notifications.providers).toContain("discord");
		expect(config.hooks.notifications.providers).toContain("slack");
	});

	it("openclaw.json omits notifications when no providers", () => {
		const result = generateStack("openclaw", ["redis"]);
		const configPath = "openclaw/config/openclaw.json";
		const config = JSON.parse(result.files[configPath]!);
		expect(config.hooks).not.toHaveProperty("notifications");
	});

	it(".env contains notification env vars for selected providers", () => {
		const result = generateStack("openclaw", ["redis"], {
			notificationProviders: ["discord", "telegram"],
		});
		const env = result.files[".env"]!;
		expect(env).toContain("NOTIFY_DISCORD");
		expect(env).toContain("NOTIFY_TELEGRAM_TOKEN");
		expect(env).toContain("NOTIFY_TELEGRAM_CHAT");
	});

	it(".env omits notification vars when no providers selected", () => {
		const result = generateStack("openclaw", ["redis"]);
		const env = result.files[".env"]!;
		expect(env).not.toContain("NOTIFY_DISCORD");
		expect(env).not.toContain("NOTIFY_SLACK");
	});

	it("README has Notifications section when providers selected", () => {
		const result = generateStack("openclaw", ["redis"], {
			notificationProviders: ["slack"],
		});
		const readme = result.files["README.md"]!;
		expect(readme).toContain("Notifications");
		expect(readme).toContain("slack");
	});
});

describe("PUID/PGID support", () => {
	it(".env contains PUID and PGID", () => {
		const result = generateStack("openclaw", ["redis"]);
		const env = result.files[".env"]!;
		expect(env).toContain("PUID=");
		expect(env).toContain("PGID=");
	});

	it("gateway service has PUID and PGID env vars", () => {
		const result = generateStack("openclaw", ["redis"]);
		const composed = parseCompose(result);
		const gateway = composed.services["openclaw-gateway"];
		expect(gateway.environment).toHaveProperty("PUID");
		expect(gateway.environment).toHaveProperty("PGID");
	});

	it("README has File Ownership section", () => {
		const result = generateStack("openclaw", ["redis"]);
		const readme = result.files["README.md"]!;
		expect(readme).toContain("File Ownership");
		expect(readme).toContain("PUID");
		expect(readme).toContain("PGID");
	});
});

describe("First-boot sentinel", () => {
	it("start.sh contains sentinel-based first-boot onboarding", () => {
		const result = generateStack("openclaw", ["redis"]);
		const startSh = result.files["scripts/start.sh"]!;
		expect(startSh).toContain(".openclaw-bootstrapped");
		expect(startSh).toContain("First boot detected");
		expect(startSh).toContain("onboard");
	});

	it("start.sh auto-detects PUID/PGID", () => {
		const result = generateStack("openclaw", ["redis"]);
		const startSh = result.files["scripts/start.sh"]!;
		expect(startSh).toContain("id -u");
		expect(startSh).toContain("id -g");
	});

	it(".gitignore contains .openclaw-bootstrapped", () => {
		const result = generateStack("openclaw", ["redis"]);
		const gitignore = result.files[".gitignore"]!;
		expect(gitignore).toContain(".openclaw-bootstrapped");
	});
});

describe("CLAUDE.md generation", () => {
	it("generates CLAUDE.md in workspace directory", () => {
		const result = generateStack("openclaw", ["redis"]);
		expect(result.files).toHaveProperty("openclaw/workspace/CLAUDE.md");
	});

	it("CLAUDE.md contains project context", () => {
		const result = generateStack("openclaw", ["redis", "postgresql"], {
			aiProviders: ["openai"],
		});
		const claudeMd = result.files["openclaw/workspace/CLAUDE.md"]!;
		expect(claudeMd).toContain("Architecture");
		expect(claudeMd).toContain("Services");
		expect(claudeMd).toContain("Redis");
		expect(claudeMd).toContain("PostgreSQL");
		expect(claudeMd).toContain("OPENAI_API_KEY");
		expect(claudeMd).toContain("Common Commands");
	});
});
