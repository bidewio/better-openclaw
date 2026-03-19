import type { ServiceDefinition } from "../../types.js";

export const burnlinkDefinition: ServiceDefinition = {
	id: "burnlink",
	name: "BurnLink",
	description:
		"Privacy-first, zero-knowledge file sharing with end-to-end browser-side AES-256-GCM encryption, one-time downloads, view-once mode, and brute-force protection.",
	category: "storage",
	icon: "🔥",

	image: "diopisemou/burnlink",
	imageTag: "latest",
	ports: [
		{
			host: 3250,
			container: 3000,
			description: "BurnLink web interface",
			exposed: true,
		},
	],
	volumes: [],
	environment: [
		{
			key: "PORT",
			defaultValue: "3000",
			secret: false,
			description: "Server listen port",
			required: false,
		},
		{
			key: "SUPABASE_URL",
			defaultValue: "",
			secret: false,
			description: "Supabase project URL for metadata storage",
			required: true,
		},
		{
			key: "SUPABASE_SERVICE_ROLE_KEY",
			defaultValue: "",
			secret: true,
			description: "Supabase service role key",
			required: true,
		},
		{
			key: "R2_ACCOUNT_ID",
			defaultValue: "",
			secret: false,
			description: "Cloudflare R2 account ID (or MinIO endpoint for self-hosted)",
			required: true,
		},
		{
			key: "R2_ACCESS_KEY_ID",
			defaultValue: "",
			secret: true,
			description: "S3-compatible storage access key",
			required: true,
		},
		{
			key: "R2_SECRET_ACCESS_KEY",
			defaultValue: "",
			secret: true,
			description: "S3-compatible storage secret key",
			required: true,
		},
		{
			key: "R2_BUCKET_NAME",
			defaultValue: "burnlink",
			secret: false,
			description: "Storage bucket name for encrypted files",
			required: true,
		},
		{
			key: "CANONICAL_BASE_URL",
			defaultValue: "",
			secret: false,
			description: "Public URL for share links (e.g., https://burn.example.com)",
			required: false,
		},
		{
			key: "MAX_UPLOAD_BYTES",
			defaultValue: "1073741824",
			secret: false,
			description: "Max file upload size in bytes (default 1 GB)",
			required: false,
		},
		{
			key: "NODE_ENV",
			defaultValue: "production",
			secret: false,
			description: "Node environment (production enables rate limiting)",
			required: false,
		},
	],
	healthcheck: {
		test: "wget -q --spider http://localhost:3000/ || exit 1",
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
			key: "BURNLINK_HOST",
			defaultValue: "burnlink",
			secret: false,
			description: "BurnLink hostname",
			required: false,
		},
		{
			key: "BURNLINK_PORT",
			defaultValue: "3000",
			secret: false,
			description: "BurnLink internal port",
			required: false,
		},
	],

	docsUrl: "https://github.com/diopisemou/BurnLink",
	tags: ["file-sharing", "encryption", "privacy", "zero-knowledge", "self-destruct"],
	maturity: "beta",

	requires: [],
	recommends: ["supabase", "minio"],
	conflictsWith: [],

	minMemoryMB: 128,
	gpuRequired: false,
	capDropCompatible: true,
	proxyPath: "/burnlink",
	envQuirks: [
		{
			key: "R2_SECRET_ACCESS_KEY",
			issue: "min_length" as const,
			fix: { type: "generate_base64url" as const, minBytes: 24 },
		},
	],
};
