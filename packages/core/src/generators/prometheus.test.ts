import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { generate } from "../generate.js";
import type { ResolverOutput } from "../types.js";
import { generatePrometheusConfig } from "./prometheus.js";

function makeResolved(serviceIds: string[]): ResolverOutput {
	return {
		services: serviceIds.map((id) => ({
			definition: {
				id,
				name: id.charAt(0).toUpperCase() + id.slice(1),
				description: "",
				icon: "📦",
				category: "test",
				image: `${id}:latest`,
				ports: [],
				volumes: [],
				environment: [],
				dependencies: [],
				conflicts: [],
				skills: [],
				memoryMB: 256,
				docsUrl: "",
			},
			addedBy: "user" as const,
		})),
		addedDependencies: [],
		estimatedMemoryMB: 512,
	} as unknown as ResolverOutput;
}

describe("generatePrometheusConfig", () => {
	it("always includes prometheus self-monitoring", () => {
		const config = generatePrometheusConfig(makeResolved(["redis"]));
		expect(config).toContain('job_name: "prometheus"');
		expect(config).toContain("localhost:9090");
	});

	it("includes scrape config for redis", () => {
		const config = generatePrometheusConfig(makeResolved(["redis"]));
		expect(config).toContain('job_name: "redis"');
		expect(config).toContain("redis:9121");
	});

	it("includes scrape config for postgresql", () => {
		const config = generatePrometheusConfig(makeResolved(["postgresql"]));
		expect(config).toContain('job_name: "postgresql"');
		expect(config).toContain("postgresql:9187");
	});

	it("includes scrape configs for multiple services", () => {
		const config = generatePrometheusConfig(makeResolved(["redis", "n8n", "minio"]));
		expect(config).toContain('job_name: "redis"');
		expect(config).toContain('job_name: "n8n"');
		expect(config).toContain('job_name: "minio"');
	});

	it("skips services without known metrics endpoints", () => {
		const config = generatePrometheusConfig(makeResolved(["ffmpeg"]));
		expect(config).not.toContain('job_name: "ffmpeg"');
	});

	it("does not duplicate prometheus job", () => {
		const config = generatePrometheusConfig(makeResolved(["prometheus", "redis"]));
		const matches = config.match(/job_name: "prometheus"/g);
		expect(matches).toHaveLength(1);
	});

	it("always includes openclaw gateway metrics", () => {
		const config = generatePrometheusConfig(makeResolved(["redis"]));
		expect(config).toContain('job_name: "openclaw-gateway"');
		expect(config).toContain("openclaw:18789");
	});

	it("is valid YAML", () => {
		const config = generatePrometheusConfig(makeResolved(["redis", "postgresql"]));
		const parsed = parse(config);
		expect(parsed).toBeDefined();
		expect(parsed.global).toBeDefined();
		expect(parsed.scrape_configs).toBeInstanceOf(Array);
	});

	it("sets correct metrics paths per service", () => {
		const config = generatePrometheusConfig(makeResolved(["minio"]));
		expect(config).toContain("/minio/v2/metrics/cluster");
	});
});

describe("prometheus via generate()", () => {
	it("generates prometheus config when monitoring is enabled", () => {
		const result = generate({
			projectName: "prom-test",
			services: ["redis"],
			skillPacks: [],
			proxy: "none",
			gpu: false,
			platform: "linux/amd64",
			deployment: "local",
			generateSecrets: true,
			openclawVersion: "latest",
			monitoring: true,
		});
		expect(result.files).toHaveProperty("prometheus/prometheus.yml");
		const promConfig = parse(result.files["prometheus/prometheus.yml"]!);
		expect(promConfig.scrape_configs.length).toBeGreaterThan(0);
	});
});
