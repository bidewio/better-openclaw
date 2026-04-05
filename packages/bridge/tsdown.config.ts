import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "src/**/*.ts",
	format: ["esm"],
	sourcemap: true,
	clean: true,
	dts: true,
});
