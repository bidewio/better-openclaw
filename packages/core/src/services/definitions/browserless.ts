import type { ServiceDefinition } from "../../types.js";

export const browserlessDefinition: ServiceDefinition = {
	id: "browserless",
	name: "Browserless",
	description:
		"Headless Chrome browser-as-a-service for web scraping, PDF generation, screenshots, and browser automation at scale.",
	category: "browser",
	icon: "🌐",

	image: "browserless/chrome",
	imageTag: "latest",
	ports: [
		{
			host: 3010,
			container: 3000,
			description: "Browserless HTTP and WebSocket API",
			exposed: true,
		},
	],
	volumes: [],
	environment: [
		{
			key: "TOKEN",
			defaultValue: "",
			secret: true,
			description: "Authentication token for Browserless API access",
			required: true,
		},
		{
			key: "MAX_CONCURRENT_SESSIONS",
			defaultValue: "5",
			secret: false,
			description: "Maximum number of concurrent browser sessions",
			required: true,
		},
	],
	healthcheck: {
		test: "curl -sf http://localhost:3000/?token=$TOKEN || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "15s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [{ skillId: "browserless-browse", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "BROWSERLESS_HOST",
			defaultValue: "browserless",
			secret: false,
			description: "Browserless hostname for OpenClaw",
			required: true,
		},
		{
			key: "BROWSERLESS_PORT",
			defaultValue: "3000",
			secret: false,
			description: "Browserless port for OpenClaw",
			required: true,
		},
		{
			key: "BROWSERLESS_TOKEN",
			defaultValue: "${TOKEN}",
			secret: true,
			description: "Browserless API token for OpenClaw (references service token)",
			required: true,
		},
	],

	docsUrl: "https://www.browserless.io/docs/",
	tags: ["browser", "scraping", "pdf", "screenshots", "automation"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 512,
	gpuRequired: false,
	capDropCompatible: false,
	proxyPath: "/browserless",
	firstBootCapabilities: ["SYS_ADMIN"],
};
