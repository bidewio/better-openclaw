import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Support: (1) monorepo build from root with turbo, (2) build from packages/web, (3) deploy-only web (e.g. Railpack) with @better-openclaw/core from npm
const cwd = process.cwd();
const coreDistFromRoot = path.join(cwd, "packages", "core", "dist");
const coreDistFromWeb = path.resolve(cwd, "..", "core", "dist");
const coreSrcFromRoot = path.join(cwd, "packages", "core", "src");
const coreSrcFromWeb = path.resolve(cwd, "..", "core", "src");
const coreWorkspacePath = fs.existsSync(coreSrcFromRoot)
	? coreSrcFromRoot
	: fs.existsSync(coreSrcFromWeb)
		? coreSrcFromWeb
		: fs.existsSync(coreDistFromRoot)
			? coreDistFromRoot
			: fs.existsSync(coreDistFromWeb)
				? coreDistFromWeb
				: null;

const nextConfig: NextConfig = {
	transpilePackages: ["@better-openclaw/core"],
	async headers() {
		return [
			// Security headers for all routes
			{
				source: "/(.*)",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{ key: "X-XSS-Protection", value: "1; mode=block" },
					{
						key: "Strict-Transport-Security",
						value: "max-age=31536000; includeSubDomains",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
				],
			},
			// Static asset caching (CORS restricted to GET only)
			{
				source: "/(.*)\\.(png|jpg|jpeg|svg|webp|gif|mp4)$",
				headers: [
					{ key: "Access-Control-Allow-Origin", value: "*" },
					{ key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
				],
			},
		];
	},

	// Allow Next.js 16 to use webpack (our config requires it for node: protocol handling)
	turbopack: {},

	// The core package barrel export re-exports generators that depend on
	// node:crypto and handlebars.  These generators are never called on the
	// client, but webpack still processes the imports.
	//
	// We strip the `node:` protocol prefix so webpack can apply its normal
	// fallback logic, then set `crypto: false` to resolve it to an empty module.
	webpack: (config, { isServer }) => {
		config.resolve = config.resolve ?? {};
		// Resolve workspace package to local core source/dist in monorepo; otherwise use node_modules (e.g. published @better-openclaw/core on Railpack).
		// Source fallback avoids transient module-not-found during parallel turbo builds when dist is being rebuilt.
		config.resolve.alias = {
			...(config.resolve.alias ?? {}),
			...(coreWorkspacePath ? { "@better-openclaw/core": coreWorkspacePath } : {}),
		};
		if (!isServer) {
			config.resolve.fallback = {
				...(config.resolve.fallback ?? {}),
				crypto: false,
			};

			// Custom plugin: rewrite `node:<module>` → `<module>` so fallback works
			config.plugins.push({
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				apply(compiler: any) {
					compiler.hooks.normalModuleFactory.tap("NodeProtocolPlugin", (factory: any) => {
						factory.hooks.beforeResolve.tap("NodeProtocolPlugin", (resolveData: any) => {
							if (resolveData?.request?.startsWith("node:")) {
								resolveData.request = resolveData.request.slice(5);
							}
						});
					});
				},
			});
		}
		return config;
	},
};

export default nextConfig;
