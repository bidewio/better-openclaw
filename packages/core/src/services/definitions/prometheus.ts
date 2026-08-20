import type { ServiceDefinition } from "../../types.js";

export const prometheusDefinition: ServiceDefinition = {
	id: "prometheus",
	name: "Prometheus",
	description:
		"Open-source systems monitoring and alerting toolkit for collecting and querying time-series metrics with a powerful query language (PromQL).",
	category: "monitoring",
	icon: "🔥",

	image: "prom/prometheus",
	imageTag: "v3.10.0",
	ports: [
		{
			host: 9090,
			container: 9090,
			description: "Prometheus web UI and API",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "prometheus-data",
			containerPath: "/prometheus",
			description: "Persistent Prometheus time-series data",
		},
	],
	environment: [],
	command: "--config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/prometheus",
	healthcheck: {
		test: "wget -q --spider http://localhost:9090/-/healthy || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "10s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://prometheus.io/docs/",
	tags: ["metrics", "time-series", "alerting", "monitoring"],
	maturity: "stable",

	requires: [],
	recommends: ["grafana"],
	conflictsWith: [],

	minMemoryMB: 256,
	gpuRequired: false,
};
