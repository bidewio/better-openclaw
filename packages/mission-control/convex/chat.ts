import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthTenantId } from "./lib/tenant";

/** Send a chat message. */
export const sendMessage = mutation({
	args: {
		conversationId: v.string(),
		content: v.string(),
		fromAgentId: v.optional(v.id("agents")),
		fromUser: v.optional(v.string()),
		toAgentId: v.optional(v.id("agents")),
		messageType: v.optional(
			v.union(v.literal("text"), v.literal("system"), v.literal("handoff"), v.literal("command")),
		),
		metadata: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const tenantId = await requireAuthTenantId(ctx);
		return await ctx.db.insert("chatMessages", {
			conversationId: args.conversationId,
			content: args.content,
			fromAgentId: args.fromAgentId,
			fromUser: args.fromUser,
			toAgentId: args.toAgentId,
			messageType: args.messageType ?? "text",
			metadata: args.metadata,
			tenantId,
		});
	},
});

/** List messages in a conversation. */
export const listMessages = query({
	args: {
		conversationId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tenantId = await requireAuthTenantId(ctx);
		const limit = Math.min(args.limit ?? 100, 500);
		const messages = await ctx.db
			.query("chatMessages")
			.withIndex("by_conversation", (q) =>
				q.eq("tenantId", tenantId).eq("conversationId", args.conversationId),
			)
			.order("asc")
			.take(limit);

		// Enrich with agent info
		const enriched = await Promise.all(
			messages.map(async (msg) => {
				let fromAgent = null;
				let toAgent = null;
				if (msg.fromAgentId) {
					fromAgent = await ctx.db.get(msg.fromAgentId);
				}
				if (msg.toAgentId) {
					toAgent = await ctx.db.get(msg.toAgentId);
				}
				return {
					...msg,
					fromAgent: fromAgent
						? { name: fromAgent.name, avatar: fromAgent.avatar, role: fromAgent.role }
						: null,
					toAgent: toAgent ? { name: toAgent.name, avatar: toAgent.avatar } : null,
				};
			}),
		);
		return enriched;
	},
});

/** List all conversations (derived from distinct conversationIds). */
export const listConversations = query({
	args: {},
	handler: async (ctx) => {
		const tenantId = await requireAuthTenantId(ctx);
		const allMessages = await ctx.db
			.query("chatMessages")
			.withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
			.order("desc")
			.collect();

		// Group by conversationId
		const convMap = new Map<
			string,
			{
				id: string;
				lastMessageAt: number;
				messageCount: number;
				lastMessage: string;
				participants: Set<string>;
			}
		>();

		for (const msg of allMessages) {
			const existing = convMap.get(msg.conversationId);
			if (!existing) {
				const participants = new Set<string>();
				if (msg.fromUser) participants.add(msg.fromUser);
				convMap.set(msg.conversationId, {
					id: msg.conversationId,
					lastMessageAt: msg._creationTime,
					messageCount: 1,
					lastMessage: msg.content.slice(0, 100),
					participants,
				});
			} else {
				existing.messageCount++;
				if (msg.fromUser) existing.participants.add(msg.fromUser);
			}
		}

		return Array.from(convMap.values())
			.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
			.map((c) => ({
				...c,
				participants: Array.from(c.participants),
			}));
	},
});

/** Mark messages as read. */
export const markRead = mutation({
	args: {
		messageIds: v.array(v.id("chatMessages")),
	},
	handler: async (ctx, args) => {
		const tenantId = await requireAuthTenantId(ctx);
		const now = Date.now();
		for (const id of args.messageIds) {
			const msg = await ctx.db.get(id);
			if (msg && msg.tenantId === tenantId && !msg.readAt) {
				await ctx.db.patch(id, { readAt: now });
			}
		}
	},
});

/** Delete a message. */
export const deleteMessage = mutation({
	args: { messageId: v.id("chatMessages") },
	handler: async (ctx, args) => {
		const tenantId = await requireAuthTenantId(ctx);
		const msg = await ctx.db.get(args.messageId);
		if (msg && msg.tenantId === tenantId) {
			await ctx.db.delete(args.messageId);
		}
	},
});
