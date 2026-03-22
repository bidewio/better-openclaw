import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// OpenClaw webhook endpoint
http.route({
	path: "/openclaw/event",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const body = await request.json();
		await ctx.runMutation(api.openclaw.receiveAgentEvent, body);
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}),
});

// Hermes Agent webhook endpoint
http.route({
	path: "/hermes/event",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const body = await request.json();
		await ctx.runMutation(api.hermes.receiveHermesEvent, body);
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}),
});

// Stack registration endpoint — accepts a stack-manifest.json payload
http.route({
	path: "/stack/register",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			const body = await request.json();

			// Parse the manifest and call registerStack mutation
			const stackId = await ctx.runMutation(api.stacks.registerStack, {
				projectName: body.projectName,
				domain: body.domain,
				deployment: body.deployment,
				deploymentType: body.deploymentType,
				platform: body.platform,
				proxy: body.proxy,
				manifestVersion: body.formatVersion ?? "1",
				services: body.services ?? [],
				skills: body.skills ?? [],
			});

			return new Response(JSON.stringify({ ok: true, stackId }), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			return new Response(JSON.stringify({ ok: false, error: message }), {
				status: 400,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			});
		}
	}),
});

// CORS preflight for stack registration
http.route({
	path: "/stack/register",
	method: "OPTIONS",
	handler: httpAction(async () => {
		return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		});
	}),
});

export default http;
