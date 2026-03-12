import type { ServiceDefinition } from "../../types.js";

export const apptensionSaasDefinition: ServiceDefinition = {
	id: "apptension-saas",
	name: "SaaS Boilerplate (Apptension)",
	description:
		"Production-ready SaaS boilerplate with React frontend, Django backend, GraphQL API, PostgreSQL, async workers, email, Stripe payments, and Docker Compose support.",
	category: "saas-boilerplate",
	icon: "🚀",

	gitSource: {
		repoUrl: "https://github.com/apptension/saas-boilerplate.git",
		branch: "master",
		postCloneCommands: [],
	},
	buildContext: {
		dockerfile: "Dockerfile",
		context: ".",
	},

	ports: [
		{
			host: 3101,
			container: 80,
			description: "Apptension SaaS web application",
			exposed: true,
		},
	],
	volumes: [],
	environment: [
		{
			key: "APPTENSION_SAAS_DB_PASSWORD",
			defaultValue: "",
			secret: true,
			description: "Database password for Apptension SaaS",
			required: true,
		},
		{
			key: "DB_CONNECTION",
			defaultValue:
				"postgresql://apptensionsaas:${APPTENSION_SAAS_DB_PASSWORD}@postgresql:5432/apptensionsaas",
			secret: false,
			description: "PostgreSQL connection string",
			required: true,
		},
		{
			key: "DJANGO_SECRET_KEY",
			defaultValue: "",
			secret: true,
			description: "Django secret key",
			required: true,
		},
		{
			key: "REDIS_URL",
			defaultValue: "redis://redis:6379/0",
			secret: false,
			description: "Redis connection URL for caching and async workers",
			required: true,
		},
	],
	healthcheck: {
		test: "wget -q --spider http://localhost:80/ || exit 1",
		interval: "30s",
		timeout: "10s",
		retries: 3,
		startPeriod: "60s",
	},
	dependsOn: ["postgresql", "redis"],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://docs.demo.saas.apptension.com",
	tags: ["saas", "boilerplate", "react", "django", "graphql", "stripe", "enterprise"],
	maturity: "beta",

	requires: ["postgresql", "redis"],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 768,
	gpuRequired: false,
};
