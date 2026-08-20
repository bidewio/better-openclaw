import { v } from "convex/values";
import { mutation } from "./_generated/server";

const SYSTEM_AGENT_NAME = "Hermes Agent";
const DEFAULT_TENANT_ID = "default";
const CODING_TOOLS = ["terminal", "write_file", "patch", "execute_code", "delegate_task"];

function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		const remainingMinutes = minutes % 60;
		return `${hours}h ${remainingMinutes}m`;
	}
	if (minutes > 0) {
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}
	return `${seconds}s`;
}

/**
 * Receive lifecycle events from a Hermes Agent instance.
 *
 * Hermes events are normalized to the same task/message/activity model
 * used by the OpenClaw handler, so both agents appear in the same
 * Mission Control dashboard.
 *
 * Event format mirrors the OpenClaw contract but with `source: "hermes"`.
 */
export const receiveHermesEvent = mutation({
	args: {
		runId: v.string(),
		action: v.string(),
		sessionKey: v.optional(v.union(v.string(), v.null())),
		agentId: v.optional(v.union(v.string(), v.null())),
		timestamp: v.optional(v.union(v.string(), v.null())),
		error: v.optional(v.union(v.string(), v.null())),
		prompt: v.optional(v.union(v.string(), v.null())),
		source: v.optional(v.union(v.string(), v.null())),
		message: v.optional(v.union(v.string(), v.null())),
		response: v.optional(v.union(v.string(), v.null())),
		eventType: v.optional(v.union(v.string(), v.null())),
		model: v.optional(v.union(v.string(), v.null())),
		platform: v.optional(v.union(v.string(), v.null())),
		toolName: v.optional(v.union(v.string(), v.null())),
		durationMs: v.optional(v.union(v.number(), v.null())),
		inputTokens: v.optional(v.union(v.number(), v.null())),
		outputTokens: v.optional(v.union(v.number(), v.null())),
		document: v.optional(
			v.object({
				title: v.string(),
				content: v.string(),
				type: v.string(),
				path: v.optional(v.string()),
			}),
		),
	},
	handler: async (ctx, args) => {
		// Find existing task by runId
		let task = await ctx.db
			.query("tasks")
			.filter((q) => q.eq(q.field("openclawRunId"), args.runId))
			.first();

		// Fallback: find by sessionKey
		if (!task && args.sessionKey) {
			const match = args.sessionKey.match(/mission:(.+)$/);
			if (match) {
				const taskId = ctx.db.normalizeId("tasks", match[1]!);
				if (taskId) {
					const candidate = await ctx.db.get(taskId);
					if (candidate) {
						task = candidate;
						await ctx.db.patch(task._id, { openclawRunId: args.runId });
					}
				}
			}
		}

		const tenantId = task?.tenantId ?? DEFAULT_TENANT_ID;

		// Find or create the Hermes system agent
		let systemAgent = await ctx.db
			.query("agents")
			.filter((q) =>
				q.and(q.eq(q.field("name"), SYSTEM_AGENT_NAME), q.eq(q.field("tenantId"), tenantId)),
			)
			.first();

		if (!systemAgent) {
			const agentId = await ctx.db.insert("agents", {
				name: SYSTEM_AGENT_NAME,
				role: "AI Agent",
				status: "active",
				level: "SPC",
				avatar: "☤",
				tenantId,
			});
			systemAgent = await ctx.db.get(agentId);
		}

		const agent = systemAgent;
		const now = Date.now();
		const platformTag = args.platform ? `hermes-${args.platform}` : "hermes";

		if (args.action === "start") {
			if (!task) {
				const title = args.prompt
					? summarizePrompt(args.prompt)
					: `Hermes task ${args.runId.slice(0, 8)}`;

				const description = args.prompt || `Hermes Agent task\nRun ID: ${args.runId}`;

				const taskId = await ctx.db.insert("tasks", {
					title,
					description,
					status: "in_progress",
					assigneeIds: agent ? [agent._id] : [],
					tags: [platformTag],
					sessionKey: args.sessionKey ?? undefined,
					openclawRunId: args.runId,
					startedAt: now,
					tenantId,
				});

				if (agent) {
					const modelInfo = args.model ? ` (${args.model})` : "";
					const platformInfo = args.platform ? ` via **${args.platform}**` : "";

					await ctx.db.insert("messages", {
						taskId,
						fromAgentId: agent._id,
						content: `☤ **Started**${modelInfo}${platformInfo}\n\n${args.prompt || "N/A"}`,
						attachments: [],
						tenantId,
					});

					await ctx.db.insert("activities", {
						type: "status_update",
						agentId: agent._id,
						message: `started "${title}"`,
						targetId: taskId,
						tenantId,
					});
				}
			} else if (args.prompt && task.title.startsWith("Hermes task")) {
				const title = summarizePrompt(args.prompt);
				await ctx.db.patch(task._id, {
					title,
					description: args.prompt,
					startedAt: now,
				});
			} else {
				await ctx.db.patch(task._id, {
					startedAt: now,
					usedCodingTools: false,
				});
			}
		} else if (args.action === "progress" && task && agent) {
			await ctx.db.insert("messages", {
				taskId: task._id,
				fromAgentId: agent._id,
				content: args.message || "Progress update",
				attachments: [],
				tenantId,
			});

			// Flag coding tool usage
			if (args.toolName && !task.usedCodingTools) {
				if (CODING_TOOLS.includes(args.toolName)) {
					await ctx.db.patch(task._id, { usedCodingTools: true });
				}
			}

			// Record observability event if token/cost data is present
			if (args.inputTokens || args.outputTokens || args.durationMs) {
				await ctx.db.insert("agentEvents", {
					agentId: agent._id,
					taskId: task._id,
					eventType: args.eventType ?? "tool_call",
					toolName: args.toolName ?? undefined,
					durationMs: args.durationMs ?? undefined,
					inputTokens: args.inputTokens ?? undefined,
					outputTokens: args.outputTokens ?? undefined,
					metadata: args.model ? JSON.stringify({ model: args.model }) : undefined,
					tenantId,
				});
			}
		} else if (args.action === "end" && task) {
			const needsFeedback = args.response ? args.response.includes("?") : false;

			let isCodingTask = task.usedCodingTools ?? false;
			if (!isCodingTask) {
				const codeDocs = await ctx.db
					.query("documents")
					.filter((q) =>
						q.and(
							q.eq(q.field("tenantId"), tenantId),
							q.eq(q.field("taskId"), task._id),
							q.eq(q.field("type"), "code"),
						),
					)
					.first();
				isCodingTask = codeDocs !== null;
			}

			const endStatus = needsFeedback || isCodingTask ? "review" : "done";
			await ctx.db.patch(task._id, { status: endStatus });

			const startTime = task.startedAt || task._creationTime;
			const duration = now - startTime;
			const durationStr = formatDuration(duration);

			if (agent) {
				const icon = needsFeedback ? "❓" : "✅";
				let completionMsg = `${icon} **${needsFeedback ? "Needs Input" : "Completed"}** in **${durationStr}**`;
				if (args.response) {
					completionMsg += `\n\n${args.response}`;
				}

				await ctx.db.insert("messages", {
					taskId: task._id,
					fromAgentId: agent._id,
					content: completionMsg,
					attachments: [],
					tenantId,
				});

				await ctx.db.insert("activities", {
					type: "status_update",
					agentId: agent._id,
					message: `${needsFeedback ? "needs input on" : "completed"} "${task.title}" in ${durationStr}`,
					targetId: task._id,
					tenantId,
				});
			}
		} else if (args.action === "error" && task) {
			await ctx.db.patch(task._id, { status: "review" });

			const startTime = task.startedAt || task._creationTime;
			const duration = now - startTime;
			const durationStr = formatDuration(duration);

			if (agent) {
				await ctx.db.insert("messages", {
					taskId: task._id,
					fromAgentId: agent._id,
					content: `❌ **Error** after **${durationStr}**\n\n${args.error || "Unknown error"}`,
					attachments: [],
					tenantId,
				});

				await ctx.db.insert("activities", {
					type: "status_update",
					agentId: agent._id,
					message: `error on "${task.title}" after ${durationStr}`,
					targetId: task._id,
					tenantId,
				});
			}
		} else if (args.action === "document" && args.document && agent) {
			const docId = await ctx.db.insert("documents", {
				title: args.document.title,
				content: args.document.content,
				type: args.document.type,
				path: args.document.path,
				taskId: task?._id,
				createdByAgentId: agent._id,
				tenantId,
			});

			let activityMsg = `created document "${args.document.title}"`;
			if (task) {
				activityMsg += ` for "${task.title}"`;
			}

			await ctx.db.insert("activities", {
				type: "document_created",
				agentId: agent._id,
				message: activityMsg,
				targetId: task?._id,
				tenantId,
			});

			if (task) {
				await ctx.db.insert("messages", {
					taskId: task._id,
					fromAgentId: agent._id,
					content: `📄 Created document: **${args.document.title}**\n\nType: ${args.document.type}${args.document.path ? `\nPath: \`${args.document.path}\`` : ""}`,
					attachments: [docId],
					tenantId,
				});
			}
		}
	},
});

function summarizePrompt(prompt: string): string {
	const cleaned = prompt.trim();
	const firstLine = cleaned.split("\n")[0]!.trim();
	if (firstLine.length <= 80) return firstLine;
	const truncated = firstLine.slice(0, 77);
	const lastSpace = truncated.lastIndexOf(" ");
	if (lastSpace > 50) return `${truncated.slice(0, lastSpace)}...`;
	return `${truncated}...`;
}
