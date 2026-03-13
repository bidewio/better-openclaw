import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { auth } from "./lib/auth.js";
import { optionalApiKey } from "./middleware/api-key.js";
import { generateRateLimiter, rateLimiter } from "./middleware/rate-limit.js";
import { requestId } from "./middleware/request-id.js";
import { analyticsRoute } from "./routes/analytics.js";
import { authRoute } from "./routes/auth.js";
import { deployRoute } from "./routes/deploy.js";
import { favoritesRoute } from "./routes/favorites.js";
import { generateRoute } from "./routes/generate.js";
import { healthRoute } from "./routes/health.js";
import { presetsRoute } from "./routes/presets.js";
import { servicesRoute } from "./routes/services.js";
import { skillsRoute } from "./routes/skills.js";
import { stacksRoute } from "./routes/stacks.js";
import { validateRoute } from "./routes/validate.js";

const app = new OpenAPIHono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>().basePath("/api");

const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") || [
	"http://localhost:3456",
	"http://localhost:3654",
	"https://clawexa.net",
	"https://www.clawexa.net",
];

// Middleware
app.use("/*", requestId());
// Security: Enable secure headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(
	"/*",
	secureHeaders({
		xFrameOptions: "DENY",
		xContentTypeOptions: "nosniff",
		referrerPolicy: "strict-origin-when-cross-origin",
		strictTransportSecurity: "max-age=31536000; includeSubDomains",
		xXssProtection: "1; mode=block",
	}),
);

app.use(
	"/*",
	cors({
		origin: trustedOrigins,
		allowHeaders: [
			"Set-Cookie",
			"Cookie",
			"Content-Type",
			"Authorization",
			"x-api-key",
			"x-request-id",
			"x-visitor-id",
			"x-idempotency-key",
			"baggage",
			"sentry-trace",
			"sentry-release",
			"X-RateLimit-Limit",
			"X-RateLimit-Remaining",
			"X-RateLimit-Reset",
			"Idempotency-Key",
		],
		allowMethods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
		exposeHeaders: [
			"Set-Cookie",
			"Cookie",
			"Content-Length",
			"X-RateLimit-Limit",
			"X-RateLimit-Remaining",
			"X-RateLimit-Reset",
			"Retry-After",
			"Idempotency-Key",
			"X-Idempotent-Replayed",
		],
		maxAge: 600,
		credentials: true,
	}),
);
// Security: Limit request body size (2 MB default, 5 MB for generate)
app.use("/*", bodyLimit({ maxSize: 2 * 1024 * 1024 }));
app.use("/v1/generate", bodyLimit({ maxSize: 5 * 1024 * 1024 }));

app.use("/*", optionalApiKey());
app.use("/*", rateLimiter());
app.use("/v1/generate", generateRateLimiter());

app.use("/*", async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) {
		c.set("user", null);
		c.set("session", null);
		await next();
		return;
	}
	c.set("user", session.user);
	c.set("session", session.session);
	await next();
});

// Error handler — log full error server-side, return generic message to client
app.onError((err, c) => {
	console.error(`[${c.get("requestId" as never) ?? "?"}]`, err);
	return c.json(
		{
			error: {
				code: "INTERNAL_ERROR",
				message: "Internal server error",
			},
		},
		500,
	);
});

// Routes
app.route("/auth", authRoute);
app.route("/v1/health", healthRoute);
app.route("/v1/services", servicesRoute);
app.route("/v1/skills", skillsRoute);
app.route("/v1/presets", presetsRoute);
app.route("/v1/validate", validateRoute);
app.route("/v1/generate", generateRoute);
app.route("/v1/deploy", deployRoute);
app.route("/v1/stacks", stacksRoute);
app.route("/v1/favorites", favoritesRoute);
app.route("/v1/analytics", analyticsRoute);

// Auto-generated OpenAPI spec
app.doc("/v1/openapi.json", {
	openapi: "3.1.0",
	info: {
		title: "better-openclaw API",
		description:
			"REST API for generating production-ready OpenClaw Docker Compose stacks. Cloud-hosted version available at https://clawexa.net",
		version: "1.0.0",
		contact: { name: "bachir@bidew.io" },
	},
	servers: [{ url: "", description: "API v1" }],
});

// Swagger UI
app.get("/v1/docs", (c) => {
	return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>OpenClaw API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: "./openapi.json", dom_id: "#swagger-ui" });</script>
</body>
</html>`);
});

export { app };
