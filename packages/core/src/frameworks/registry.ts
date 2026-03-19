import type { AgentFrameworkDefinition, AgentFrameworkId } from "./types.js";

const frameworkMap = new Map<AgentFrameworkId, AgentFrameworkDefinition>();

/** Register a framework implementation. */
export function registerFramework(fw: AgentFrameworkDefinition): void {
	frameworkMap.set(fw.id, fw);
}

/** Get a framework by its ID. Returns undefined if not registered. */
export function getFrameworkById(id: string): AgentFrameworkDefinition | undefined {
	return frameworkMap.get(id as AgentFrameworkId);
}

/** Get all registered frameworks. */
export function getAllFrameworks(): AgentFrameworkDefinition[] {
	return [...frameworkMap.values()];
}

/** Get all frameworks that can be a primary orchestrator. */
export function getPrimaryFrameworks(): AgentFrameworkDefinition[] {
	return getAllFrameworks().filter((fw) => fw.canBePrimary);
}

/** Get all frameworks that can run as companions. */
export function getCompanionFrameworks(): AgentFrameworkDefinition[] {
	return getAllFrameworks().filter((fw) => fw.canBeCompanion);
}
