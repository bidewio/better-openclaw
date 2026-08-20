import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StackRow = {
	id: string;
	userId: string;
	name: string;
	description: string | null;
	services: string[];
	config: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
};

type FavoriteRow = {
	id: string;
	userId: string;
	stackId: string;
	createdAt: Date;
};

const state = vi.hoisted(() => ({
	stacks: [] as StackRow[],
	favorites: [] as FavoriteRow[],
	nextStackId: 1,
	nextFavoriteId: 1,
}));

const tables = vi.hoisted(() => ({
	savedStack: {
		__table: "savedStack",
		id: "savedStack.id",
		userId: "savedStack.userId",
		createdAt: "savedStack.createdAt",
	},
	favorite: {
		__table: "favorite",
		id: "favorite.id",
		userId: "favorite.userId",
		stackId: "favorite.stackId",
		createdAt: "favorite.createdAt",
	},
}));

vi.mock("drizzle-orm", () => ({
	eq: (left: unknown, right: unknown) => ({ kind: "eq", left, right }),
	and: (...conditions: unknown[]) => ({ kind: "and", conditions }),
}));

vi.mock("../middleware/session.js", () => ({
	requireSession:
		() =>
		// biome-ignore lint/suspicious/noExplicitAny: test middleware accepts any context shape
		async (c: any, next: any) => {
			const userId = c.req.header("x-test-user-id");
			if (!userId) {
				return c.json(
					{ error: { code: "UNAUTHORIZED", message: "Authentication required." } },
					401,
				);
			}
			c.set("user", {
				id: userId,
				name: "Test User",
				email: `${userId}@example.com`,
				image: null,
			});
			c.set("session", {
				id: `session-${userId}`,
				token: "token",
				userId,
				expiresAt: new Date(Date.now() + 60_000),
			});
			await next();
		},
}));

