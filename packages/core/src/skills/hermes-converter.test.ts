import { describe, expect, it } from "vitest";
import {
	hermesToOpenClaw,
	openClawToHermes,
	serializeHermesSkill,
	serializeOpenClawSkill,
} from "./hermes-converter.js";

const HERMES_SKILL = `---
name: github-pr
description: "Create and manage GitHub pull requests"
version: 1.2.0
author: NousResearch
tags: [github, git, code-review]
metadata:
  hermes:
    triggers: ["@github-pr", "/github-pr"]
---

# GitHub PR Manager

Create, review, and merge pull requests.

## Commands

- \`/github-pr create\` — Open a new PR
- \`/github-pr review\` — Review an existing PR`;

const OPENCLAW_SKILL = `---
name: redis-cache
description: "In-memory caching, pub/sub messaging, and queue management"
tags: [caching, pubsub, queue]
metadata:
  openclaw:
    emoji: "🔴"
---

# Redis Cache

Connect to Redis at \`{{REDIS_HOST}}:{{REDIS_PORT}}\`.

## Tips for AI Agents

- Use namespaced keys like \`openclaw:cache:*\``;

describe("hermesToOpenClaw", () => {
	it("converts Hermes skill to OpenClaw format", () => {
		const result = hermesToOpenClaw(HERMES_SKILL);

		expect(result.id).toBe("github-pr");
		expect(result.name).toBe("github-pr");
		expect(result.description).toBe("Create and manage GitHub pull requests");
		expect(result.emoji).toBe("🔧");
		expect(result.tags).toEqual(["github", "git", "code-review"]);
		expect(result.body).toContain("# GitHub PR Manager");
		expect(result.body).toContain("/github-pr create");
	});

	it("applies custom emoji and services", () => {
		const result = hermesToOpenClaw(HERMES_SKILL, {
			emoji: "🐙",
			services: ["gitea"],
		});

		expect(result.emoji).toBe("🐙");
		expect(result.services).toEqual(["gitea"]);
	});

	it("handles missing front-matter gracefully", () => {
		const result = hermesToOpenClaw("# Just a plain markdown file\n\nNo front matter.");

		expect(result.id).toBe("unknown-skill");
		expect(result.body).toContain("# Just a plain markdown file");
	});
});

describe("openClawToHermes", () => {
	it("converts OpenClaw skill to Hermes format", () => {
		const result = openClawToHermes(OPENCLAW_SKILL);

		expect(result.name).toBe("redis-cache");
		expect(result.description).toBe("In-memory caching, pub/sub messaging, and queue management");
		expect(result.version).toBe("1.0.0");
		expect(result.tags).toEqual(["caching", "pubsub", "queue"]);
		expect(result.metadata?.hermes?.triggers).toEqual(["@redis-cache", "/redis-cache"]);
		expect(result.body).toContain("# Redis Cache");
	});

	it("applies custom version and author", () => {
		const result = openClawToHermes(OPENCLAW_SKILL, {
			version: "2.0.0",
			author: "MyOrg",
		});

		expect(result.version).toBe("2.0.0");
		expect(result.author).toBe("MyOrg");
	});
});

describe("serializeOpenClawSkill", () => {
	it("produces valid SKILL.md content", () => {
		const skill = hermesToOpenClaw(HERMES_SKILL, { emoji: "🐙" });
		const output = serializeOpenClawSkill(skill);

		expect(output).toContain("---");
		expect(output).toContain("name: github-pr");
		expect(output).toContain('emoji: "🐙"');
		expect(output).toContain("tags: [github, git, code-review]");
		expect(output).toContain("# GitHub PR Manager");
	});
});

describe("serializeHermesSkill", () => {
	it("produces valid Hermes skill content", () => {
		const skill = openClawToHermes(OPENCLAW_SKILL, { author: "TestAuthor" });
		const output = serializeHermesSkill(skill);

		expect(output).toContain("---");
		expect(output).toContain("name: redis-cache");
		expect(output).toContain("version: 1.0.0");
		expect(output).toContain("author: TestAuthor");
		expect(output).toContain('triggers: ["@redis-cache", "/redis-cache"]');
		expect(output).toContain("# Redis Cache");
	});
});

describe("round-trip conversion", () => {
	it("Hermes → OpenClaw → Hermes preserves content", () => {
		const oc = hermesToOpenClaw(HERMES_SKILL);
		const ocContent = serializeOpenClawSkill(oc);
		const back = openClawToHermes(ocContent);

		expect(back.name).toBe("github-pr");
		expect(back.body).toContain("# GitHub PR Manager");
		expect(back.metadata?.hermes?.triggers).toEqual(["@github-pr", "/github-pr"]);
	});

	it("OpenClaw → Hermes → OpenClaw preserves content", () => {
		const hermes = openClawToHermes(OPENCLAW_SKILL);
		const hermesContent = serializeHermesSkill(hermes);
		const back = hermesToOpenClaw(hermesContent);

		expect(back.id).toBe("redis-cache");
		expect(back.body).toContain("# Redis Cache");
	});
});
