/**
 * Coolify PaaS deployer
 *
 * Deploys Docker Compose stacks via Coolify v4 API
 *
 * Docs:
 * https://coolify.io/docs/api-reference/api
 *
 * Auth:
 * Authorization: Bearer <token>
 *
 * Base path:
 * /api/v1
 */

import { sanitizeComposeForPaas } from "./strip-host-ports.js";
import type { DeployInput, DeployResult, DeployStep, DeployTarget, PaasDeployer } from "./types.js";

/* ----------------------------- */
/* Coolify API Types */
/* ----------------------------- */

interface CoolifyProject {
	uuid: string;
	name: string;
	environments?: {
		uuid: string;
		name: string;
	}[];
}

interface CoolifyServer {
	uuid: string;
	name: string;
	ip: string;
}

interface CoolifyService {
	uuid: string;
	name: string;
	docker_compose_raw?: string;
}

interface CoolifyDeployment {
	message: string;
	resource_uuid: string;
	deployment_uuid: string;
}

/* ----------------------------- */
/* Utilities */
/* ----------------------------- */

function apiUrl(target: DeployTarget, path: string) {
	const base = target.instanceUrl.replace(/\/+$/, "");
	return `${base}/api/v1${path}`;
}

async function coolifyFetch<T>(
	target: DeployTarget,
	path: string,
	options: { method?: string; body?: unknown } = {},
): Promise<T> {
	const res = await fetch(apiUrl(target, path), {
		method: options.method ?? "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${target.apiKey}`,
		},
		body: options.body ? JSON.stringify(options.body) : undefined,
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		let detail = text;

		try {
			const json = JSON.parse(text);
			detail = json.message || json.error || text;
		} catch {}

		throw new Error(`Coolify API ${res.status}: ${detail}`);
	}

	const text = await res.text();

	if (!text) return undefined as T;

	return JSON.parse(text);
}

function hashString(str: string) {
	let hash = 0;

	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}

	return hash;
}

function parseEnvContent(envContent?: string) {
	if (!envContent) return [];

	const result = [];

	for (const line of envContent.split("\n")) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("#")) continue;

		const idx = trimmed.indexOf("=");

		if (idx <= 0) continue;

		const key = trimmed.slice(0, idx);
		const value = trimmed.slice(idx + 1);

		result.push({
			key,
			value,
			is_preview: false,
			is_build_time: false,
			is_literal: true,
		});
	}

	return result;
}

/* ----------------------------- */
/* Coolify Deployer */
/* ----------------------------- */

export class CoolifyDeployer implements PaasDeployer {
	readonly name = "Coolify";
	readonly id = "coolify";

	async testConnection(target: DeployTarget) {
		try {
			await coolifyFetch(target, "/version");

			return { ok: true };
		} catch (err) {
			return {
				ok: false,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	async deploy(input: DeployInput): Promise<DeployResult> {
		const step1: DeployStep = { step: "Discover server", status: "pending" };
		const step2: DeployStep = {
			step: "Find or create project",
			status: "pending",
		};
		const step3: DeployStep = {
			step: "Find or create service",
			status: "pending",
		};
		const step4: DeployStep = {
			step: "Update environment variables",
			status: "pending",
		};
		const step5: DeployStep = { step: "Trigger deployment", status: "pending" };
		const steps: DeployStep[] = [step1, step2, step3, step4, step5];

		const result: DeployResult = { success: false, steps };

		// Strip host port bindings — Coolify routes via Traefik,
		// so host ports are unnecessary and cause "port already allocated" errors.
		const composeYaml = sanitizeComposeForPaas(input.composeYaml);

		try {
			/* ----------------------------- */
			/* STEP 1: Discover server */
			/* ----------------------------- */

			step1.status = "running";

			const servers = await coolifyFetch<CoolifyServer[]>(input.target, "/servers");

			if (!servers.length) {
				throw new Error("No Coolify servers available");
			}

			const [server] = servers;
			if (!server) {
				throw new Error("No Coolify servers available");
			}

			step1.status = "done";
			step1.detail = `${server.name} (${server.ip})`;

			/* ----------------------------- */
			/* STEP 2: Find or create project */
			/* ----------------------------- */

			step2.status = "running";

			const projects = await coolifyFetch<CoolifyProject[]>(input.target, "/projects");

			let project = projects.find((p) => p.name === input.projectName);

			if (!project) {
				project = await coolifyFetch<CoolifyProject>(input.target, "/projects", {
					method: "POST",
					body: {
						name: input.projectName,
						description: input.description ?? `Stack ${input.projectName}`,
					},
				});
			}

			result.projectId = project.uuid;

			step2.status = "done";
			step2.detail = project.uuid;

			/* ----------------------------- */
			/* Find environment */
			/* ----------------------------- */

			const projectDetail = await coolifyFetch<CoolifyProject>(
				input.target,
				`/projects/${project.uuid}`,
			);

			const env =
				projectDetail.environments?.find((e) => e.name === "production") ??
				projectDetail.environments?.[0];

			if (!env) throw new Error("No environment found");

			/* ----------------------------- */
			/* STEP 3: Find or create service */
			/* ----------------------------- */

			step3.status = "running";

			const services = await coolifyFetch<CoolifyService[]>(
				input.target,
				`/projects/${project.uuid}/services`,
			);

			let service = services.find((s) => s.name === input.projectName);

			if (!service) {
				service = await coolifyFetch<CoolifyService>(input.target, "/services", {
					method: "POST",
					body: {
						project_uuid: project.uuid,

						server_uuid: server.uuid,

						environment_uuid: env.uuid,

						environment_name: env.name,

						docker_compose_raw: composeYaml,

						name: input.projectName,
					},
				});
			} else {
				const newHash = hashString(composeYaml);
				const oldHash = hashString(service.docker_compose_raw ?? "");

				if (newHash !== oldHash) {
					await coolifyFetch(input.target, `/services/${service.uuid}`, {
						method: "PATCH",
						body: {
							docker_compose_raw: composeYaml,
						},
					});
				}
			}

			result.composeId = service.uuid;

			step3.status = "done";
			step3.detail = service.uuid;

			/* ----------------------------- */
			/* STEP 4: Environment variables */
			/* ----------------------------- */

			step4.status = "running";

			const envVars = parseEnvContent(input.envContent);

			if (envVars.length) {
				await coolifyFetch(input.target, `/services/${service.uuid}/envs`, {
					method: "PATCH",
					body: envVars,
				});
			}

			step4.status = "done";
			step4.detail = `${envVars.length} vars`;

			/* ----------------------------- */
			/* STEP 5: Deploy */
			/* ----------------------------- */

			step5.status = "running";

			const deploy = await coolifyFetch<{ deployments: CoolifyDeployment[] }>(
				input.target,
				`/deploy?uuid=${service.uuid}&force=true`,
			);

			step5.status = "done";
			step5.detail = deploy.deployments?.[0]?.deployment_uuid ?? "Deployment started";

			result.success = true;

			const base = input.target.instanceUrl.replace(/\/+$/, "");

			result.dashboardUrl = `${base}/project/${project.uuid}`;

			return result;
		} catch (err) {
			const running = steps.find((s) => s.status === "running");

			if (running) {
				running.status = "error";
				running.detail = err instanceof Error ? err.message : String(err);
			}

			result.error = err instanceof Error ? err.message : String(err);

			return result;
		}
	}
}
