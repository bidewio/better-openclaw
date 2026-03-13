/**
 * Claude Code Local Session Scanner
 *
 * Discovers and tracks local Claude Code sessions by scanning ~/.claude/projects/.
 * Each project directory contains JSONL session transcripts that record every
 * user message, assistant response, and tool call with timestamps and token usage.
 *
 * This module parses those JSONL files to extract:
 * - Session metadata (model, project, git branch, timestamps)
 * - Message counts (user, assistant, tool uses)
 * - Token usage (input, output, estimated cost)
 * - Activity status (active if last message < 5 minutes ago)
 *
 * NOTE: This uses Node.js `fs` — it runs in Vite dev middleware, NOT in the browser.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Rough per-token pricing (USD) for cost estimation
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
	"claude-opus-4-6": { input: 15 / 1_000_000, output: 75 / 1_000_000 },
	"claude-sonnet-4-6": { input: 3 / 1_000_000, output: 15 / 1_000_000 },
	"claude-sonnet-4-5-20250929": { input: 3 / 1_000_000, output: 15 / 1_000_000 },
	"claude-haiku-4-5": { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
	"claude-haiku-4-5-20251001": { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
};

const DEFAULT_PRICING = { input: 3 / 1_000_000, output: 15 / 1_000_000 };

// Session is "active" if last message was within this window
const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;

export interface SessionStats {
	sessionId: string;
	projectSlug: string;
	projectPath: string | null;
	model: string | null;
	gitBranch: string | null;
	userMessages: number;
	assistantMessages: number;
	toolUses: number;
	inputTokens: number;
	outputTokens: number;
	estimatedCost: number;
	firstMessageAt: string | null;
	lastMessageAt: string | null;
	lastUserPrompt: string | null;
	isActive: boolean;
}

interface JSONLEntry {
	type?: string;
	sessionId?: string;
	timestamp?: string;
	isSidechain?: boolean;
	gitBranch?: string;
	cwd?: string;
	message?: {
		role?: string;
		content?: string | Array<{ type: string; text?: string; id?: string }>;
		model?: string;
		usage?: {
			input_tokens?: number;
			output_tokens?: number;
			cache_read_input_tokens?: number;
			cache_creation_input_tokens?: number;
		};
	};
}

/** Parse a single JSONL file and extract session stats */
function parseSessionFile(filePath: string, projectSlug: string): SessionStats | null {
	try {
		const content = readFileSync(filePath, "utf-8");
		const lines = content.split("\n").filter(Boolean);

		if (lines.length === 0) return null;

		let sessionId: string | null = null;
		let model: string | null = null;
		let gitBranch: string | null = null;
		let projectPath: string | null = null;
		let userMessages = 0;
		let assistantMessages = 0;
		let toolUses = 0;
		let inputTokens = 0;
		let outputTokens = 0;
		let cacheReadTokens = 0;
		let cacheCreationTokens = 0;
		let firstMessageAt: string | null = null;
		let lastMessageAt: string | null = null;
		let lastUserPrompt: string | null = null;

		for (const line of lines) {
			let entry: JSONLEntry;
			try {
				entry = JSON.parse(line);
			} catch {
				continue;
			}

			// Extract session ID from first entry that has one
			if (!sessionId && entry.sessionId) {
				sessionId = entry.sessionId;
			}

			// Extract git branch
			if (!gitBranch && entry.gitBranch) {
				gitBranch = entry.gitBranch;
			}

			// Extract project working directory
			if (!projectPath && entry.cwd) {
				projectPath = entry.cwd;
			}

			// Track timestamps
			if (entry.timestamp) {
				if (!firstMessageAt) firstMessageAt = entry.timestamp;
				lastMessageAt = entry.timestamp;
			}

			// Skip sidechain messages (subagent work) for counts
			if (entry.isSidechain) continue;

			if (entry.type === "user" && entry.message) {
				userMessages++;
				// Extract last user prompt text
				const msg = entry.message;
				if (typeof msg.content === "string" && msg.content.length > 0) {
					lastUserPrompt = msg.content.slice(0, 500);
				}
			}

			if (entry.type === "assistant" && entry.message) {
				assistantMessages++;

				// Extract model
				if (entry.message.model) {
					model = entry.message.model;
				}

				// Extract token usage
				const usage = entry.message.usage;
				if (usage) {
					inputTokens += usage.input_tokens || 0;
					cacheReadTokens += usage.cache_read_input_tokens || 0;
					cacheCreationTokens += usage.cache_creation_input_tokens || 0;
					outputTokens += usage.output_tokens || 0;
				}

				// Count tool uses in assistant content
				if (Array.isArray(entry.message.content)) {
					for (const block of entry.message.content) {
						if (block.type === "tool_use") toolUses++;
					}
				}
			}
		}

		if (!sessionId) return null;

		// Estimate cost (cache reads = 10% of input, cache creation = 125% of input)
		const pricing = (model && MODEL_PRICING[model]) || DEFAULT_PRICING;
		const estimatedCost =
			inputTokens * pricing.input +
			cacheReadTokens * pricing.input * 0.1 +
			cacheCreationTokens * pricing.input * 1.25 +
			outputTokens * pricing.output;

		// Determine if active
		const isActive = lastMessageAt
			? Date.now() - new Date(lastMessageAt).getTime() < ACTIVE_THRESHOLD_MS
			: false;

		// Store total input tokens (including cache) for display
		const totalInputTokens = inputTokens + cacheReadTokens + cacheCreationTokens;

		return {
			sessionId,
			projectSlug,
			projectPath,
			model,
			gitBranch,
			userMessages,
			assistantMessages,
			toolUses,
			inputTokens: totalInputTokens,
			outputTokens,
			estimatedCost: Math.round(estimatedCost * 10000) / 10000,
			firstMessageAt,
			lastMessageAt,
			lastUserPrompt,
			isActive,
		};
	} catch (err) {
		console.warn(`[claude-sessions] Failed to parse ${filePath}:`, err);
		return null;
	}
}

/**
 * Scan all Claude Code projects and discover sessions.
 * @param claudeHome - Path to ~/.claude directory. Defaults to `~/.claude`.
 */
export function scanClaudeSessions(claudeHome?: string): SessionStats[] {
	const resolvedHome = claudeHome || join(homedir(), ".claude");

	const projectsDir = join(resolvedHome, "projects");
	let projectDirs: string[];
	try {
		projectDirs = readdirSync(projectsDir);
	} catch {
		return []; // No projects directory — Claude Code not installed or never used
	}

	const sessions: SessionStats[] = [];

	for (const projectSlug of projectDirs) {
		const projectDir = join(projectsDir, projectSlug);

		let stat;
		try {
			stat = statSync(projectDir);
		} catch {
			continue;
		}
		if (!stat.isDirectory()) continue;

		// Find JSONL files in this project
		let files: string[];
		try {
			files = readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));
		} catch {
			continue;
		}

		for (const file of files) {
			const filePath = join(projectDir, file);
			const parsed = parseSessionFile(filePath, projectSlug);
			if (parsed) sessions.push(parsed);
		}
	}

	return sessions;
}
