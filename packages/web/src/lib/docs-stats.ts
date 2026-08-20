import {
	getAllPresets,
	getAllServices,
	getAllSkillPacks,
	SERVICE_CATEGORIES,
} from "@better-openclaw/core";

const allServices = getAllServices();
const allSkillPacks = getAllSkillPacks();
const allPresets = getAllPresets();

export const docsStats = {
	serviceCount: allServices.length,
	skillPackCount: allSkillPacks.length,
	presetCount: allPresets.length,
	categoryCount: SERVICE_CATEGORIES.length,
} as const;