vi.mock("@better-openclaw/db", () => {
	const getValue = (row: { savedStack?: StackRow; favorite?: FavoriteRow }, column: unknown) => {
		if (column === tables.savedStack.id) return row.savedStack?.id;
		if (column === tables.savedStack.userId) return row.savedStack?.userId;
		if (column === tables.favorite.userId) return row.favorite?.userId;
		if (column === tables.favorite.stackId) return row.favorite?.stackId;
		return undefined;
	};

	const matches = (
		row: { savedStack?: StackRow; favorite?: FavoriteRow },
		condition: unknown,
	): boolean => {
		if (!condition || typeof condition !== "object") return true;
		const cond = condition as {
			kind?: string;
			left?: unknown;
			right?: unknown;
			conditions?: unknown[];
		};
		if (cond.kind === "and") {
			return (cond.conditions ?? []).every((child) => matches(row, child));
		}
		if (cond.kind === "eq") {
			return getValue(row, cond.left) === cond.right;
		}
		return true;
	};

	const executeSelect = (args: {
		shape?: Record<string, unknown>;
		table?: { __table?: string };
		joinTable?: { __table?: string };
		where?: unknown;
	}) => {
		if (args.table?.__table === "savedStack") {
			return state.stacks
				.filter((stack) => matches({ savedStack: stack }, args.where))
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		}

		if (args.table?.__table === "favorite" && args.joinTable?.__table === "savedStack") {
			const joined = state.favorites
				.map((fav) => ({
					favorite: fav,
					savedStack: state.stacks.find((stack) => stack.id === fav.stackId),
				}))
				.filter((row): row is { favorite: FavoriteRow; savedStack: StackRow } =>
					Boolean(row.savedStack),
				)
				.filter((row) => matches(row, args.where))
				.sort((a, b) => a.favorite.createdAt.getTime() - b.favorite.createdAt.getTime());

			return joined.map((row) => ({
				favoriteId: row.favorite.id,
				createdAt: row.favorite.createdAt,
				stack: row.savedStack,
			}));
		}

		if (args.table?.__table === "favorite") {
			return state.favorites
				.filter((fav) => matches({ favorite: fav }, args.where))
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		}

		return [];
	};

	const selectPromise = (args: {
		shape?: Record<string, unknown>;
		table?: { __table?: string };
		joinTable?: { __table?: string };
		where?: unknown;
	}) => Promise.resolve(executeSelect(args));

	const db = {
		select: (shape?: Record<string, unknown>) => {
			const args: {
				shape?: Record<string, unknown>;
				table?: { __table?: string };
				joinTable?: { __table?: string };
				where?: unknown;
			} = { shape };

			const builder = {
				from: (table: { __table?: string }) => {
					args.table = table;
					return builder;
				},
				innerJoin: (table: { __table?: string }) => {
					args.joinTable = table;
					return builder;
				},
				where: (where: unknown) => {
					args.where = where;
					return Object.assign(selectPromise(args), {
						orderBy: () => selectPromise(args),
					});
				},
				orderBy: () => selectPromise(args),
			};

			return builder;
		},
		insert: (table: { __table?: string }) => ({
			values: (values: Record<string, unknown>) => ({
				returning: async () => {
					if (table.__table === "savedStack") {
						const now = new Date();
						const row: StackRow = {
							id: `stack-${state.nextStackId++}`,
							userId: String(values.userId),
							name: String(values.name),
							description: values.description == null ? null : String(values.description),
							services: Array.isArray(values.services) ? (values.services as string[]) : [],
							config:
								values.config && typeof values.config === "object"
									? (values.config as Record<string, unknown>)
									: {},
							createdAt: now,
							updatedAt: now,
						};
						state.stacks.push(row);
						return [row];
					}

					if (table.__table === "favorite") {
						const row: FavoriteRow = {
							id: `favorite-${state.nextFavoriteId++}`,
							userId: String(values.userId),
							stackId: String(values.stackId),
							createdAt: new Date(),
						};
						state.favorites.push(row);
						return [row];
					}

					return [];
				},
			}),
		}),
		update: (table: { __table?: string }) => ({
			set: (patch: Record<string, unknown>) => ({
				where: (where: unknown) => ({
					returning: async () => {
						if (table.__table !== "savedStack") return [];
						const row = state.stacks.find((stack) => matches({ savedStack: stack }, where));
						if (!row) return [];
						if (patch.name !== undefined) row.name = String(patch.name);
						if (patch.description !== undefined) {
							row.description = patch.description == null ? null : String(patch.description);
						}
						if (patch.services !== undefined && Array.isArray(patch.services)) {
							row.services = patch.services as string[];
						}
						if (patch.config !== undefined && patch.config && typeof patch.config === "object") {
							row.config = patch.config as Record<string, unknown>;
						}
						if (patch.updatedAt instanceof Date) {
							row.updatedAt = patch.updatedAt;
						}
						return [row];
					},
				}),
			}),
		}),
		delete: (table: { __table?: string }) => ({
			where: (where: unknown) => {
				if (table.__table === "savedStack") {
					const remaining: StackRow[] = [];
					const deleted: StackRow[] = [];
					for (const row of state.stacks) {
						if (matches({ savedStack: row }, where)) {
							deleted.push(row);
							continue;
						}
						remaining.push(row);
					}
					state.stacks = remaining;
					return {
						returning: async () => deleted.map((row) => ({ id: row.id })),
					};
				}

				if (table.__table === "favorite") {
					state.favorites = state.favorites.filter((row) => !matches({ favorite: row }, where));
					return Promise.resolve(undefined);
				}

				return Promise.resolve(undefined);
			},
		}),
	};

	return {
		db,
		savedStack: tables.savedStack,
		favorite: tables.favorite,
	};
});

import { favoritesRoute } from "./favorites.js";
import { stacksRoute } from "./stacks.js";

