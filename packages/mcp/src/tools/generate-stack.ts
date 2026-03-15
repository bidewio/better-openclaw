import type { OperationsLogger } from "@better-openclaw/core";
import { buildAnalyticsPayload, generate, trackAnalytics } from "@better-openclaw/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerGenerateStack(server: McpServer, logger?: OperationsLogger): void {
	server.registerTool(
		"generate-stack",
		{
			title: "Generate Stack",
			description:
				"Generate a complete Docker Compose stack. Returns all generated files (docker-compose.yml, .env, README.md, scripts, configs) as a JSON map of { filename: content }. This is the main tool for creating deployable infrastructure from a list of services.",
			inputSchema: {
				projectName: z
					.string()
					.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/)
					.describe("Project name (lowercase alphanumeric with hyphens, e.g. 'my-stack')"),
				services: z
					.array(z.string())
					.describe("Service IDs to include (e.g. ['postgresql', 'redis', 'n8n', 'ollama'])"),
				skillPacks: z.array(z.string()).optional().describe("Skill pack IDs to include"),
				proxy: z
					.enum(["none", "caddy", "traefik"])
					.optional()
					.describe("Reverse proxy (default: none)"),
				domain: z.string().optional().describe("Domain for SSL/reverse proxy routing"),
				gpu: z.boolean().optional().describe("Enable GPU passthrough (default: false)"),
				platform: z
					.enum(["linux/amd64", "linux/arm64", "windows/amd64", "macos/amd64", "macos/arm64"])
					.optional()
					.describe("Target platform (default: linux/amd64)"),
				monitoring: z
					.boolean()
					.optional()
					.describe("Include monitoring stack — Grafana + Prometheus (default: false)"),
				generateSecrets: z
					.boolean()
					.optional()
					.describe("Auto-generate secure passwords and keys (default: true)"),
				primaryFramework: z
					.enum([
						"openclaw",
						"copaw",
						"nanoclaw",
						"nanobot",
						"zeroclaw",
						"memu",
						"claude-code",
						"codex",
					])
					.optional()
					.describe("Primary agent framework (default: openclaw)"),
				companionFrameworks: z
					.array(
						z.enum([
							"openclaw",
							"copaw",
							"nanoclaw",
							"nanobot",
							"zeroclaw",
							"memu",
							"claude-code",
							"codex",
						]),
					)
					.optional()
					.describe("Companion agent frameworks to run alongside the primary"),
			},
		},
		async (params) => {
			try {
				logger?.info("mcp_tool_call", "generate-stack invoked", {
					projectName: params.projectName,
					services: params.services,
					proxy: params.proxy,
				});

				const input = {
					projectName: params.projectName,
					services: params.services,
					skillPacks: params.skillPacks ?? [],
					aiProviders: [],
					gsdRuntimes: [],
					proxy: params.proxy ?? "none",
					domain: params.domain,
					gpu: params.gpu ?? false,
					platform: params.platform ?? "linux/amd64",
					monitoring: params.monitoring ?? false,
					generateSecrets: params.generateSecrets ?? true,
					primaryFramework: params.primaryFramework,
					companionFrameworks: params.companionFrameworks,
					openclawVersion: "latest",
					deployment: "local",
					deploymentType: "docker",
					openclawImage: "official",
					deployTarget: "local",
					hardened: true,
				} as const;

				const result = generate(input, { logger });

				// Fire-and-forget analytics tracking
				const analyticsPayload = buildAnalyticsPayload(input, result.metadata, "mcp");
				trackAnalytics(analyticsPayload);

				logger?.info("mcp_tool_call", "generate-stack completed", {
					fileCount: Object.keys(result.files).length,
					serviceCount: result.metadata.serviceCount,
				});

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									files: result.files,
									metadata: result.metadata,
									fileList: Object.keys(result.files),
								},
								null,
								2,
							),
						},
					],
				};
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				const errName = err instanceof Error ? err.name : "UnknownError";
				logger?.error("mcp_tool_call", "generate-stack failed", err instanceof Error ? err : null);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: message,
								type: errName,
							}),
						},
					],
					isError: true,
				};
			}
		},
	);
}
