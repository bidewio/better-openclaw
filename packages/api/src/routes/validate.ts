import { resolve, ValidateRequestSchema } from "@better-openclaw/core";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

const route = new OpenAPIHono({
	// biome-ignore lint/suspicious/noExplicitAny: Hono OpenAPI hook typing workaround
	defaultHook: (result: any, c: any) => {
		if (!result.success) {
			return c.json(
				{
					error: {
						code: "VALIDATION_ERROR" as const,
						message: "Invalid request body",
						details: result.error.issues.map((issue: any) => ({
							field: issue.path.join("."),
							message: issue.message,
						})),
					},
				},
				400,
			);
		}
	},
});

const validatePost = createRoute({
	method: "post",
	path: "/",
	tags: ["Validation"],
	summary: "Validate a stack configuration",
	request: {
		body: {
			required: true,
			content: {
				"application/json": {
					schema: ValidateRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: "Validation result",
			content: {
				"application/json": {
					schema: z.object({
						valid: z.boolean(),
						resolvedServices: z.array(z.string()),
						addedDependencies: z.array(z.any()),
						warnings: z.array(z.any()),
						conflicts: z.array(z.any()),
						estimatedMemoryMB: z.number(),
					}),
				},
			},
		},
		400: {
			description: "Validation error",
			content: {
				"application/json": {
					schema: z.object({
						error: z.object({
							code: z.string(),
							message: z.string(),
							details: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
						}),
					}),
				},
			},
		},
		500: {
			description: "Internal error",
			content: {
				"application/json": {
					schema: z.object({
						error: z.object({ code: z.string(), message: z.string() }),
					}),
				},
			},
		},
	},
});

// biome-ignore lint/suspicious/noExplicitAny: Hono OpenAPI handler typing workaround
route.openapi(validatePost, (c: any) => {
	try {
		const { services, skillPacks, proxy, gpu, platform, primaryFramework } = c.req.valid("json");

		const resolved = resolve({
			services,
			skillPacks,
			proxy,
			gpu,
			platform,
			primaryFramework,
		});

		return c.json({
			valid: resolved.isValid,
			resolvedServices: resolved.services.map(
				(s: { definition: { id: string } }) => s.definition.id,
			),
			addedDependencies: resolved.addedDependencies,
			warnings: resolved.warnings,
			conflicts: resolved.errors,
			estimatedMemoryMB: resolved.estimatedMemoryMB,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Validation failed";
		return c.json(
			{
				error: {
					code: "INTERNAL_ERROR" as const,
					message,
				},
			},
			500,
		);
	}
});

export { route as validateRoute };
