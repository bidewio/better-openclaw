/**
 * Skill format converter between Hermes Agent YAML skills and
 * better-openclaw SKILL.md format.
 *
 * Hermes skills use YAML front-matter + Markdown body:
 *   ---
 *   name: skill-name
 *   description: What it does
 *   version: 1.0.0
 *   tags: [category, tags]
 *   metadata:
 *     hermes:
 *       triggers: ["@skill-name", "/skill-name"]
 *   ---
 *   # Markdown body
 *
 * better-openclaw skills use a similar front-matter + Markdown:
 *   ---
 *   name: skill-id
 *   description: "What it does"
 *   metadata:
 *     openclaw:
 *       emoji: "🔧"
 *   ---
 *   # Markdown body
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HermesSkill {
	name: string;
	description: string;
	version?: string;
	author?: string;
	tags?: string[];
	metadata?: {
		hermes?: {
			triggers?: string[];
			related_skills?: string[];
		};
	};
	body: string;
}

export interface OpenClawSkill {
	id: string;
	name: string;
	description: string;
	emoji: string;
	services: string[];
	tags?: string[];
	body: string;
}

// ─── YAML Front-Matter Parser ───────────────────────────────────────────────

const FRONT_MATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

function parseSimpleYaml(yaml: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	const lines = yaml.split("\n");
	for (const line of lines) {
		const match = line.match(/^(\w[\w-]*):\s*(.+)$/);
		if (match) {
			const [, key, rawValue] = match;
			// Handle array syntax: [a, b, c]
			const arrayMatch = rawValue.match(/^\[(.+)]$/);
			if (arrayMatch) {
				result[key] = arrayMatch[1]
					.split(",")
					.map((s) => s.trim().replace(/^["']|["']$/g, ""));
			} else {
				result[key] = rawValue.replace(/^["']|["']$/g, "");
			}
		}
	}
	return result;
}

function parseFrontMatter(content: string): { meta: Record<string, unknown>; body: string } {
	const match = content.match(FRONT_MATTER_RE);
	if (!match) return { meta: {}, body: content };
	return { meta: parseSimpleYaml(match[1]), body: match[2].trim() };
}

// ─── Hermes → OpenClaw ─────────────────────────────────────────────────────

/**
 * Convert a Hermes YAML skill file content to an OpenClaw SKILL.md entry.
 * @param hermesContent - Full content of a Hermes skill file (YAML front-matter + body)
 * @param options - Optional overrides for emoji and service bindings
 */
export function hermesToOpenClaw(
	hermesContent: string,
	options?: { emoji?: string; services?: string[] },
): OpenClawSkill {
	const { meta, body } = parseFrontMatter(hermesContent);

	const name = String(meta.name ?? "unknown-skill");
	const id = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

	return {
		id,
		name: String(meta.name ?? name),
		description: String(meta.description ?? ""),
		emoji: options?.emoji ?? "🔧",
		services: options?.services ?? [],
		tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : [],
		body,
	};
}

/**
 * Serialize an OpenClaw skill to SKILL.md format.
 */
export function serializeOpenClawSkill(skill: OpenClawSkill): string {
	const lines = [
		"---",
		`name: ${skill.id}`,
		`description: "${skill.description.replace(/"/g, '\\"')}"`,
	];
	if (skill.tags && skill.tags.length > 0) {
		lines.push(`tags: [${skill.tags.join(", ")}]`);
	}
	lines.push("metadata:");
	lines.push("  openclaw:");
	lines.push(`    emoji: "${skill.emoji}"`);
	lines.push("---");
	lines.push("");
	lines.push(skill.body);

	return lines.join("\n");
}

// ─── OpenClaw → Hermes ─────────────────────────────────────────────────────

/**
 * Convert a better-openclaw SKILL.md content to a Hermes-compatible skill file.
 * @param openclawContent - Full content of a SKILL.md file
 * @param options - Optional overrides for version and author
 */
export function openClawToHermes(
	openclawContent: string,
	options?: { version?: string; author?: string },
): HermesSkill {
	const { meta, body } = parseFrontMatter(openclawContent);

	const name = String(meta.name ?? "unknown-skill");
	const id = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

	return {
		name,
		description: String(meta.description ?? ""),
		version: options?.version ?? "1.0.0",
		author: options?.author,
		tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : [],
		metadata: {
			hermes: {
				triggers: [`@${id}`, `/${id}`],
			},
		},
		body,
	};
}

/**
 * Serialize a Hermes skill to its YAML front-matter + Markdown format.
 */
export function serializeHermesSkill(skill: HermesSkill): string {
	const lines = [
		"---",
		`name: ${skill.name}`,
		`description: "${skill.description.replace(/"/g, '\\"')}"`,
	];
	if (skill.version) {
		lines.push(`version: ${skill.version}`);
	}
	if (skill.author) {
		lines.push(`author: ${skill.author}`);
	}
	if (skill.tags && skill.tags.length > 0) {
		lines.push(`tags: [${skill.tags.join(", ")}]`);
	}
	lines.push("metadata:");
	lines.push("  hermes:");
	if (skill.metadata?.hermes?.triggers?.length) {
		lines.push(`    triggers: [${skill.metadata.hermes.triggers.map((t) => `"${t}"`).join(", ")}]`);
	}
	if (skill.metadata?.hermes?.related_skills?.length) {
		lines.push(
			`    related_skills: [${skill.metadata.hermes.related_skills.map((s) => `"${s}"`).join(", ")}]`,
		);
	}
	lines.push("---");
	lines.push("");
	lines.push(skill.body);

	return lines.join("\n");
}
