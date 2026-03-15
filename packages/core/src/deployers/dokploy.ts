/**
 * Dokploy PaaS deployer — deploys Docker Compose stacks via the Dokploy REST API.
 *
 * API docs: https://docs.dokploy.com/docs/api
 * Auth: x-api-key header
 * Endpoints use dot-notation (e.g. /api/project.create, /api/compose.deploy)
 */

import { sanitizeComposeForPaas } from "./strip-host-ports.js";
import type {
	DeployInput,
	DeployResult,
	DeployStep,
	DeployTarget,
	DokployEnvironment,
	PaasDeployer,
	PaasServer,
} from "./types.js";

interface DokployProject {
	projectId: string;
	name: string;
	description: string;
	environments?: DokployEnvironment[];
}

interface DokployCompose {
	composeId: string;
	name: string;
	status?: string;
	compose?: string;
}

interface ProjectCreateResult {
	project: DokployProject;
	projectId: string;
	name: string;
	description: string;
	environments?: { environmentId: string; name: string }[];
}

/** Build a full Dokploy API URL from a dot-notation endpoint (e.g. "project.create"). */
function apiUrl(target: DeployTarget, endpoint: string): string {
	const base = target.instanceUrl.replace(/\/+$/, "");
	return `${base}/api/${endpoint}`;
}
/**
 * Typed fetch wrapper for the Dokploy API.
 * Handles JSON serialisation, x-api-key auth, and error extraction.
 */
async function dokployFetch<T>(
	target: DeployTarget,
	endpoint: string,
	options: { method?: string; body?: unknown } = {},
): Promise<T> {
	const res = await fetch(apiUrl(target, endpoint), {
		method: options.method ?? "GET",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": target.apiKey,
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

		throw new Error(`Dokploy API ${res.status}: ${detail}`);
	}

	const text = await res.text();
	if (!text) return undefined as T;

	return JSON.parse(text) as T;
}

/**
 * Simple hash for compose diff detection
 */
function hashString(str: string) {
	let hash = 0;

	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}

	return hash;
}

/**
 * Deploys Docker Compose stacks to a Dokploy instance.
 *
 * Deploy flow (4 steps):
 *   1. Create a Dokploy project
 *   2. Create a compose stack inside the project's default environment
 *   3. Push .env variables to the compose stack
 *   4. Trigger the deployment
 */

export class DokployDeployer implements PaasDeployer {
	readonly name = "Dokploy";
	readonly id = "dokploy";

