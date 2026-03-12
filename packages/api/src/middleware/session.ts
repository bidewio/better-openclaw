import type { MiddlewareHandler } from "hono";
import { auth } from "../lib/auth.js";

type Variables = {
	user: { id: string; name: string; email: string; image: string | null };
	session: { id: string; token: string; userId: string; expiresAt: Date };
};

/**
 * Middleware that requires a valid session. Returns 401 if not authenticated.
 * Attaches `user` and `session` to the Hono context.
 */
export function requireSession(): MiddlewareHandler<{ Variables: Variables }> {
	// biome-ignore lint/suspicious/noExplicitAny: Hono middleware must be untyped
	return async (c: any, next: any) => {
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		if (!session) {
			return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
		}
		c.set("user", session.user);
		c.set("session", session.session);
		await next();
	};
}
