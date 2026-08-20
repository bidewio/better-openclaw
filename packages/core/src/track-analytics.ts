import type { GenerationInput, GenerationMetadata } from "./types.js";

export interface AnalyticsPayload {
	source: "cli" | "web" | "api" | "mcp";
	buildMethod: "preset" | "custom";
	presetId: string | null;
	services: string[];
	skillPacks: string[];
	serviceCount: number;
	proxy: string;
	deployment: string;
	deploymentType: string;
	platform: string;
	gpu: boolean;
	monitoring: boolean;
	hasDomain: boolean;
	openclawImage: string;
	estimatedMemoryMB: number;
}

/**
 * Build an analytics payload from generation input and metadata.
 * Pure function — does not send anything.
 */
export function buildAnalyticsPayload(
	input: GenerationInput,
	metadata: GenerationMetadata,
	source: AnalyticsPayload["source"],
	presetId?: string | null,
): AnalyticsPayload {
	return {
		source,
		buildMethod: presetId ? "preset" : "custom",
		presetId: presetId ?? null,
		services: input.services,
		skillPacks: input.skillPacks,
		serviceCount: metadata.serviceCount,
		proxy: input.proxy,
		deployment: input.deployment,
		deploymentType: input.deploymentType,
		platform: input.platform,
		gpu: input.gpu,
		monitoring: input.monitoring,
		hasDomain: Boolean(input.domain),
		openclawImage: input.openclawImage,
		estimatedMemoryMB: metadata.estimatedMemoryMB,
	};
}

const DEFAULT_API_URL = "https://better-openclaw.dev/api/v1/analytics/event";

/**
 * Resolve the analytics endpoint.
 *
 * Precedence: explicit argument > BOC_ANALYTICS_URL env var > default.
 * The env override exists so the endpoint can be repointed without a release —
 * a hardcoded URL meant four months of events were posted at a host that was
 * never deployed, and there was no way to redirect them.
 */
function resolveApiUrl(explicit?: string): string {
	if (explicit) return explicit;
	const fromEnv = process.env.BOC_ANALYTICS_URL?.trim();
	if (fromEnv) return fromEnv;
	return DEFAULT_API_URL;
}

/** True when the user has opted out of anonymous usage analytics. */
export function analyticsDisabled(): boolean {
	return process.env.DISABLE_ANALYTICS === "true";
}

/**
 * Fire-and-forget POST to the analytics endpoint.
 *
 * Never throws and never blocks the main flow. Failures are silent by default,
 * but set BOC_ANALYTICS_DEBUG=true to print them — silent failure is why a
 * broken endpoint went unnoticed for months.
 *
 * Opt out entirely with DISABLE_ANALYTICS=true.
 */
export async function trackAnalytics(payload: AnalyticsPayload, apiUrl?: string): Promise<void> {
	if (analyticsDisabled()) return;

	const url = resolveApiUrl(apiUrl);
	const debug = process.env.BOC_ANALYTICS_DEBUG === "true";

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
				signal: controller.signal,
			});
			if (debug && !res.ok) {
				console.error(`[analytics] ${url} returned ${res.status}`);
			}
		} finally {
			clearTimeout(timeout);
		}
	} catch (err) {
		// Silent by default — tracking must never block or crash generation.
		if (debug) {
			console.error(
				`[analytics] POST to ${url} failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}
}