	async testConnection(target: DeployTarget): Promise<{ ok: boolean; error?: string }> {
		try {
			await dokployFetch<DokployProject[]>(target, "project.all");

			return { ok: true };
		} catch (err) {
			return {
				ok: false,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	async listServers(target: DeployTarget): Promise<PaasServer[]> {
		try {
			const servers = await dokployFetch<{ serverId: string; name: string; ipAddress: string }[]>(
				target,
				"server.all",
			);
			return servers.map((s) => ({
				id: s.serverId,
				name: s.name,
				ip: s.ipAddress,
			}));
		} catch {
			// Return empty list if server API is not available
			return [];
		}
	}

	async deploy(input: DeployInput): Promise<DeployResult> {
		input.logger?.info("deployment", `Starting deployment to Dokploy`, {
			projectName: input.projectName,
			instanceUrl: input.target.instanceUrl,
		});

		const step1: DeployStep = {
			step: "Find or create project",
			status: "pending",
		};
		const step2: DeployStep = {
			step: "Find default environment",
			status: "pending",
		};
		const step3: DeployStep = {
			step: "Find or create compose stack",
			status: "pending",
		};
		const step4: DeployStep = {
			step: "Update stack configuration",
			status: "pending",
		};
		const step5: DeployStep = { step: "Deploy stack", status: "pending" };
		const steps: DeployStep[] = [step1, step2, step3, step4, step5];

		const result: DeployResult = { success: false, steps };

		// Strip host port bindings — Dokploy routes via Traefik,
		// so host ports are unnecessary and cause "port already allocated" errors.
		const composeYaml = sanitizeComposeForPaas(input.composeYaml);

		try {
			/**
			 * STEP 1
			 * Find or create project
			 */

			step1.status = "running";

			const projects = await dokployFetch<DokployProject[]>(input.target, "project.all");

			let project = projects.find((p) => p.name === input.projectName);

			if (!project) {
				const created = await dokployFetch<ProjectCreateResult>(input.target, "project.create", {
					method: "POST",
					body: {
						name: input.projectName,
						description: input.description ?? `OpenClaw stack: ${input.projectName}`,
					},
				});

				project = created.project;
			}

			result.projectId = project.projectId;

			step1.status = "done";
			step1.detail = `Project ID: ${project.projectId}`;

			/**
			 * STEP 2
			 * Find default environment
			 */

			step2.status = "running";

			const projectDetail = await dokployFetch<DokployProject>(
				input.target,
				`project.one?projectId=${project.projectId}`,
			);

			const env = projectDetail.environments?.find((e) => e.isDefault);

			if (!env) throw new Error("No default environment");

			step2.status = "done";
			step2.detail = env.environmentId;

			/**
			 * STEP 3
			 * Find or create compose stack
			 */

			step3.status = "running";

			let stack: DokployCompose | null = null;

			stack = await dokployFetch<DokployCompose>(input.target, "compose.create", {
				method: "POST",
				body: {
					name: input.projectName,
					description: input.description ?? `Stack ${input.projectName}`,
					environmentId: env.environmentId,
					composeType: "docker-compose",
					composeFile: composeYaml,
					...(input.serverId ? { serverId: input.serverId } : {}),
				},
			});

			// Dokploy's compose.create schema does NOT accept sourceType;
			// it defaults to "github". We must update it to "raw" so the
			// deploy step writes the compose file from the stored YAML
			// instead of attempting to clone from a Git provider.
			if (stack?.composeId) {
				await dokployFetch(input.target, "compose.update", {
					method: "POST",
					body: {
						composeId: stack.composeId,
						sourceType: "raw",
					},
				});
			}

			result.composeId = stack?.composeId;
			step3.status = "done";
			step3.detail = stack?.composeId;

			/**
			 * STEP 4
			 * Update stack if compose changed
			 */

			step4.status = "running";

			const existingStack = await dokployFetch<DokployCompose>(
				input.target,
				`compose.one?composeId=${stack?.composeId}`,
			);

			const newHash = hashString(composeYaml);
			const oldHash = hashString(existingStack.compose ?? "");

			if (newHash !== oldHash) {
				await dokployFetch(input.target, "compose.update", {
					method: "POST",
					body: {
						composeId: stack?.composeId,
						composeFile: composeYaml,
						env: input.envContent ?? "",
					},
				});

				step4.detail = "Stack updated";
			} else {
				step4.detail = "No compose changes";
			}

			step4.status = "done";

			/**
			 * STEP 5
			 * Deploy
			 */

			step5.status = "running";

			await dokployFetch(input.target, "compose.deploy", {
				method: "POST",
				body: {
					composeId: stack?.composeId,

					title: `Deploy ${input.projectName}`,

					description: "CI deployment",
				},
			});

			step5.status = "done";

			result.success = true;

			const base = input.target.instanceUrl.replace(/\/+$/, "");

			result.dashboardUrl = `${base}/dashboard/project/${project.projectId}/environment/${env.environmentId}/services/compose/${stack?.composeId}?tab=deployments`;

			input.logger?.log({
				level: "info",
				category: "deployment",
				message: `Deployment to Dokploy succeeded`,
				outcome: "success",
				context: {
					projectId: project.projectId,
					composeId: stack?.composeId,
					dashboardUrl: result.dashboardUrl,
				},
				steps: steps.map((s) => ({
					name: s.step,
					status: s.status === "done" ? "success" as const : s.status === "error" ? "failure" as const : "in_progress" as const,
					detail: s.detail,
					startedAt: new Date().toISOString(),
				})),
			});

			return result;
		} catch (err) {
			const running = steps.find((s) => s.status === "running");

			if (running) {
				running.status = "error";

				running.detail = err instanceof Error ? err.message : String(err);
			}

			result.error = err instanceof Error ? err.message : String(err);

			input.logger?.error("deployment", `Deployment to Dokploy failed`, err instanceof Error ? err : null, {
				projectName: input.projectName,
				failedStep: running?.step,
			});

			return result;
		}
	}
}
