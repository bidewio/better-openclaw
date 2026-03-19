import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthTenantId } from "./lib/tenant";

/** Generate a daily standup report from current agent/task data. */
export const generateStandup = mutation({
	args: {
		date: v.optional(v.string()), // YYYY-MM-DD, defaults to today
	},
	handler: async (ctx, args) => {
		const tenantId = await requireAuthTenantId(ctx);
		const date = args.date ?? new Date().toISOString().split("T")[0]!;
		const now = Date.now();

		// Fetch agents
		const agents = await ctx.db
			.query("agents")
			.withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
			.collect();

		// Fetch tasks
		const tasks = await ctx.db
			.query("tasks")
			.withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
			.collect();

		// Fetch recent activities (last 24h)
		const dayAgo = now - 24 * 60 * 60 * 1000;
		const activities = await ctx.db
			.query("activities")
			.withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
			.order("desc")
			.collect();
		const recentActivities = activities.filter((a) => a._creationTime >= dayAgo);

		// Build per-agent reports
		const agentReports = agents.map((agent) => {
			const agentTasks = tasks.filter((t) => t.assigneeIds.includes(agent._id));
			const agentActivities = recentActivities.filter((a) => a.agentId === agent._id);

			return {
				agent: { name: agent.name, role: agent.role, status: agent.status, avatar: agent.avatar },
				completedToday: agentTasks
					.filter((t) => t.status === "done" && t.updatedAt && t.updatedAt >= dayAgo)
					.map((t) => ({ title: t.title, id: t._id })),
				inProgress: agentTasks
					.filter((t) => t.status === "in_progress")
					.map((t) => ({ title: t.title, id: t._id })),
				assigned: agentTasks
					.filter((t) => t.status === "assigned")
					.map((t) => ({ title: t.title, id: t._id })),
				review: agentTasks
					.filter((t) => t.status === "review")
					.map((t) => ({ title: t.title, id: t._id })),
				blocked: agentTasks
					.filter((t) => t.tags.includes("blocked"))
					.map((t) => ({ title: t.title, id: t._id })),
				activityCount: agentActivities.length,
			};
		});

		const completedToday = tasks.filter(
			(t) => t.status === "done" && t.updatedAt && t.updatedAt >= dayAgo,
		);

		const summary = {
			totalAgents: agents.length,
			totalCompleted: completedToday.length,
			totalInProgress: tasks.filter((t) => t.status === "in_progress").length,
			totalAssigned: tasks.filter((t) => t.status === "assigned").length,
			totalReview: tasks.filter((t) => t.status === "review").length,
			totalBlocked: tasks.filter((t) => t.tags.includes("blocked")).length,
			totalActivity: recentActivities.length,
		};

		const teamAccomplishments = completedToday.slice(0, 10).map((t) => ({
			title: t.title,
			id: t._id,
		}));

		const teamBlockers = tasks
			.filter((t) => t.tags.includes("blocked") && t.status !== "done")
			.map((t) => ({ title: t.title, id: t._id }));

		// Store the report
		const reportId = await ctx.db.insert("standupReports", {
			date,
			generatedAt: now,
			summary: JSON.stringify(summary),
			agentReports: JSON.stringify(agentReports),
			teamAccomplishments: JSON.stringify(teamAccomplishments),
			teamBlockers: JSON.stringify(teamBlockers),
			tenantId,
		});

		return { reportId, date, summary };
	},
});

/** List standup report history. */
export const listReports = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tenantId = await requireAuthTenantId(ctx);
		const limit = Math.min(args.limit ?? 20, 100);
		const reports = await ctx.db
			.query("standupReports")
			.withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
			.order("desc")
			.take(limit);

		return reports.map((r) => ({
			...r,
			summary: JSON.parse(r.summary),
			agentReports: JSON.parse(r.agentReports),
			teamAccomplishments: JSON.parse(r.teamAccomplishments),
			teamBlockers: JSON.parse(r.teamBlockers),
		}));
	},
});

/** Get a single standup report. */
export const getReport = query({
	args: { reportId: v.id("standupReports") },
	handler: async (ctx, args) => {
		const tenantId = await requireAuthTenantId(ctx);
		const report = await ctx.db.get(args.reportId);
		if (!report || report.tenantId !== tenantId) return null;
		return {
			...report,
			summary: JSON.parse(report.summary),
			agentReports: JSON.parse(report.agentReports),
			teamAccomplishments: JSON.parse(report.teamAccomplishments),
			teamBlockers: JSON.parse(report.teamBlockers),
		};
	},
});
