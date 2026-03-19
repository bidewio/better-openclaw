export const CURRENT_CONFIG_VERSION = 3;

type MigrationFn = (input: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, MigrationFn> = {
	// v1 → v2: ensure deploymentType field exists (defaulting to "docker")
	1: (input) => ({
		...input,
		configVersion: 2,
		deploymentType: (input.deploymentType as string) ?? "docker",
	}),
	// v2 → v3: add primaryFramework (defaults to "openclaw" for existing configs)
	2: (input) => ({
		...input,
		configVersion: 3,
		primaryFramework: (input.primaryFramework as string) ?? "openclaw",
		companionFrameworks: (input.companionFrameworks as string[]) ?? [],
	}),
};

/**
 * Applies sequential migrations to bring a config from its current version
 * to CURRENT_CONFIG_VERSION. Returns the config unchanged if already current.
 */
export function migrateConfig(input: Record<string, unknown>): Record<string, unknown> {
	let version = (input.configVersion as number) ?? 1;

	if (version > CURRENT_CONFIG_VERSION) {
		throw new Error(`No migration path from config version ${version}`);
	}

	let current = { ...input };

	while (version < CURRENT_CONFIG_VERSION) {
		const migrationFn = migrations[version];
		if (!migrationFn) {
			throw new Error(`No migration path from config version ${version}`);
		}
		current = migrationFn(current);
		version++;
	}

	return current;
}

/**
 * Returns true if the config needs migration to the current version.
 */
export function needsMigration(input: Record<string, unknown>): boolean {
	const version = (input.configVersion as number) ?? 1;
	return version < CURRENT_CONFIG_VERSION;
}
