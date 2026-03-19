import { getAllServices, getServiceById } from "./services/registry.js";
import { getSkillPackById } from "./skills/registry.js";
import type {
	AddedDependency,
	ResolvedService,
	ResolverError,
	ResolverInput,
	ResolverOutput,
	ServiceDefinition,
	Warning,
} from "./types.js";

export interface MemoryThresholds {
	info: number;
	warning: number;
	critical: number;
}

const DEFAULT_MEMORY_THRESHOLDS: MemoryThresholds = {
	info: 2048,
	warning: 4096,
	critical: 8192,
};

/**
 * Resolves user selections into a complete, valid service list.
 *
 * Algorithm:
 * 1. Expand skill pack requirements into service list
 * 2. Resolve transitive `requires` dependencies (iterate until stable)
 * 3. Detect `conflictsWith` violations
 * 4. Check platform compatibility and GPU requirements
 * 5. Estimate total memory (sum minMemoryMB)
 * 6. Deduplicate
 * 7. Topological sort by dependency graph, alphabetical for ties
 *
 * Deterministic: same input -> same output, always.
 */
export function resolve(input: ResolverInput): ResolverOutput {
	const addedDependencies: AddedDependency[] = [];
	const warnings: Warning[] = [];
	const errors: ResolverError[] = [];

	// Track all service IDs needed
	const serviceIds = new Set<string>(input.services);
	const serviceAddedBy = new Map<string, ResolvedService["addedBy"]>();

	// Mark user-selected services
	for (const id of input.services) {
		serviceAddedBy.set(id, "user");
	}

	// 1. Expand skill pack requirements
	for (const packId of input.skillPacks) {
		const pack = getSkillPackById(packId);
		if (!pack) {
			errors.push({
				type: "unknown_skill_pack",
				message: `Unknown skill pack: "${packId}"`,
			});
			continue;
		}
		for (const requiredService of pack.requiredServices) {
			if (!serviceIds.has(requiredService)) {
				serviceIds.add(requiredService);
				serviceAddedBy.set(requiredService, "skill-pack");
				addedDependencies.push({
					service: requiredService,
					reason: `Required by skill pack: ${pack.name}`,
				});
			}
		}
	}

	// Add proxy if specified
	if (input.proxy && input.proxy !== "none") {
		if (!serviceIds.has(input.proxy)) {
			serviceIds.add(input.proxy);
			serviceAddedBy.set(input.proxy, "proxy");
			addedDependencies.push({
				service: input.proxy,
				reason: `Selected as reverse proxy`,
			});
		}
	}

	// Add monitoring stack if requested
	if (input.monitoring) {
		const monitoringServices = ["uptime-kuma", "grafana", "prometheus"];
		for (const svc of monitoringServices) {
			if (!serviceIds.has(svc)) {
				serviceIds.add(svc);
				serviceAddedBy.set(svc, "monitoring");
				addedDependencies.push({
					service: svc,
					reason: "Included with monitoring stack",
				});
			}
		}
	}

	// Add mandatory platform services (mission-control, convex, tailscale, etc.)
	for (const def of getAllServices()) {
		if (def.mandatory && !serviceIds.has(def.id)) {
			serviceIds.add(def.id);
			serviceAddedBy.set(def.id, "mandatory");
			addedDependencies.push({
				service: def.id,
				reason: "Mandatory OpenClaw platform service",
			});
		}
	}

	// Validate all service IDs exist
	const unknownIds: string[] = [];
	for (const id of serviceIds) {
		if (!getServiceById(id)) {
			unknownIds.push(id);
		}
	}
	if (unknownIds.length > 0) {
		for (const id of unknownIds) {
			errors.push({
				type: "unknown_service",
				message: `Unknown service: "${id}"`,
			});
			serviceIds.delete(id);
		}
	}

	// 2. Resolve transitive dependencies (iterate until stable)
	let changed = true;
	const maxIterations = 50; // safety bound
	let iteration = 0;
	while (changed && iteration < maxIterations) {
		changed = false;
		iteration++;
		for (const id of [...serviceIds]) {
			const def = getServiceById(id);
			if (!def) continue;
			for (const reqId of def.requires) {
				if (!serviceIds.has(reqId)) {
					serviceIds.add(reqId);
					serviceAddedBy.set(reqId, "dependency");
					addedDependencies.push({
						service: reqId,
						serviceId: reqId,
						requiredBy: def.name,
						reason: `Required by ${def.name}`,
					});
					changed = true;
				}
			}
		}
	}

	if (iteration >= maxIterations) {
		warnings.push({
			type: "resolution",
			message: `Dependency resolution reached maximum iterations (${maxIterations}). Some transitive dependencies may not be fully resolved.`,
		});
	}

	// Check recommended services
	for (const id of serviceIds) {
		const def = getServiceById(id);
		if (!def) continue;
		for (const recId of def.recommends) {
			if (!serviceIds.has(recId) && getServiceById(recId)) {
				warnings.push({
					type: "recommendation",
					message: `${def.name} recommends "${recId}" for enhanced functionality`,
				});
			}
		}
	}

	// 3. Detect conflicts
	const resolvedDefs: ServiceDefinition[] = [];
	for (const id of serviceIds) {
		const def = getServiceById(id);
		if (def) resolvedDefs.push(def);
	}

	for (let i = 0; i < resolvedDefs.length; i++) {
		for (let j = i + 1; j < resolvedDefs.length; j++) {
			const a = resolvedDefs[i];
			const b = resolvedDefs[j];
			if (!a || !b) continue;
			if (a.conflictsWith.includes(b.id) || b.conflictsWith.includes(a.id)) {
				errors.push({
					type: "conflict",
					message: `${a.name} and ${b.name} cannot be used together`,
				});
			}
		}
	}

	// 4. Check platform compatibility
	if (input.platform) {
		for (const def of resolvedDefs) {
			if (def.platforms && def.platforms.length > 0 && !def.platforms.includes(input.platform)) {
				warnings.push({
					type: "platform",
					message: `${def.name} may not be compatible with ${input.platform}. Supported: ${def.platforms.join(", ")}`,
				});
			}
		}
	}

	// Check GPU requirements
	const gpuServices = resolvedDefs.filter((d) => d.gpuRequired);
	if (gpuServices.length > 0 && !input.gpu) {
		for (const svc of gpuServices) {
			warnings.push({
				type: "gpu",
				message: `${svc.name} requires GPU passthrough. Enable --gpu flag for optimal performance.`,
			});
		}
	}

	// 5. Estimate total memory
	let estimatedMemoryMB = 512; // Base for OpenClaw itself
	for (const def of resolvedDefs) {
		estimatedMemoryMB += def.minMemoryMB ?? 128;
	}

	// Memory warnings
	const thresholds = input.memoryThresholds ?? DEFAULT_MEMORY_THRESHOLDS;
	if (estimatedMemoryMB > thresholds.critical) {
		warnings.push({
			type: "memory",
			message: `Estimated ${(estimatedMemoryMB / 1024).toFixed(1)}GB RAM required. Ensure your server has sufficient resources.`,
		});
	} else if (estimatedMemoryMB > thresholds.warning) {
		warnings.push({
			type: "memory",
			message: `Estimated ${(estimatedMemoryMB / 1024).toFixed(1)}GB RAM required. A server with at least 8GB RAM is recommended.`,
		});
	} else if (estimatedMemoryMB > thresholds.info) {
		warnings.push({
			type: "memory",
			message: `Estimated ${(estimatedMemoryMB / 1024).toFixed(1)}GB RAM required.`,
		});
	}

	// 7. Topological sort by dependency graph
	const sorted = topologicalSort(resolvedDefs);

	// Build final resolved services list
	const services: ResolvedService[] = sorted.map((def) => ({
		definition: def,
		addedBy: serviceAddedBy.get(def.id) ?? "user",
	}));

	const isValid = errors.length === 0;

	return {
		services,
		addedDependencies,
		removedConflicts: [],
		warnings,
		errors,
		isValid,
		estimatedMemoryMB,
		aiProviders: input.aiProviders ?? [],
		gsdRuntimes: [],
	};
}

