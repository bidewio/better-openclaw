import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { z } from "zod";

const SENSITIVE_KEY_PATTERNS = [
	/password/i,
	/secret/i,
	/token/i,
	/key/i,
	/credential/i,
	/authorization/i,
];

function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
}

function redactEnvValue(key: string, value: string): string {
	if (isSensitiveKey(key) && value.length > 0) {
		return "***REDACTED***";
	}
	return value;
}

function parseEnvFile(content: string): Record<string, string> {
	const entries: Record<string, string> = {};
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		let value = trimmed.slice(eqIdx + 1).trim();
		// Strip surrounding quotes
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		entries[key] = value;
	}
	return entries;
}

const EnvUpdateSchema = z.object({
	entries: z.record(z.string(), z.string()),
});

export function configRoutes(projectDir: string): Hono {
	const app = new Hono();

	/** GET /config/env — Current .env with secrets redacted. */
	app.get("/config/env", (c) => {
		const envPath = join(projectDir, ".env");

		if (!existsSync(envPath)) {
			return c.json({ error: { code: "NOT_FOUND", message: ".env file not found" } }, 404);
		}

		const raw = readFileSync(envPath, "utf-8");
		const entries = parseEnvFile(raw);

		const redacted: Record<string, string> = {};
		for (const [key, value] of Object.entries(entries)) {
			redacted[key] = redactEnvValue(key, value);
		}

		return c.json({ entries: redacted });
	});

	/** GET /config/compose — Current docker-compose.yml. */
	app.get("/config/compose", (c) => {
		const composePath = join(projectDir, "docker-compose.yml");

		if (!existsSync(composePath)) {
			return c.json(
				{ error: { code: "NOT_FOUND", message: "docker-compose.yml not found" } },
				404,
			);
		}

		const content = readFileSync(composePath, "utf-8");
		return c.text(content);
	});

	/** PUT /config/env — Update .env entries and return updated file. */
	app.put("/config/env", async (c) => {
		const body = EnvUpdateSchema.safeParse(await c.req.json());
		if (!body.success) {
			return c.json({ error: { code: "VALIDATION", message: body.error.message } }, 400);
		}

		const envPath = join(projectDir, ".env");
		const existing = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";
		const entries = parseEnvFile(existing);

		// Merge new entries
		for (const [key, value] of Object.entries(body.data.entries)) {
			entries[key] = value;
		}

		// Rebuild .env file preserving comments
		const lines = existing.split("\n");
		const updatedKeys = new Set(Object.keys(body.data.entries));
		const written = new Set<string>();
		const output: string[] = [];

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) {
				output.push(line);
				continue;
			}
			const eqIdx = trimmed.indexOf("=");
			if (eqIdx === -1) {
				output.push(line);
				continue;
			}
			const key = trimmed.slice(0, eqIdx).trim();
			if (updatedKeys.has(key)) {
				output.push(`${key}=${entries[key]}`);
				written.add(key);
			} else {
				output.push(line);
			}
		}

		// Append new keys that weren't in the original file
		for (const [key, value] of Object.entries(body.data.entries)) {
			if (!written.has(key)) {
				output.push(`${key}=${value}`);
			}
		}

		writeFileSync(envPath, output.join("\n"), "utf-8");

		return c.json({
			ok: true,
			updatedKeys: Object.keys(body.data.entries),
			message:
				"Environment updated. Run POST /commands/recreate to apply changes to running containers.",
		});
	});

	return app;
}
