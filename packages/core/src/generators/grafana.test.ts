import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { generateGrafanaConfig, generateGrafanaDashboard } from "./grafana.js";

describe("generateGrafanaConfig", () => {
	it("returns multiple config files", () => {
		const files = generateGrafanaConfig();
		expect(Object.keys(files).length).toBeGreaterThanOrEqual(3);
	});

	it("generates datasource provisioning YAML", () => {
		const files = generateGrafanaConfig();
		const dsFile = files["config/grafana/provisioning/datasources/prometheus.yml"];
		expect(dsFile).toBeDefined();
		const parsed = parse(dsFile!);
		expect(parsed.datasources).toBeInstanceOf(Array);
		expect(parsed.datasources[0].type).toBe("prometheus");
		expect(parsed.datasources[0].isDefault).toBe(true);
	});

	it("generates dashboard provisioning YAML", () => {
		const files = generateGrafanaConfig();
		const dashFile = files["config/grafana/provisioning/dashboards/default.yml"];
		expect(dashFile).toBeDefined();
		const parsed = parse(dashFile!);
		expect(parsed.providers).toBeInstanceOf(Array);
		expect(parsed.providers[0].name).toContain("OpenClaw");
	});

	it("generates grafana.ini configuration", () => {
		const files = generateGrafanaConfig();
		const iniFile = files["config/grafana/grafana.ini"];
		expect(iniFile).toBeDefined();
		expect(iniFile).toContain("[server]");
		expect(iniFile).toContain("[security]");
		expect(iniFile).toContain("[alerting]");
	});

	it("disables anonymous auth", () => {
		const files = generateGrafanaConfig();
		const iniFile = files["config/grafana/grafana.ini"]!;
		expect(iniFile).toContain("[auth.anonymous]");
		expect(iniFile).toContain("enabled = false");
	});
});

describe("generateGrafanaDashboard", () => {
	it("returns valid JSON", () => {
		const json = generateGrafanaDashboard();
		const dashboard = JSON.parse(json);
		expect(dashboard).toBeDefined();
	});

	it("includes expected panels", () => {
		const dashboard = JSON.parse(generateGrafanaDashboard());
		expect(dashboard.panels).toBeInstanceOf(Array);
		expect(dashboard.panels.length).toBe(3);

		const titles = dashboard.panels.map((p: { title: string }) => p.title);
		expect(titles).toContain("Service Health");
		expect(titles).toContain("Memory Usage");
		expect(titles).toContain("Request Rate");
	});

	it("uses prometheus as datasource", () => {
		const dashboard = JSON.parse(generateGrafanaDashboard());
		for (const panel of dashboard.panels) {
			expect(panel.datasource.type).toBe("prometheus");
		}
	});

	it("has openclaw tag", () => {
		const dashboard = JSON.parse(generateGrafanaDashboard());
		expect(dashboard.tags).toContain("openclaw");
	});

	it("has correct schema version", () => {
		const dashboard = JSON.parse(generateGrafanaDashboard());
		expect(dashboard.schemaVersion).toBe(39);
	});

	it("panels have proper grid positions", () => {
		const dashboard = JSON.parse(generateGrafanaDashboard());
		for (const panel of dashboard.panels) {
			expect(panel.gridPos).toBeDefined();
			expect(panel.gridPos.h).toBeGreaterThan(0);
			expect(panel.gridPos.w).toBeGreaterThan(0);
		}
	});
});
