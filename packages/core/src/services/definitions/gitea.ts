import type { ServiceDefinition } from "../../types.js";

export const giteaDefinition: ServiceDefinition = {
	id: "gitea",
	name: "Gitea",
	description:
		"Lightweight self-hosted Git service. Host private repos alongside your OpenClaw stack.",
	category: "dev-tools",
	icon: "🍵",

	image: "gitea/gitea",
	imageTag: "1.25.5",
	ports: [
		{
			host: 3130,
			container: 3000,
			description: "Gitea Web UI",
			exposed: true,
		},
		{
			host: 2222,
			container: 22,
			description: "Gitea SSH",
			exposed: true,
		},
	],
	volumes: [
		{
			name: "gitea-data",
			containerPath: "/data",
			description: "Gitea data and repos",
		},
	],
	environment: [],
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	skills: [],
	openclawEnvVars: [],

	docsUrl: "https://docs.gitea.com/",
	tags: ["git", "version-control", "repos", "code-hosting"],
	maturity: "stable",

	requires: [],
	recommends: [],
	conflictsWith: [],

	minMemoryMB: 128,
	gpuRequired: false,
};
