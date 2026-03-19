/**
 * Resolve the API base URL.
 *
 * Priority:
 * 1. NEXT_PUBLIC_API_URL env var (set at build time — works everywhere)
 * 2. Runtime browser origin + /api/v1 (works on PaaS behind reverse proxy)
 * 3. Localhost fallback (dev / SSR)
 *
 * NOTE: must use `NEXT_PUBLIC_` prefix — Next.js only exposes env vars
 * prefixed with NEXT_PUBLIC_ to the client bundle.
 */
function getApiBase(): string {
	if (process.env.NEXT_PUBLIC_API_URL) {
		return process.env.NEXT_PUBLIC_API_URL;
	}
	// In the browser: derive from current origin (PaaS reverse proxy)
	if (typeof window !== "undefined") {
		return `${window.location.origin}/api/v1`;
	}
	// SSR / dev fallback
	return "http://localhost:3456/api/v1";
}

const API_BASE = getApiBase();

export interface ServiceResponse {
	id: string;
	name: string;
	description: string;
	category: string;
	icon: string;
	maturity: string;
	minMemoryMB?: number;
	tags: string[];
	requires: string[];
	recommends: string[];
	conflictsWith: string[];
	gpuRequired: boolean;
}

export interface SkillPackResponse {
	id: string;
	name: string;
	description: string;
	requiredServices: string[];
	skills: string[];
	icon?: string;
	tags: string[];
}

export interface PresetResponse {
	id: string;
	name: string;
	description: string;
	services: string[];
	skillPacks: string[];
	estimatedMemoryMB?: number;
}

export interface ValidateResponse {
	valid: boolean;
	resolvedServices: string[];
	addedDependencies: { service: string; reason: string }[];
	warnings: { type: string; message: string }[];
	conflicts: { type: string; message: string }[];
	estimatedMemoryMB: number;
}

const API_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

		try {
			const res = await fetch(`${API_BASE}${path}`, {
				headers: {
					"Content-Type": "application/json",
				},
				...options,
				signal: controller.signal,
			});

			if (!res.ok) {
				const body = await res.json().catch(() => null);
				throw new Error(body?.error?.message ?? `API error: ${res.status} ${res.statusText}`);
			}

			return res.json() as Promise<T>;
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			// Only retry on network errors (not HTTP errors or aborts)
			const isNetworkError = lastError.name === "TypeError" || lastError.name === "AbortError";
			if (!isNetworkError || attempt >= MAX_RETRIES) throw lastError;
		} finally {
			clearTimeout(timeout);
		}
	}

	throw lastError ?? new Error("API request failed");
}

export async function fetchServices(): Promise<ServiceResponse[]> {
	return apiFetch<ServiceResponse[]>("/services");
}

export async function fetchSkillPacks(services?: string[]): Promise<SkillPackResponse[]> {
	const params = services?.length ? `?services=${encodeURIComponent(services.join(","))}` : "";
	return apiFetch<SkillPackResponse[]>(`/skills${params}`);
}

export async function fetchPresets(): Promise<PresetResponse[]> {
	return apiFetch<PresetResponse[]>("/presets");
}

export async function validateStack(config: {
	services: string[];
	skillPacks?: string[];
	proxy?: string;
	gpu?: boolean;
	platform?: string;
}): Promise<ValidateResponse> {
	return apiFetch<ValidateResponse>("/validate", {
		method: "POST",
		body: JSON.stringify(config),
	});
}

export interface GenerateResponse {
	files: Record<string, string>;
	metadata: {
		serviceCount: number;
		skillCount: number;
		estimatedMemoryMB: number;
		generatedAt: string;
	};
}

/** Complete stack payload for clawexa.net: input + files + metadata. */
export interface GenerateCompleteResponse {
	formatVersion: string;
	input: Record<string, unknown>;
	files: Record<string, string>;
	metadata: GenerateResponse["metadata"];
}

export async function generateStack(config: {
	projectName: string;
	services: string[];
	skillPacks?: string[];
	aiProviders?: string[];
	gsdRuntimes?: string[];
	primaryFramework?: string;
	companionFrameworks?: string[];
	proxy?: string;
	domain?: string;
	gpu?: boolean;
	platform?: string;
	deployment?: string;
	deploymentType?: "docker" | "bare-metal";
	monitoring?: boolean;
}): Promise<GenerateResponse> {
	return apiFetch<GenerateResponse>("/generate", {
		method: "POST",
		body: JSON.stringify(config),
	});
}

/** Same as generateStack but returns full payload (input + files + metadata) for export / clawexa.net. */
export async function generateStackComplete(
	config: Parameters<typeof generateStack>[0],
): Promise<GenerateCompleteResponse> {
	return apiFetch<GenerateCompleteResponse>("/generate?format=complete", {
		method: "POST",
		body: JSON.stringify(config),
	});
}

