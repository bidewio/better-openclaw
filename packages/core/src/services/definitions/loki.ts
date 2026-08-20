import type { ServiceDefinition } from "../../types.js";

export const lokiDefinition: ServiceDefinition = {
	id: "loki",
	name: "Loki",
	description:
		"Like Prometheus, but for logs. A highly available, multi-tenant log aggregation system.",
	category: "monitoring",
	icon: "🪵",

	image: "grafana/loki",
	imageTag: "3.7.1",
	ports: [
		{
			host: 3100,
			container: 3100,
			description: "Loki HTTP API interface",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "loki_data",
			containerPath: "/loki",
			description: "Loki logs and chunks storage",
		},
	],
	environment: [],
	healthcheck: {
		test: "wget -q --spider http://localhost:3100/ready || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "15s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://grafana.com/docs/loki/latest/",
	tags: ["logs", "aggregation", "observability", "grafana"],
	maturity: "stable",

	requires: [],
	recommends: ["grafana", "prometheus"],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
};
