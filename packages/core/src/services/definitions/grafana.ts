import type { ServiceDefinition } from "../../types.js";

export const grafanaDefinition: ServiceDefinition = {
	id: "grafana",
	name: "Grafana",
	description:
		"Open-source analytics and interactive visualization platform for metrics, logs, and traces with rich dashboards and alerting.",
	category: "monitoring",
	icon: "📊",

	image: "grafana/grafana",
	imageTag: "12.4.0",
	ports: [
		{
			host: 3150,
			container: 3000,
			description: "Grafana web interface",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "grafana-data",
			containerPath: "/var/lib/grafana",
			description: "Persistent Grafana dashboards, plugins, and data",
		},
	],
	environment: [
		{
			key: "GF_SECURITY_ADMIN_USER",
			defaultValue: "admin",
			secret: false,
			description: "Grafana admin username",
			required: true,
		},
		{
			key: "GF_SECURITY_ADMIN_PASSWORD",
			defaultValue: "",
			secret: true,
			description: "Grafana admin password",
			required: true,
		},
	],
	healthcheck: {
		test: "curl -sf http://localhost:3000/api/health || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "15s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [
		{
			key: "GRAFANA_HOST",
			defaultValue: "grafana",
			secret: false,
			description: "Grafana hostname",
			required: false,
		},
		{
			key: "GRAFANA_PORT",
			defaultValue: "3000",
			secret: false,
			description: "Grafana internal port",
			required: false,
		},
	],

	docsUrl: "https://grafana.com/docs/grafana/latest/",
	tags: ["dashboards", "visualization", "metrics", "monitoring"],
	maturity: "stable",

	requires: ["prometheus"],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 256,
	gpuRequired: false,
	capDropCompatible: true,
	proxyPath: "/grafana",
	envQuirks: [
		{
			key: "GF_SECURITY_ADMIN_PASSWORD",
			issue: "min_length" as const,
			fix: { type: "generate_base64url" as const, minBytes: 16 },
		},
	],
};