// ── Deploy to PaaS ──────────────────────────────────────────────────────────
// These functions relay deploy requests through the API server to the user's
// self-hosted Dokploy/Coolify instance, avoiding browser CORS restrictions.

/** A single step in the deploy progress (mirrors core DeployStep). */
export interface DeployStep {
	step: string;
	status: "pending" | "running" | "done" | "error";
	detail?: string;
}

/** Final result of a PaaS deployment (mirrors core DeployResult). */
export interface DeployResult {
	success: boolean;
	dashboardUrl?: string;
	projectId?: string;
	composeId?: string;
	steps: DeployStep[];
	error?: string;
}

export interface DeployProvider {
	id: string;
	name: string;
}

/** List available PaaS deployment providers. */
export async function fetchDeployProviders(): Promise<DeployProvider[]> {
	const res = await apiFetch<{ providers: DeployProvider[] }>("/deploy/providers");
	return res.providers;
}

/** Test connection to a PaaS instance. */
export async function testDeployConnection(config: {
	provider: string;
	instanceUrl: string;
	apiKey: string;
}): Promise<{ ok: boolean; provider: string; error?: string }> {
	return apiFetch("/deploy/test", {
		method: "POST",
		body: JSON.stringify(config),
	});
}

/** Server available on a PaaS platform. */
export interface PaasServer {
	id: string;
	name: string;
	ip?: string;
}

/** List available servers on a PaaS instance (after connection test succeeds). */
export async function fetchDeployServers(config: {
	provider: string;
	instanceUrl: string;
	apiKey: string;
}): Promise<PaasServer[]> {
	const res = await apiFetch<{ servers: PaasServer[] }>("/deploy/servers", {
		method: "POST",
		body: JSON.stringify(config),
	});
	return res.servers;
}

/** Deploy a generated stack to a PaaS provider. */
export async function deployStack(config: {
	provider: string;
	instanceUrl: string;
	apiKey: string;
	projectName: string;
	composeYaml: string;
	envContent: string;
	description?: string;
	serverId?: string;
}): Promise<DeployResult> {
	return apiFetch<DeployResult>("/deploy", {
		method: "POST",
		body: JSON.stringify(config),
	});
}

/** Generate stack and return as ZIP blob. */
export async function generateStackAsZip(
	config: Parameters<typeof generateStack>[0],
): Promise<Blob> {
	const res = await fetch(`${API_BASE}/generate`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/zip" },
		body: JSON.stringify(config),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(body?.error?.message ?? `API error: ${res.status} ${res.statusText}`);
	}
	return res.blob();
}

// ── Saved Stacks ─────────────────────────────────────────────────────────────

export interface SavedStackResponse {
	id: string;
	userId: string;
	name: string;
	description: string | null;
	services: unknown;
	config: unknown;
	createdAt: string;
	updatedAt: string;
}

export async function saveStack(input: {
	name: string;
	description?: string;
	services: string[];
	config: Record<string, unknown>;
}): Promise<SavedStackResponse> {
	const res = await apiFetch<{ stack: SavedStackResponse }>("/stacks", {
		method: "POST",
		credentials: "include",
		body: JSON.stringify(input),
	});
	return res.stack;
}

export async function fetchSavedStacks(): Promise<SavedStackResponse[]> {
	const res = await apiFetch<{ stacks: SavedStackResponse[] }>("/stacks", {
		credentials: "include",
	});
	return res.stacks;
}

export async function deleteSavedStack(id: string): Promise<void> {
	await apiFetch(`/stacks/${id}`, {
		method: "DELETE",
		credentials: "include",
	});
}

export async function fetchSavedStack(id: string): Promise<SavedStackResponse> {
	const res = await apiFetch<{ stack: SavedStackResponse }>(`/stacks/${id}`, {
		credentials: "include",
	});
	return res.stack;
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export interface FavoriteResponse {
	id: string;
	userId: string;
	stackId: string;
	createdAt: string;
}

export async function fetchFavorites(): Promise<FavoriteResponse[]> {
	const res = await apiFetch<{
		favorites: {
			favoriteId: string;
			createdAt: string;
			stack: SavedStackResponse;
		}[];
	}>("/favorites", {
		credentials: "include",
	});
	return res.favorites.map((f) => ({
		id: f.favoriteId,
		userId: f.stack.userId,
		stackId: f.stack.id,
		createdAt: f.createdAt,
	}));
}

export async function toggleFavorite(stackId: string, action: "add" | "remove"): Promise<void> {
	if (action === "add") {
		await apiFetch("/favorites", {
			method: "POST",
			credentials: "include",
			body: JSON.stringify({ stackId }),
		});
	} else {
		await apiFetch(`/favorites/${stackId}`, {
			method: "DELETE",
			credentials: "include",
		});
	}
}