describe("stacks + favorites routes", () => {
	const app = new Hono().route("/stacks", stacksRoute).route("/favorites", favoritesRoute);

	beforeEach(() => {
		state.stacks = [];
		state.favorites = [];
		state.nextStackId = 1;
		state.nextFavoriteId = 1;
	});

	it("returns 401 when session is missing", async () => {
		const [stacksRes, favoritesRes] = await Promise.all([
			app.request("/stacks"),
			app.request("/favorites"),
		]);

		expect(stacksRes.status).toBe(401);
		expect(favoritesRes.status).toBe(401);
	});

	it("creates and lists stacks for the authenticated user only", async () => {
		const createRes = await app.request("/stacks", {
			method: "POST",
			headers: {
				"x-test-user-id": "user-1",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: "My Stack",
				description: "personal stack",
				services: ["redis", "qdrant"],
				config: { proxy: "none" },
			}),
		});
		const createBody = await createRes.json();

		expect(createRes.status).toBe(201);
		expect(createBody.stack.name).toBe("My Stack");

		await app.request("/stacks", {
			method: "POST",
			headers: {
				"x-test-user-id": "user-2",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: "Other User Stack",
				services: ["postgres"],
			}),
		});

		const listRes = await app.request("/stacks", {
			headers: { "x-test-user-id": "user-1" },
		});
		const listBody = await listRes.json();

		expect(listRes.status).toBe(200);
		expect(listBody.stacks).toHaveLength(1);
		expect(listBody.stacks[0].name).toBe("My Stack");
	});

	it("validates stack payloads and protects cross-user access", async () => {
		const invalidRes = await app.request("/stacks", {
			method: "POST",
			headers: {
				"x-test-user-id": "user-1",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name: "", services: [] }),
		});
		const invalidBody = await invalidRes.json();
		expect(invalidRes.status).toBe(400);
		expect(invalidBody.error.code).toBe("VALIDATION_ERROR");

		const createRes = await app.request("/stacks", {
			method: "POST",
			headers: {
				"x-test-user-id": "user-1",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name: "Owned", services: ["redis"] }),
		});
		const createBody = await createRes.json();
		const stackId = createBody.stack.id as string;

		const readByOtherUserRes = await app.request(`/stacks/${stackId}`, {
			headers: { "x-test-user-id": "user-2" },
		});
		expect(readByOtherUserRes.status).toBe(404);
	});

	it("updates and deletes stacks", async () => {
		const createRes = await app.request("/stacks", {
			method: "POST",
			headers: {
				"x-test-user-id": "user-1",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name: "To Update", services: ["redis"] }),
		});
		const createBody = await createRes.json();
		const stackId = createBody.stack.id as string;

		const patchRes = await app.request(`/stacks/${stackId}`, {
			method: "PATCH",
			headers: {
				"x-test-user-id": "user-1",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: "Updated Name",
				description: "Updated description",
				services: ["redis", "qdrant"],
			}),
		});
		const patchBody = await patchRes.json();

		expect(patchRes.status).toBe(200);
		expect(patchBody.stack.name).toBe("Updated Name");
		expect(patchBody.stack.services).toEqual(["redis", "qdrant"]);

		const deleteRes = await app.request(`/stacks/${stackId}`, {
			method: "DELETE",
			headers: { "x-test-user-id": "user-1" },
		});
		expect(deleteRes.status).toBe(200);

		const missingDeleteRes = await app.request(`/stacks/${stackId}`, {
			method: "DELETE",
			headers: { "x-test-user-id": "user-1" },
		});
		expect(missingDeleteRes.status).toBe(404);
	});

	it("creates, deduplicates, lists, and deletes favorites", async () => {
		const stackRes = await app.request("/stacks", {
			method: "POST",
			headers: {
				"x-test-user-id": "user-1",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: "Favorite Me",
				services: ["redis"],
			}),
		});
		const stackBody = await stackRes.json();
		const stackId = stackBody.stack.id as string;

		const missingBodyRes = await app.request("/favorites", {
			method: "POST",
			headers: {
				"x-test-user-id": "user-1",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({}),
		});
		expect(missingBodyRes.status).toBe(400);

		const createFavoriteRes = await app.request("/favorites", {
			method: "POST",
			headers: {
				"x-test-user-id": "user-1",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ stackId }),
		});
		expect(createFavoriteRes.status).toBe(201);

		const dedupFavoriteRes = await app.request("/favorites", {
			method: "POST",
			headers: {
				"x-test-user-id": "user-1",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ stackId }),
		});
		expect(dedupFavoriteRes.status).toBe(200);

		const listRes = await app.request("/favorites", {
			headers: { "x-test-user-id": "user-1" },
		});
		const listBody = await listRes.json();

		expect(listRes.status).toBe(200);
		expect(listBody.favorites).toHaveLength(1);
		expect(listBody.favorites[0].stack.id).toBe(stackId);

		const deleteRes = await app.request(`/favorites/${stackId}`, {
			method: "DELETE",
			headers: { "x-test-user-id": "user-1" },
		});
		const deleteBody = await deleteRes.json();
		expect(deleteRes.status).toBe(200);
		expect(deleteBody.success).toBe(true);
	});
});
