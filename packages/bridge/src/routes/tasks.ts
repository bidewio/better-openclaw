import { Hono } from "hono";
import { z } from "zod";

const ApproveSchema = z.object({ taskId: z.string().min(1) });
const DispatchSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
});

/**
 * Task relay routes.
 * These forward task commands to the Convex backend via ConvexSyncClient.
 * The convexSync parameter is optional — if not configured, endpoints return 501.
 */
export function taskRoutes(convexSync: {
	approveTask: (taskId: string) => Promise<void>;
	dispatchTask: (title: string, description?: string) => Promise<string>;
} | null): Hono {
	const app = new Hono();

	/** POST /tasks/approve — Approve a pending task. */
	app.post("/tasks/approve", async (c) => {
		if (!convexSync) {
			return c.json(
				{ error: { code: "NOT_CONFIGURED", message: "Convex sync not configured" } },
				501,
			);
		}

		const body = ApproveSchema.safeParse(await c.req.json());
		if (!body.success) {
			return c.json({ error: { code: "VALIDATION", message: body.error.message } }, 400);
		}

		await convexSync.approveTask(body.data.taskId);
		return c.json({ ok: true, taskId: body.data.taskId });
	});

	/** POST /tasks/dispatch — Dispatch a new task. */
	app.post("/tasks/dispatch", async (c) => {
		if (!convexSync) {
			return c.json(
				{ error: { code: "NOT_CONFIGURED", message: "Convex sync not configured" } },
				501,
			);
		}

		const body = DispatchSchema.safeParse(await c.req.json());
		if (!body.success) {
			return c.json({ error: { code: "VALIDATION", message: body.error.message } }, 400);
		}

		const taskId = await convexSync.dispatchTask(
			body.data.title,
			body.data.description,
		);
		return c.json({ ok: true, taskId });
	});

	return app;
}
