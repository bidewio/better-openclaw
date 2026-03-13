import type { ServiceDefinition } from "../../types.js";

export const convexDefinition: ServiceDefinition = {
	id: "convex",
	name: "Convex",
	description:
		"Self-hosted Convex reactive backend. Real-time database, server functions, and file storage in a single service. Required by Mission Control.",
	category: "database",
	icon: "⚡",

	image: "ghcr.io/get-convex/convex-backend",
	imageTag: "latest",
	ports: [
		{
			host: 3210,
			container: 3210,
			description: "Convex API (client connections & CLI)",
			exposed: true,
		},
		{
			host: 3211,
			container: 3211,
			description: "Convex HTTP actions / site proxy",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "convex-data",
			containerPath: "/convex/data",
			description: "Convex data directory (SQLite by default)",
		},
	],
	environment: [
		{
			key: "CONVEX_CLOUD_ORIGIN",
			defaultValue: "http://127.0.0.1:3210",
			secret: false,
			description: "Public URL for the Convex API endpoint",
			required: true,
		},
		{
			key: "CONVEX_SITE_ORIGIN",
			defaultValue: "http://127.0.0.1:3211",
			secret: false,
			description: "Public URL for Convex HTTP actions",
			required: true,
		},
		{
			key: "INSTANCE_NAME",
			defaultValue: "openclaw-convex",
			secret: false,
			description: "Instance name for this Convex deployment",
			required: false,
		},
		{
			key: "INSTANCE_SECRET",
			defaultValue: "",
			secret: true,
			description: "Instance secret (generate a random value for production)",
			required: false,
		},
		{
			key: "DATABASE_URL",
			defaultValue: "",
			secret: true,
			description: "Optional Postgres connection string for production (leave empty to use SQLite)",
			required: false,
		},
		{
			key: "RUST_LOG",
			defaultValue: "info",
			secret: false,
			description: "Log level for the Convex backend (debug, info, warn, error)",
			required: false,
		},
		{
			key: "DISABLE_BEACON",
			defaultValue: "",
			secret: false,
			description: "Set to any value to disable anonymous usage telemetry",
			required: false,
		},
		{
			key: "CONVEX_SELF_HOSTED_ADMIN_KEY",
			defaultValue: "",
			secret: true,
			description:
				"Admin key for CLI access. Generate with: docker compose exec convex ./generate_admin_key.sh",
			required: false,
		},
		{
			key: "CONVEX_INSTANCE_SECRET",
			defaultValue: "${INSTANCE_SECRET}",
			secret: true,
			description: "Convex instance secret used by Mission Control (synced with INSTANCE_SECRET)",
			required: false,
		},
	],
	healthcheck: {
		test: "curl -f http://localhost:3210/version",
		interval: "5s",
		timeout: "5s",
		retries: 5,
		startPeriod: "10s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://github.com/get-convex/convex-backend",
	selfHostedDocsUrl: "https://github.com/get-convex/convex-backend/blob/main/self-hosted/README.md",
	tags: ["convex", "database", "reactive", "real-time", "backend", "self-hosted"],
	maturity: "stable",

	requires: [],
	recommends: ["convex-dashboard"],
	conflictsWith: [],
	mandatory: true,
	removalWarning:
		"Convex is the backend for Mission Control. Without it, Mission Control will not be able to store or retrieve any data and will be completely non-functional.",

	minMemoryMB: 256,
	gpuRequired: false,
	capDropCompatible: false,
	envQuirks: [
		{
			key: "DISABLE_BEACON",
			issue: "empty_string_crashes" as const,
			fix: { type: "set_value" as const, value: "true" },
		},
		{
			key: "INSTANCE_SECRET",
			issue: "min_length" as const,
			fix: { type: "generate_hex" as const, minBytes: 32 },
		},
		{
			key: "CONVEX_SELF_HOSTED_ADMIN_KEY",
			issue: "min_length" as const,
			fix: { type: "generate_hex" as const, minBytes: 32 },
		},
		{
			key: "INSTANCE_SECRET",
			issue: "must_sync" as const,
			fix: { type: "sync_with" as const, syncKey: "CONVEX_INSTANCE_SECRET" },
		},
	],
};
