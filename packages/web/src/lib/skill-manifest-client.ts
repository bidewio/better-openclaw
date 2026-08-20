// Client-safe manifest data loader
import {
	getAllManifestSkills,
	type SkillManifestEntry,
} from "@better-openclaw/core/skills/skill-manifest";

export function getClientManifestSkills(): SkillManifestEntry[] {
	return getAllManifestSkills();
}

export type { SkillManifestEntry };