/**
 * Topological sort using Kahn's algorithm.
 * Ties broken alphabetically by service ID for determinism.
 */
function topologicalSort(definitions: ServiceDefinition[]): ServiceDefinition[] {
	const idSet = new Set(definitions.map((d) => d.id));
	const graph = new Map<string, string[]>(); // id -> list of IDs that depend on it
	const inDegree = new Map<string, number>();

	// Initialize
	for (const def of definitions) {
		graph.set(def.id, []);
		inDegree.set(def.id, 0);
	}

	// Build edges: if A requires B, then B -> A (B must come before A)
	for (const def of definitions) {
		for (const reqId of [...def.requires, ...def.dependsOn]) {
			if (idSet.has(reqId)) {
				graph.get(reqId)?.push(def.id);
				inDegree.set(def.id, (inDegree.get(def.id) ?? 0) + 1);
			}
		}
	}

	// Kahn's algorithm with alphabetical tie-breaking
	const queue: string[] = [];
	for (const [id, deg] of inDegree) {
		if (deg === 0) queue.push(id);
	}
	queue.sort(); // alphabetical for determinism

	const sorted: ServiceDefinition[] = [];
	const defMap = new Map(definitions.map((d) => [d.id, d]));

	while (queue.length > 0) {
		const id = queue.shift();
		if (id === undefined) continue;
		const def = defMap.get(id);
		if (def) sorted.push(def);

		const neighbors = graph.get(id) ?? [];
		const newReady: string[] = [];
		for (const neighbor of neighbors) {
			const deg = (inDegree.get(neighbor) ?? 0) - 1;
			inDegree.set(neighbor, deg);
			if (deg === 0) newReady.push(neighbor);
		}
		// Sort newly ready nodes alphabetically and add to queue in order
		newReady.sort();
		queue.push(...newReady);
	}

	// If not all nodes are in sorted, there's a cycle
	if (sorted.length < definitions.length) {
		// Return what we have plus remaining (cycle detected but we still produce output)
		const sortedIds = new Set(sorted.map((d) => d.id));
		const remaining = definitions.filter((d) => !sortedIds.has(d.id));
		remaining.sort((a, b) => a.id.localeCompare(b.id));
		sorted.push(...remaining);
	}

	return sorted;
}
