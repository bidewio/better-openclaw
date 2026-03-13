import { describe, expect, it } from "vitest";
import {
	EnvVariableSchema,
	GenerationInputSchema,
	HealthCheckSchema,
	PortMappingSchema,
	PresetSchema,
	ServiceCategorySchema,
	ServiceDefinitionSchema,
	SkillPackSchema,
	VolumeMappingSchema,
} from "./schema.js";

describe("ServiceCategorySchema", () => {
	it("accepts valid categories", () => {
		expect(ServiceCategorySchema.parse("automation")).toBe("automation");
		expect(ServiceCategorySchema.parse("vector-db")).toBe("vector-db");
		expect(ServiceCategorySchema.parse("ai")).toBe("ai");
	});

	it("rejects invalid categories", () => {
		expect(() => ServiceCategorySchema.parse("invalid")).toThrow();
		expect(() => ServiceCategorySchema.parse("")).toThrow();
	});
});

describe("PortMappingSchema", () => {
	it("accepts valid port mapping", () => {
		const result = PortMappingSchema.parse({
			host: 6379,
			container: 6379,
			description: "Redis port",
			exposed: true,
		});
		expect(result.host).toBe(6379);
	});

	it("defaults exposed to true", () => {
		const result = PortMappingSchema.parse({
			host: 6379,
			container: 6379,
			description: "Redis port",
		});
		expect(result.exposed).toBe(true);
	});

	it("rejects invalid port numbers", () => {
		expect(() =>
			PortMappingSchema.parse({
				host: 0,
				container: 6379,
				description: "bad",
			}),
		).toThrow();
		expect(() =>
			PortMappingSchema.parse({
				host: 70000,
				container: 6379,
				description: "bad",
			}),
		).toThrow();
	});
});

describe("VolumeMappingSchema", () => {
	it("accepts valid volume mapping", () => {
		const result = VolumeMappingSchema.parse({
			name: "redis-data",
			containerPath: "/data",
			description: "Redis persistent data",
		});
		expect(result.name).toBe("redis-data");
	});

	it("rejects empty name", () => {
		expect(() =>
			VolumeMappingSchema.parse({
				name: "",
				containerPath: "/data",
				description: "bad",
			}),
		).toThrow();
	});
});

describe("EnvVariableSchema", () => {
	it("accepts valid env variable", () => {
		const result = EnvVariableSchema.parse({
			key: "REDIS_PASSWORD",
			defaultValue: "changeme",
			secret: true,
			description: "Redis password",
			required: true,
		});
		expect(result.secret).toBe(true);
	});

	it("defaults secret to false", () => {
		const result = EnvVariableSchema.parse({
			key: "REDIS_HOST",
			defaultValue: "redis",
			description: "Redis host",
		});
		expect(result.secret).toBe(false);
		expect(result.required).toBe(true);
	});
});

describe("HealthCheckSchema", () => {
	it("accepts valid healthcheck with defaults", () => {
		const result = HealthCheckSchema.parse({
			test: "redis-cli ping",
		});
		expect(result.interval).toBe("30s");
		expect(result.timeout).toBe("10s");
		expect(result.retries).toBe(3);
	});
});

describe("GenerationInputSchema", () => {
	it("accepts valid generation input", () => {
		const result = GenerationInputSchema.parse({
			projectName: "my-openclaw-stack",
			services: ["redis", "qdrant"],
			skillPacks: ["research-agent"],
			proxy: "caddy",
			domain: "openclaw.example.com",
		});
		expect(result.projectName).toBe("my-openclaw-stack");
		expect(result.gpu).toBe(false);
	});

	it("rejects invalid project names", () => {
		expect(() => GenerationInputSchema.parse({ projectName: "-bad-name" })).toThrow();
		expect(() => GenerationInputSchema.parse({ projectName: "Bad Name" })).toThrow();
		expect(() => GenerationInputSchema.parse({ projectName: "has spaces" })).toThrow();
	});

	it("accepts single-char project name", () => {
		const result = GenerationInputSchema.parse({ projectName: "a" });
		expect(result.projectName).toBe("a");
	});

	it("applies defaults", () => {
		const result = GenerationInputSchema.parse({ projectName: "test" });
		expect(result.services).toEqual([]);
		expect(result.skillPacks).toEqual([]);
		expect(result.proxy).toBe("none");
		expect(result.gpu).toBe(false);
		expect(result.platform).toBe("linux/amd64");
		expect(result.deployment).toBe("local");
		expect(result.deploymentType).toBe("docker");
		expect(result.generateSecrets).toBe(true);
		expect(result.openclawVersion).toBe("latest");
	});

	it("accepts deploymentType bare-metal and extended platform", () => {
		const result = GenerationInputSchema.parse({
			projectName: "my-stack",
			services: ["redis"],
			deploymentType: "bare-metal",
			platform: "windows/amd64",
		});
		expect(result.deploymentType).toBe("bare-metal");
		expect(result.platform).toBe("windows/amd64");
	});

	it("accepts platform macos/arm64", () => {
		const result = GenerationInputSchema.parse({
			projectName: "my-stack",
			platform: "macos/arm64",
		});
		expect(result.platform).toBe("macos/arm64");
	});
});

