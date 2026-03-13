import type { ServiceDefinition } from "../../types.js";

export const minioDefinition: ServiceDefinition = {
	id: "minio",
	name: "MinIO",
	description:
		"S3-compatible high-performance object storage for storing assets, backups, and large files with a built-in web console.",
	category: "storage",
	icon: "💾",

	image: "minio/minio",
	imageTag: "RELEASE.2025-04-22T22-12-26Z",
	ports: [
		{
			host: 9000,
			container: 9000,
			description: "MinIO S3-compatible API",
			exposed: true,
		},
		{
			host: 9001,
			container: 9001,
			description: "MinIO web console",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "minio-data",
			containerPath: "/data",
			description: "Persistent MinIO object storage data",
		},
	],
	environment: [
		{
			key: "MINIO_ROOT_USER",
			defaultValue: "minioadmin",
			secret: false,
			description: "MinIO root user (access key)",
			required: true,
		},
		{
			key: "MINIO_ROOT_PASSWORD",
			defaultValue: "",
			secret: true,
			description: "MinIO root password (secret key, minimum 8 characters)",
			required: true,
			validation: "^.{8,}$",
		},
	],
	command: "server /data --console-address ':9001'",
	healthcheck: {
		test: "mc ready local || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "10s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "minio-storage", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "MINIO_HOST",
			defaultValue: "minio",
			secret: false,
			description: "MinIO hostname for OpenClaw",
			required: true,
		},
		{
			key: "MINIO_PORT",
			defaultValue: "9000",
			secret: false,
			description: "MinIO API port for OpenClaw",
			required: true,
		},
		{
			key: "MINIO_ACCESS_KEY",
			defaultValue: "${MINIO_ROOT_USER}",
			secret: false,
			description: "MinIO access key for OpenClaw (references root user)",
			required: true,
		},
		{
			key: "MINIO_SECRET_KEY",
			defaultValue: "${MINIO_ROOT_PASSWORD}",
			secret: true,
			description: "MinIO secret key for OpenClaw (references root password)",
			required: true,
		},
	],

	docsUrl: "https://min.io/docs/minio/container/index.html",
	tags: ["s3", "object-storage", "assets", "backup"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 256,
	gpuRequired: false,
	capDropCompatible: true,
	proxyPath: "/minio",
};
