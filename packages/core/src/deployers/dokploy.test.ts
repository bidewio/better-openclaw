import { describe, expect, it, vi, beforeEach } from "vitest";

describe("DokployDeployer", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("can be imported and instantiated", async () => {
		const { DokployDeployer } = await import("./dokploy.js");
		const deployer = new DokployDeployer();
		expect(deployer.name).toBe("Dokploy");
		expect(deployer.id).toBe("dokploy");
	});

	it("testConnection returns error on network failure", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
		);
		const { DokployDeployer } = await import("./dokploy.js");
		const deployer = new DokployDeployer();
		const result = await deployer.testConnection({
			instanceUrl: "https://dokploy.example.com",
			apiKey: "test-key",
		});
		expect(result.ok).toBe(false);
		expect(result.error).toContain("ECONNREFUSED");
		vi.unstubAllGlobals();
	});

	it("testConnection returns ok when project list succeeds", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				text: () => Promise.resolve("[]"),
			}),
		);
		const { DokployDeployer } = await import("./dokploy.js");
		const deployer = new DokployDeployer();
		const result = await deployer.testConnection({
			instanceUrl: "https://dokploy.example.com",
			apiKey: "test-key",
		});
		expect(result.ok).toBe(true);
		vi.unstubAllGlobals();
	});

	it("listServers returns empty array on API failure", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new Error("Not found")),
		);
		const { DokployDeployer } = await import("./dokploy.js");
		const deployer = new DokployDeployer();
		const servers = await deployer.listServers({
			instanceUrl: "https://dokploy.example.com",
			apiKey: "test-key",
		});
		expect(servers).toEqual([]);
		vi.unstubAllGlobals();
	});

	it("listServers maps server fields correctly", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				text: () =>
					Promise.resolve(
						JSON.stringify([
							{ serverId: "s1", name: "Production", ipAddress: "1.2.3.4" },
							{ serverId: "s2", name: "Staging", ipAddress: "5.6.7.8" },
						]),
					),
			}),
		);
		const { DokployDeployer } = await import("./dokploy.js");
		const deployer = new DokployDeployer();
		const servers = await deployer.listServers({
			instanceUrl: "https://dokploy.example.com",
			apiKey: "test-key",
		});
		expect(servers).toHaveLength(2);
		expect(servers[0]).toEqual({ id: "s1", name: "Production", ip: "1.2.3.4" });
		expect(servers[1]).toEqual({ id: "s2", name: "Staging", ip: "5.6.7.8" });
		vi.unstubAllGlobals();
	});

	it("deploy sets error on running step when an API call fails", async () => {
		let callCount = 0;
		vi.stubGlobal(
			"fetch",
			vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// project.all succeeds
					return Promise.resolve({
						ok: true,
						text: () => Promise.resolve("[]"),
					});
				}
				// project.create fails
				return Promise.resolve({
					ok: false,
					status: 500,
					text: () => Promise.resolve('{"message":"Internal error"}'),
				});
			}),
		);
		const { DokployDeployer } = await import("./dokploy.js");
		const deployer = new DokployDeployer();
		const result = await deployer.deploy({
			target: { instanceUrl: "https://dokploy.example.com", apiKey: "key" },
			projectName: "test",
			composeYaml: "version: '3'",
			envContent: "",
		});
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		// At least one step should be in error state
		const errorStep = result.steps.find((s) => s.status === "error");
		expect(errorStep).toBeDefined();
		vi.unstubAllGlobals();
	});
});
