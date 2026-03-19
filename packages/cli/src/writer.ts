import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import pc from "picocolors";

/**
 * Writes the generated project files to disk.
 *
 * - Creates the project directory and all necessary subdirectories
 * - Writes each file with its content
 * - Makes `.sh` files executable (chmod +x)
 * - In dry-run mode, only logs what would be created
 * - Optionally creates a tar.gz or zip archive of the output
 * - Refuses to overwrite a non-empty directory unless `force` is set
 */
export async function writeProject(
	projectDir: string,
	files: Record<string, string>,
	options?: { dryRun?: boolean; outputFormat?: string; force?: boolean },
): Promise<void> {
	const sortedPaths = Object.keys(files).sort();

	if (options?.dryRun) {
		console.log(pc.bold("\nDry run — files that would be created:\n"));
		for (const filePath of sortedPaths) {
			console.log(`  ${pc.cyan(join(projectDir, filePath))}`);
		}
		console.log(pc.dim(`\n  Total: ${sortedPaths.length} files`));
		return;
	}

	// Overwrite protection: refuse to write into a non-empty directory unless --force
	if (!options?.force && existsSync(projectDir)) {
		try {
			const entries = await readdir(projectDir);
			if (entries.length > 0) {
				throw new Error(
					`Directory "${projectDir}" already exists and is not empty. Use --force to overwrite.`,
				);
			}
		} catch (err) {
			if (err instanceof Error && err.message.includes("--force")) throw err;
			// readdir failed for another reason, continue
		}
	}

	// Create root project directory
	await mkdir(projectDir, { recursive: true });

	// Collect all unique directories we need to create
	const dirs = new Set<string>();
	for (const filePath of sortedPaths) {
		const fullPath = join(projectDir, filePath);
		const dir = dirname(fullPath);
		dirs.add(dir);
	}

	// Create all directories
	for (const dir of dirs) {
		await mkdir(dir, { recursive: true });
	}

	// Write all files
	for (const filePath of sortedPaths) {
		const fullPath = join(projectDir, filePath);
		const content = files[filePath];
		if (content === undefined) {
			continue;
		}
		await writeFile(fullPath, content, "utf-8");

		// Make shell scripts executable
		if (filePath.endsWith(".sh")) {
			try {
				await chmod(fullPath, 0o755);
			} catch {
				// chmod may not be supported on all platforms (e.g. Windows)
			}
		}
	}

	// Create archive if requested
	const fmt = options?.outputFormat;
	if (fmt === "tar" || fmt === "zip") {
		await createArchive(projectDir, fmt);
	}
}

/**
 * Creates a tar.gz or zip archive from the project directory.
 */
async function createArchive(projectDir: string, format: "tar" | "zip"): Promise<void> {
	const absDir = resolve(projectDir);
	const parentDir = dirname(absDir);
	const baseName = absDir.split(/[\\/]/).filter(Boolean).pop() ?? "openclaw-stack";

	try {
		if (format === "tar") {
			const archivePath = `${absDir}.tar.gz`;
			const result = spawnSync("tar", ["-czf", archivePath, "-C", parentDir, baseName], {
				stdio: "pipe",
			});
			if (result.error || result.status !== 0) {
				throw new Error(result.stderr?.toString() || result.error?.message || "tar command failed");
			}
			console.log(pc.green(`  Archive created: ${archivePath}`));
		} else {
			// zip
			const archivePath = `${absDir}.zip`;
			if (process.platform === "win32") {
				// Use PowerShell Compress-Archive on Windows
				const result = spawnSync(
					"powershell",
					[
						"-NoProfile",
						"-Command",
						`Compress-Archive -Path '${absDir}\\*' -DestinationPath '${archivePath}' -Force`,
					],
					{ stdio: "pipe" },
				);
				if (result.error || result.status !== 0) {
					throw new Error(
						result.stderr?.toString() || result.error?.message || "PowerShell command failed",
					);
				}
			} else {
				// We can't easily cd and execute across platforms with spawn without a shell,
				// but zip allows doing it via arguments or running from a cwd.
				const result = spawnSync("zip", ["-r", archivePath, baseName], {
					cwd: parentDir,
					stdio: "pipe",
				});
				if (result.error || result.status !== 0) {
					throw new Error(
						result.stderr?.toString() || result.error?.message || "zip command failed",
					);
				}
			}
			console.log(pc.green(`  Archive created: ${archivePath}`));
		}
	} catch (err) {
		console.log(
			pc.yellow(
				`  Warning: Could not create ${format} archive. ${err instanceof Error ? err.message : String(err)}`,
			),
		);
		console.log(pc.dim(`  The project files are still available in ${projectDir}`));
	}
}
