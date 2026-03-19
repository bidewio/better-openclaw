import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getTenantId } from "./lib/tenant";

/** List active (running) sandbox sessions for the current tenant */
export const listActive = query({
	args: {},
	handler: async (ctx) => {
		const tenantId = await getTenantId(ctx);
		return await ctx.db
			.query("sandboxSessions")
			.withIndex("by_tenant_status", (q) => q.eq("tenantId", tenantId).eq("status", "running"))
			.collect();
	},
});

/** List all sandbox sessions, optionally filtered by taskId */
export const listAll = query({
	args: { taskId: v.optional(v.id("tasks")) },
	handler: async (ctx, args) => {
		const tenantId = await getTenantId(ctx);

		if (args.taskId) {
			return await ctx.db
				.query("sandboxSessions")
				.withIndex("by_tenant_task", (q) => q.eq("tenantId", tenantId).eq("taskId", args.taskId))
				.collect();
		}

		return await ctx.db
			.query("sandboxSessions")
			.withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
			.order("desc")
			.take(50);
	},
});

/** Get a single sandbox session by Convex ID */
export const get = query({
	args: { sessionId: v.id("sandboxSessions") },
	handler: async (ctx, args) => {
		const tenantId = await getTenantId(ctx);
		const session = await ctx.db.get(args.sessionId);
		if (!session || session.tenantId !== tenantId) return null;
		return session;
	},
});

/** Get a sandbox session by its OpenSandbox UUID */
export const getBySandboxId = query({
	args: { sandboxId: v.string() },
	handler: async (ctx, args) => {
		const tenantId = await getTenantId(ctx);
		return await ctx.db
			.query("sandboxSessions")
			.withIndex("by_sandbox", (q) => q.eq("tenantId", tenantId).eq("sandboxId", args.sandboxId))
			.first();
	},
});

/** Create a new sandbox session record */
export const createSession = mutation({
	args: {
		sandboxId: v.string(),
		novncUrl: v.string(),
		vncEndpoint: v.optional(v.string()),
		devtoolsUrl: v.optional(v.string()),
		image: v.string(),
		resolution: v.optional(v.string()),
		taskId: v.optional(v.id("tasks")),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, args) => {
		const tenantId = await getTenantId(ctx);
		return await ctx.db.insert("sandboxSessions", {
			...args,
			status: "running",
			tenantId,
		});
	},
});

/** Update sandbox session status and/or URLs */
export const updateSession = mutation({
	args: {
		sessionId: v.id("sandboxSessions"),
		status: v.optional(
			v.union(
				v.literal("creating"),
				v.literal("running"),
				v.literal("terminated"),
				v.literal("error"),
			),
		),
		novncUrl: v.optional(v.string()),
		devtoolsUrl: v.optional(v.string()),
		errorMessage: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const tenantId = await getTenantId(ctx);
		const existing = await ctx.db.get(args.sessionId);
		if (!existing || existing.tenantId !== tenantId) {
			throw new Error("SandboxSession not found");
		}

		const patch: Record<string, unknown> = {};
		if (args.status) patch.status = args.status;
		if (args.novncUrl) patch.novncUrl = args.novncUrl;
		if (args.devtoolsUrl) patch.devtoolsUrl = args.devtoolsUrl;
		if (args.errorMessage) patch.errorMessage = args.errorMessage;
		if (args.status === "terminated") patch.terminatedAt = Date.now();

		await ctx.db.patch(args.sessionId, patch);
	},
});

/** Terminate a sandbox session */
export const terminateSession = mutation({
	args: { sessionId: v.id("sandboxSessions") },
	handler: async (ctx, args) => {
		const tenantId = await getTenantId(ctx);
		const existing = await ctx.db.get(args.sessionId);
		if (!existing || existing.tenantId !== tenantId) {
			throw new Error("SandboxSession not found");
		}
		await ctx.db.patch(args.sessionId, {
			status: "terminated" as const,
			terminatedAt: Date.now(),
		});
	},
});
