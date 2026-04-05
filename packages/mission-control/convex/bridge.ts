import { httpAction } from "./_generated/server";
import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Timing-safe bridge token check for HTTP actions. */
function verifyBridgeToken(request: Request): boolean {
	const expected = process.env.BRIDGE_TOKEN;
	if (!expected) return true; // dev mode: no token configured → allow all

	const authHeader = request.headers.get("Authorization") ?? "";
	const provided = authHeader.startsWith("Bearer ")
		? authHeader.slice(7)
		: "";

	if (provided.length !== expected.length) return false;

	// Constant-time comparison (best-effort in JS runtime)
	let mismatch = 0;
	for (let i = 0; i < provided.length; i++) {
		mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
	}
	return mismatch === 0;
}

function unauthorizedResponse(): Response {
	return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
		status: 401,
		headers: { "Content-Type": "application/json" },
	});
}

// ─── Internal Mutations (no auth required, called by HTTP actions) ───────────

/**
 * Bridge-specific task approval — patches status to "done" without
 * requiring a logged-in user or agentId (bridge is a system actor).
 */
export const bridgeApproveTask = internalMutation({
	args: {
		taskId: v.id("tasks"),
	},
	handler: async (ctx, args) => {
		const task = await ctx.db.get(args.taskId);
		if (!task) throw new Error(`Task ${args.taskId} not found`);

		await ctx.db.patch(args.taskId, {
			status: "done",
			updatedAt: Date.now(),
		});
	},
});

/**
 * Bridge-specific task creation — creates a task without requiring
 * auth context. Uses the fleet instance's tenantId for isolation.
 */
export const bridgeCreateTask = internalMutation({
	args: {
		instanceId: v.id("fleetInstances"),
		title: v.string(),
		description: v.string(),
	},
	handler: async (ctx, args) => {
		const instance = await ctx.db.get(args.instanceId);
		if (!instance) throw new Error(`Fleet instance ${args.instanceId} not found`);

		const taskId = await ctx.db.insert("tasks", {
			title: args.title,
			description: args.description,
			status: "inbox",
			assigneeIds: [],
			tags: ["bridge"],
			tenantId: instance.tenantId,
			updatedAt: Date.now(),
		});
		return taskId;
	},
});

// ─── Command Relay (MC UI → Convex action → fetch bridge) ───────────────────

/**
 * Bridge command relay — allows Mission Control to send commands
 * to the Bridge sidecar running alongside the deployed stack.
 *
 * Flow: MC UI → Convex action → fetch(bridge endpoint) → Docker command
 */
export const execBridgeCommand = action({
	args: {
		instanceId: v.id("fleetInstances"),
		command: v.string(),
		payload: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const instance = await ctx.runQuery(api.fleet.getFleetInstance, {
			id: args.instanceId,
		});

		if (!instance?.host) {
			throw new Error("Fleet instance has no bridge host configured");
		}

		const bridgeUrl = instance.host.replace(/\/$/, "");

		const resp = await fetch(`${bridgeUrl}/commands/${args.command}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.BRIDGE_TOKEN ?? ""}`,
			},
			body: args.payload ?? "{}",
		});

		if (!resp.ok) {
			const error = await resp.text();
			throw new Error(`Bridge command failed: ${resp.status} ${error}`);
		}

		return await resp.json();
	},
});

// ─── HTTP Actions (called by bridge sidecar) ────────────────────────────────

/**
 * HTTP action for bridge heartbeat.
 * Called by the bridge sidecar every 30s to report stack status.
 */
export const heartbeat = httpAction(async (ctx, request) => {
	if (!verifyBridgeToken(request)) return unauthorizedResponse();

	try {
		const body = await request.json();

		await ctx.runMutation(api.fleet.updateInstanceStatus, {
			id: body.instanceId,
			status: body.status,
			serviceStatuses: body.serviceStatuses,
			configHash: body.configHash,
		});

		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
});

/**
 * HTTP action for task approval relay.
 * Uses internalMutation to bypass auth (bridge is a system actor).
 */
export const taskApprove = httpAction(async (ctx, request) => {
	if (!verifyBridgeToken(request)) return unauthorizedResponse();

	try {
		const body = await request.json();

		if (!body.taskId) {
			return new Response(
				JSON.stringify({ ok: false, error: "taskId is required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		await ctx.runMutation(internal.bridge.bridgeApproveTask, {
			taskId: body.taskId,
		});

		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
});

/**
 * HTTP action for task dispatch relay.
 * Creates a new task linked to the fleet instance's tenant.
 */
export const taskDispatch = httpAction(async (ctx, request) => {
	if (!verifyBridgeToken(request)) return unauthorizedResponse();

	try {
		const body = await request.json();

		if (!body.title || !body.instanceId) {
			return new Response(
				JSON.stringify({ ok: false, error: "title and instanceId are required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const taskId = await ctx.runMutation(internal.bridge.bridgeCreateTask, {
			instanceId: body.instanceId,
			title: body.title,
			description: body.description ?? "",
		});

		return new Response(JSON.stringify({ ok: true, taskId }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
});
