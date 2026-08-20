import { Writable } from "node:stream";
import type { OperationsLogger } from "@better-openclaw/core";
import { buildAnalyticsPayload, GenerationInputSchema, generate } from "@better-openclaw/core";
import { analyticsEvent, db } from "@better-openclaw/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import archiver from "archiver";

const route = new OpenAPIHono({
	// biome-ignore lint/suspicious/noExplicitAny: Hono OpenAPI hook typing workaround
	defaultHook: (result: any, c: any) => {
		if (!result.success) {
			return c.json(
				{
					error: {
						code: "VALIDATION_ERROR" as const,
						message: "Invalid generation input",
						details: result.error.issues.map(
							(issue: { path: Array<string | number>; message: string }) => ({
								field: issue.path.join("."),
								message: issue.message,
							}),
						),
					},
				},
				400,
			);
		}
	},
});

/** Sanitize a project name to prevent path traversal in ZIP archives. */
function sanitizeProjectName(name: string): string {
	return name.replace(/[^a-zA-Z0-9_\-. ]/g, "").replace(/\.{2,}/g, ".") || "project";
}

/** Build a ZIP buffer from generated files (projectName as root folder). */
function buildZipBuffer(projectName: string, files: Record<string, string>): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const archive = archiver("zip", { zlib: { level: 9 } });
		const chunks: Buffer[] = [];
		const collector = new Writable({
			write(chunk: Buffer, _enc, cb) {
				chunks.push(chunk);
				cb();
			},
		});
		archive.pipe(collector);
		archive.on("error", reject);
		archive.on("end", () => resolve(Buffer.concat(chunks)));

		for (const [path, content] of Object.entries(files)) {
			archive.append(Buffer.from(content, "utf8"), { name: `${projectName}/${path}` });
		}
		archive.finalize();
	});
}

const generatePost = createRoute({
	method: "post",
	path: "/",
	tags: ["Generation"],
	summary: "Generate a complete stack",
	description:
		"Generates Docker Compose files, environment configs, and supporting files for an OpenClaw stack. " +
		"Supports JSON (default), complete JSON (?format=complete), and ZIP (?format=zip or Accept: application/zip) output formats.",
	request: {
		query: z.object({
			format: z.string().optional(),
		}),
		body: {
			required: true,
			content: {
				"application/json": {
					schema: GenerationInputSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: "Generated stack files (JSON or ZIP)",
			content: {
				"application/json": {
					schema: z.object({
						files: z.record(z.string(), z.string()).optional(),
						metadata: z.any().optional(),
						formatVersion: z.string().optional(),
						input: z.any().optional(),
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
		409: {
			description: "Conflict error (e.g. conflicting services)",
			content: {
				"application/json": {
					schema: z.object({
						error: z.object({ code: z.string(), message: z.string() }),
					}),
				},
			},
		},
		500: {
			description: "Generation error",
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
route.openapi(generatePost, async (c: any) => {
	try {
		const input = c.req.valid("json");
		const logger = c.get("logger" as never) as OperationsLogger | undefined;
		const result = generate(input, { logger });

		// Fire-and-forget analytics tracking
		const analyticsPayload = buildAnalyticsPayload(input, result.metadata, "api");
		db.insert(analyticsEvent)
			.values(analyticsPayload)
			.catch(() => {});

		const accept = c.req.header("Accept") ?? "";
		const { format } = c.req.valid("query");

		// ZIP: return binary ZIP (Accept: application/zip or ?format=zip)
		const wantsZip = accept.includes("application/zip") || format?.toLowerCase() === "zip";
		if (wantsZip) {
			const projectName = sanitizeProjectName(input.projectName ?? "project");
			const zipBuffer = await buildZipBuffer(projectName, result.files);
			return c.body(new Uint8Array(zipBuffer), 200, {
				"Content-Disposition": `attachment; filename="${projectName}.zip"`,
				"Content-Type": "application/zip",
			});
		}

		// Complete JSON: input + files + metadata for clawexa.net or export (?format=complete)
		const wantsComplete =
			format?.toLowerCase() === "complete" ||
			accept.includes("application/vnd.openclaw.complete+json");
		if (wantsComplete) {
			return c.json({
				formatVersion: "1",
				input,
				files: result.files,
				metadata: result.metadata,
			});
		}

		// Default: files + metadata only
		return c.json({
			files: result.files,
			metadata: result.metadata,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Generation failed";
		const errName = err instanceof Error ? err.name : "";
		const isConfigError =
			errName === "StackConfigError" ||
			errName === "ValidationError" ||
			message.includes("Invalid stack configuration") ||
			message.includes("Validation failed");
		if (isConfigError) {
			return c.json({ error: { code: "CONFLICT_ERROR" as const, message } }, 409);
		}
		console.error("Generation error:", err);
		return c.json(
			{ error: { code: "GENERATION_ERROR" as const, message: "Generation failed" } },
			500,
		);
	}
});

export { route as generateRoute };
