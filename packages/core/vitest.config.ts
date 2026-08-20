import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["**/*.test.ts"],
		pool: "forks",
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["packages/*/src/**/*.ts"],
			exclude: ["**/*.test.ts", "**/*.d.ts", "**/index.ts"],
		},
	},
});
