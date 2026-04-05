import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ComposeExecResult {
	stdout: string;
	stderr: string;
}

/**
 * Execute a `docker compose` CLI command in the project directory.
 * Used for operations that require compose-level orchestration
 * (scale, pull, recreate) rather than single-container Dockerode calls.
 */
export async function composeExec(
	projectDir: string,
	args: string[],
	timeoutMs = 120_000,
): Promise<ComposeExecResult> {
	const { stdout, stderr } = await execFileAsync(
		"docker",
		["compose", ...args],
		{
			cwd: projectDir,
			timeout: timeoutMs,
			env: process.env,
		},
	);

	return { stdout, stderr };
}

/** Scale a service to N replicas. */
export async function composeScale(
	projectDir: string,
	serviceId: string,
	replicas: number,
): Promise<ComposeExecResult> {
	return composeExec(projectDir, [
		"up",
		"-d",
		"--scale",
		`${serviceId}=${replicas}`,
		serviceId,
	]);
}

/** Pull latest images for specified services (or all). */
export async function composePull(
	projectDir: string,
	serviceIds?: string[],
): Promise<ComposeExecResult> {
	const args = ["pull", ...(serviceIds ?? [])];
	return composeExec(projectDir, args);
}

/** Force-recreate specified services (or all). */
export async function composeRecreate(
	projectDir: string,
	serviceIds?: string[],
): Promise<ComposeExecResult> {
	const args = [
		"up",
		"-d",
		"--force-recreate",
		...(serviceIds ?? []),
	];
	return composeExec(projectDir, args);
}
