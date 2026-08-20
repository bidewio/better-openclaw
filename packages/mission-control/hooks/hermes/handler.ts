// Mission Control Hook Handler for Hermes Agent
// Bridges Hermes Agent lifecycle events to the Mission Control webhook endpoint.
//
// This handler is designed to be run as a sidecar process or integrated into
// Hermes via its MCP tool system. It polls the Hermes API server's response
// store and emits lifecycle events to Mission Control.
//
// Usage as standalone bridge:
//   HERMES_API_URL=http://localhost:8642 \
//   MISSION_CONTROL_URL=https://your-project.convex.site/hermes/event \
//   npx tsx packages/mission-control/hooks/hermes/handler.ts

const CODE_EXTENSIONS = [
	".ts", ".js", ".tsx", ".jsx", ".py", ".rs", ".go",
	".java", ".c", ".cpp", ".yml", ".yaml", ".json",
	".html", ".css",
];
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];

function detectDocType(path: string | null): string {
	if (!path) return "document";
	const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
	if (CODE_EXTENSIONS.includes(ext)) return "code";
	if (IMAGE_EXTENSIONS.includes(ext)) return "image";
	return "document";
}

function summarizePrompt(prompt: string): string | null {
	if (!prompt) return null;
	const cleaned = prompt.trim();
	const firstLine = cleaned.split("\n")[0]?.trim() || cleaned;
	return firstLine.length <= 120 ? firstLine : firstLine.slice(0, 117) + "...";
}

interface HermesEventPayload {
	runId: string;
	action: "start" | "progress" | "end" | "error" | "document";
	sessionKey?: string | null;
	agentId?: string | null;
	timestamp?: string;
	prompt?: string | null;
	source?: string;
	message?: string | null;
	response?: string | null;
	error?: string | null;
	eventType?: string | null;
	model?: string | null;
	platform?: string | null;
	toolName?: string | null;
	durationMs?: number | null;
	inputTokens?: number | null;
	outputTokens?: number | null;
	document?: {
		title: string;
		content: string;
		type: string;
		path?: string;
	};
}

async function postEvent(webhookUrl: string, payload: HermesEventPayload): Promise<void> {
	try {
		const res = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			console.error(`[hermes-hook] POST failed: ${res.status} ${res.statusText}`);
		}
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`[hermes-hook] POST error:`, message);
	}
}

/**
 * Create a Hermes → Mission Control event bridge.
 *
 * This function returns helpers that can be called from:
 * - A Hermes MCP tool that wraps agent lifecycle events
 * - A standalone polling bridge that watches the Hermes API
 * - A Hermes skill that emits events at key points
 */
export function createHermesBridge(config: {
	webhookUrl?: string;
	hermesApiUrl?: string;
}) {
	const webhookUrl =
		config.webhookUrl ||
		process.env.MISSION_CONTROL_URL ||
		"http://127.0.0.1:3211/hermes/event";

	const hermesApiUrl =
		config.hermesApiUrl ||
		process.env.HERMES_API_URL ||
		"http://127.0.0.1:8642";

	// Track active sessions
	const sessions = new Map<string, {
		prompt: string | null;
		model: string | null;
		platform: string | null;
		startTime: number;
	}>();

	return {
		/**
		 * Call when a new conversation turn starts.
		 */
		async onStart(runId: string, opts: {
			prompt?: string;
			model?: string;
			platform?: string;
			sessionKey?: string;
		} = {}): Promise<void> {
			sessions.set(runId, {
				prompt: opts.prompt ?? null,
				model: opts.model ?? null,
				platform: opts.platform ?? null,
				startTime: Date.now(),
			});

			await postEvent(webhookUrl, {
				runId,
				action: "start",
				sessionKey: opts.sessionKey ?? null,
				agentId: "Hermes Agent",
				prompt: opts.prompt ?? null,
				source: "hermes",
				model: opts.model ?? null,
				platform: opts.platform ?? null,
				timestamp: new Date().toISOString(),
			});
		},

		/**
		 * Call when a tool is invoked.
		 */
		async onToolCall(runId: string, opts: {
			toolName: string;
			durationMs?: number;
			inputTokens?: number;
			outputTokens?: number;
		}): Promise<void> {
			const session = sessions.get(runId);

			await postEvent(webhookUrl, {
				runId,
				action: "progress",
				agentId: "Hermes Agent",
				message: `Using tool: ${opts.toolName}`,
				eventType: "tool_call",
				toolName: opts.toolName,
				durationMs: opts.durationMs ?? null,
				inputTokens: opts.inputTokens ?? null,
				outputTokens: opts.outputTokens ?? null,
				model: session?.model ?? null,
				platform: session?.platform ?? null,
				timestamp: new Date().toISOString(),
			});
		},

		/**
		 * Call when a file is written or document is created.
		 */
		async onDocument(runId: string, opts: {
			path: string;
			content?: string;
		}): Promise<void> {
			const title = opts.path.split("/").pop() || opts.path;
			const docType = detectDocType(opts.path);

			await postEvent(webhookUrl, {
				runId,
				action: "document",
				agentId: "Hermes Agent",
				document: {
					title,
					content: opts.content || "",
					type: docType,
					path: opts.path,
				},
				timestamp: new Date().toISOString(),
			});
		},

		/**
		 * Call when a conversation turn completes successfully.
		 */
		async onEnd(runId: string, opts: {
			response?: string;
		} = {}): Promise<void> {
			const session = sessions.get(runId);

			await postEvent(webhookUrl, {
				runId,
				action: "end",
				agentId: "Hermes Agent",
				response: opts.response ?? null,
				model: session?.model ?? null,
				platform: session?.platform ?? null,
				durationMs: session ? Date.now() - session.startTime : null,
				timestamp: new Date().toISOString(),
			});

			sessions.delete(runId);
		},

		/**
		 * Call when an error occurs.
		 */
		async onError(runId: string, error: string): Promise<void> {
			const session = sessions.get(runId);

			await postEvent(webhookUrl, {
				runId,
				action: "error",
				agentId: "Hermes Agent",
				error,
				model: session?.model ?? null,
				platform: session?.platform ?? null,
				durationMs: session ? Date.now() - session.startTime : null,
				timestamp: new Date().toISOString(),
			});

			sessions.delete(runId);
		},

		/** Get the configured webhook URL. */
		getWebhookUrl(): string {
			return webhookUrl;
		},

		/** Get the configured Hermes API URL. */
		getHermesApiUrl(): string {
			return hermesApiUrl;
		},
	};
}

// ── Standalone entry point ──────────────────────────────────────────────────
// When run directly, creates the bridge and logs the configuration.

if (typeof require !== "undefined" && require.main === module) {
	const bridge = createHermesBridge({});
	console.log(`[hermes-hook] Mission Control bridge ready`);
	console.log(`[hermes-hook] Webhook URL: ${bridge.getWebhookUrl()}`);
	console.log(`[hermes-hook] Hermes API:  ${bridge.getHermesApiUrl()}`);
	console.log(`[hermes-hook] Waiting for events...`);
}
