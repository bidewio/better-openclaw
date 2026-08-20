import path from "node:path";
import { defineConfig } from "vitest/config";

const coreSrc = path.resolve(__dirname, "../core/src");

export default defineConfig({
	resolve: {
		// Array form, and order matters: the bare specifier must match before the
		// subpath rule, otherwise "@better-openclaw/core/generate" resolves to
		// ".../core/src/index.ts/generate" and fails with ENOTDIR.
		alias: [
			{
				find: /^@better-openclaw\/core$/,
				replacement: path.join(coreSrc, "index.ts"),
			},
			{
				find: /^@better-openclaw\/core\/(.*)$/,
				replacement: path.join(coreSrc, "$1.ts"),
			},
		],
	},
	test: {
		environment: "node",
		globals: true,
		include: ["src/**/*.test.ts"],
	},
});