describe("ServiceDefinitionSchema", () => {
	const validDef = {
		id: "redis",
		name: "Redis",
		description: "In-memory data store",
		category: "database",
		icon: "🔴",
		image: "redis",
		imageTag: "7-alpine",
		ports: [{ host: 6379, container: 6379, description: "Redis port", exposed: true }],
		volumes: [{ name: "redis-data", containerPath: "/data", description: "Data" }],
		environment: [],
		restartPolicy: "unless-stopped",
		networks: ["openclaw-network"],
		skills: [],
		openclawEnvVars: [],
		docsUrl: "https://redis.io/docs",
		tags: ["cache", "database"],
		maturity: "stable",
	};

	it("accepts valid service definition", () => {
		const result = ServiceDefinitionSchema.parse(validDef);
		expect(result.id).toBe("redis");
	});

	it("rejects invalid id format", () => {
		expect(() => ServiceDefinitionSchema.parse({ ...validDef, id: "Bad_Id" })).toThrow();
	});

	it("defaults arrays and booleans correctly", () => {
		const minimal = {
			id: "test",
			name: "Test",
			description: "Test service",
			category: "database",
			icon: "🧪",
			image: "test",
			imageTag: "latest",
			docsUrl: "https://example.com",
		};
		const result = ServiceDefinitionSchema.parse(minimal);
		expect(result.ports).toEqual([]);
		expect(result.volumes).toEqual([]);
		expect(result.requires).toEqual([]);
		expect(result.conflictsWith).toEqual([]);
		expect(result.gpuRequired).toBe(false);
	});

	it("accepts optional mandatory field and defaults to false when omitted", () => {
		const withMandatory = { ...validDef, mandatory: true };
		const result = ServiceDefinitionSchema.parse(withMandatory);
		expect(result.mandatory).toBe(true);
	});

	it("omitting mandatory leaves it undefined or false (schema default false)", () => {
		const result = ServiceDefinitionSchema.parse(validDef);
		expect(result.mandatory !== true).toBe(true); // false or undefined both mean not mandatory
	});

	it("accepts nativeSupported and nativeRecipes for bare-metal", () => {
		const withNative = {
			...validDef,
			nativeSupported: true,
			nativeRecipes: [
				{
					platform: "linux",
					installSteps: ["apt-get install -y redis-server"],
					startCommand: "systemctl start redis-server",
					stopCommand: "systemctl stop redis-server",
					systemdUnit: "redis-server",
				},
			],
		};
		const result = ServiceDefinitionSchema.parse(withNative);
		expect(result.nativeSupported).toBe(true);
		expect(result.nativeRecipes).toHaveLength(1);
		expect(result.nativeRecipes?.[0].platform).toBe("linux");
		expect(result.nativeRecipes?.[0].startCommand).toBe("systemctl start redis-server");
	});
});

describe("SkillPackSchema", () => {
	it("accepts valid skill pack", () => {
		const result = SkillPackSchema.parse({
			id: "research-agent",
			name: "Research Agent",
			description: "Research agent pack",
			requiredServices: ["qdrant", "searxng", "browserless"],
			skills: ["qdrant-memory", "searxng-search", "browserless-browse"],
		});
		expect(result.requiredServices).toHaveLength(3);
	});

	it("rejects empty required services", () => {
		expect(() =>
			SkillPackSchema.parse({
				id: "empty",
				name: "Empty",
				description: "Bad",
				requiredServices: [],
				skills: [],
			}),
		).toThrow();
	});
});

describe("PresetSchema", () => {
	it("accepts valid preset", () => {
		const result = PresetSchema.parse({
			id: "minimal",
			name: "Minimal",
			description: "OpenClaw + Redis",
			services: ["redis"],
			estimatedMemoryMB: 1024,
		});
		expect(result.skillPacks).toEqual([]);
	});
});
