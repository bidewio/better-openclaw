import type { ServiceDefinition } from "../../types.js";

export const neo4jDefinition: ServiceDefinition = {
	id: "neo4j",
	name: "Neo4j",
	description:
		"Graph database platform for connected data, enabling knowledge graphs, fraud detection, and relationship-driven queries with the Cypher query language.",
	category: "database",
	icon: "🔵",

	image: "neo4j",
	imageTag: "2026.02.3-community",
	ports: [
		{
			host: 7474,
			container: 7474,
			description: "Neo4j Browser (HTTP)",
			exposed: true,
		},
		{
			host: 7687,
			container: 7687,
			description: "Bolt protocol",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "neo4j-data",
			containerPath: "/data",
			description: "Persistent Neo4j data",
		},
	],
	environment: [
		{
			key: "NEO4J_AUTH",
			defaultValue: "neo4j/${NEO4J_PASSWORD}",
			secret: true,
			description: "Neo4j authentication credentials (user/password)",
			required: true,
		},
	],
	healthcheck: {
		test: "wget -q --spider http://localhost:7474 || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "30s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [
		{
			key: "NEO4J_HOST",
			defaultValue: "neo4j",
			secret: false,
			description: "Neo4j hostname for OpenClaw",
			required: true,
		},
		{
			key: "NEO4J_BOLT_PORT",
			defaultValue: "7687",
			secret: false,
			description: "Neo4j Bolt protocol port for OpenClaw",
			required: true,
		},
		{
			key: "NEO4J_HTTP_PORT",
			defaultValue: "7474",
			secret: false,
			description: "Neo4j HTTP port for OpenClaw",
			required: true,
		},
		{
			key: "NEO4J_PASSWORD",
			defaultValue: "",
			secret: true,
			description: "Neo4j password for OpenClaw",
			required: true,
		},
	],

	docsUrl: "https://neo4j.com/docs/",
	tags: ["graph", "database", "knowledge-graph", "cypher"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
};
