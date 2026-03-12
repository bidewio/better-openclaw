import { db, savedStack } from "@better-openclaw/db";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../middleware/session.js";

/** Zod schema for creating a stack (POST). */
const CreateStackSchema = z.object({
	name: z
		.string()
		.min(1, "Stack name is required")
		.max(100, "Stack name must be 100 characters or fewer"),
	description: z.string().max(1000, "Description must be 1000 characters or fewer").nullish(),
	services: z
		.array(z.string().max(100))
		.min(1, "At least one service is required")
		.max(200, "Too many services"),
	config: z.record(z.string(), z.unknown()).optional().default({}),
});

/** Zod schema for updating a stack (PATCH). All fields optional. */
const UpdateStackSchema = z.object({
	name: z
		.string()
		.min(1, "Stack name cannot be empty")
		.max(100, "Stack name must be 100 characters or fewer")
		.optional(),
	description: z.string().max(1000, "Description must be 1000 characters or fewer").nullish(),
	services: z
		.array(z.string().max(100))
		.min(1, "At least one service is required")
		.max(200, "Too many services")
		.optional(),
	config: z.record(z.string(), z.unknown()).optional(),
});

const route = new Hono();

// Apply session middleware to all routes
route.use("/*", requireSession());

// GET /stacks — list user's saved stacks
route.get("/", async (c) => {
	const user = c.get("user" as never) as { id: string };
	const stacks = await db
		.select()
		.from(savedStack)
		.where(eq(savedStack.userId, user.id))
		.orderBy(savedStack.createdAt);
	return c.json({ stacks });
});

// POST /stacks — save a new stack
route.post("/", async (c) => {
	const user = c.get("user" as never) as { id: string };
	const body = await c.req.json();
	const parsed = CreateStackSchema.safeParse(body);

	if (!parsed.success) {
		return c.json(
			{
				error: {
					code: "VALIDATION_ERROR",
					message: "Invalid stack input",
					details: parsed.error.issues.map((i) => ({
						field: i.path.join("."),
						message: i.message,
					})),
				},
			},
			400,
		);
	}

	const { name, description, services, config } = parsed.data;

	const [stack] = await db
		.insert(savedStack)
		.values({
			userId: user.id,
			name,
			description: description ?? null,
			services,
			config,
		})
		.returning();

	return c.json({ stack }, 201);
});

// GET /stacks/:id — get a specific stack
route.get("/:id", async (c) => {
	const user = c.get("user" as never) as { id: string };
	const id = c.req.param("id");

	const [stack] = await db
		.select()
		.from(savedStack)
		.where(and(eq(savedStack.id, id), eq(savedStack.userId, user.id)));

	if (!stack) {
		return c.json({ error: { code: "NOT_FOUND", message: "Stack not found" } }, 404);
	}
	return c.json({ stack });
});

// PATCH /stacks/:id — update a stack name/description
route.patch("/:id", async (c) => {
	const user = c.get("user" as never) as { id: string };
	const id = c.req.param("id");
	const body = await c.req.json();
	const parsed = UpdateStackSchema.safeParse(body);

	if (!parsed.success) {
		return c.json(
			{
				error: {
					code: "VALIDATION_ERROR",
					message: "Invalid stack input",
					details: parsed.error.issues.map((i) => ({
						field: i.path.join("."),
						message: i.message,
					})),
				},
			},
			400,
		);
	}

	const { name, description, services, config } = parsed.data;

	const [stack] = await db
		.update(savedStack)
		.set({
			...(name ? { name } : {}),
			...(description !== undefined ? { description } : {}),
			...(services ? { services } : {}),
			...(config ? { config } : {}),
			updatedAt: new Date(),
		})
		.where(and(eq(savedStack.id, id), eq(savedStack.userId, user.id)))
		.returning();

	if (!stack) {
		return c.json({ error: { code: "NOT_FOUND", message: "Stack not found" } }, 404);
	}
	return c.json({ stack });
});

// DELETE /stacks/:id — delete a stack
route.delete("/:id", async (c) => {
	const user = c.get("user" as never) as { id: string };
	const id = c.req.param("id");

	const [deleted] = await db
		.delete(savedStack)
		.where(and(eq(savedStack.id, id), eq(savedStack.userId, user.id)))
		.returning({ id: savedStack.id });

	if (!deleted) {
		return c.json({ error: { code: "NOT_FOUND", message: "Stack not found" } }, 404);
	}
	return c.json({ success: true });
});

export { route as stacksRoute };
