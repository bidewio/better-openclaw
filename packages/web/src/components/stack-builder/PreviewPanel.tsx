"use client";

import { type ComposeResult, composeMultiFile } from "@better-openclaw/core/composer";
import { type EnvVarGroup, getStructuredEnvVars } from "@better-openclaw/core/generators/env";
import type { ResolverOutput } from "@better-openclaw/core/types";
import {
	AlertTriangle,
	Box,
	ChevronDown,
	ChevronRight,
	Cpu,
	Eye,
	EyeOff,
	FileCode2,
	HardDrive,
	Lock,
	ShieldCheck,
	Variable,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CommandOutput } from "./CommandOutput";

// ── Sub-tab label map ───────────────────────────────────────────────────────

const FILE_LABEL_MAP: Record<string, string> = {
	"docker-compose.yml": "Base",
	"docker-compose.ai.yml": "AI",
	"docker-compose.media.yml": "Media",
	"docker-compose.monitoring.yml": "Monitoring",
	"docker-compose.tools.yml": "Tools",
	"docker-compose.social.yml": "Social",
	"docker-compose.knowledge.yml": "Knowledge",
	"docker-compose.communication.yml": "Communication",
};

const FILE_ORDER = [
	"docker-compose.yml",
	"docker-compose.ai.yml",
	"docker-compose.media.yml",
	"docker-compose.monitoring.yml",
	"docker-compose.tools.yml",
	"docker-compose.social.yml",
	"docker-compose.knowledge.yml",
	"docker-compose.communication.yml",
];

// ── Props ───────────────────────────────────────────────────────────────────

interface PreviewPanelProps {
	composeYaml: string;
	resolverOutput: ResolverOutput | null;
	projectName: string;
	selectedServiceIds: string[];
}

// ── Component ───────────────────────────────────────────────────────────────

export function PreviewPanel({
	composeYaml,
	resolverOutput,
	projectName,
	selectedServiceIds,
}: PreviewPanelProps) {
	const [activeTab, setActiveTab] = useState<"compose" | "env">("compose");
	const [activeComposeFile, setActiveComposeFile] = useState<string>("docker-compose.yml");
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
	const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

	const serviceCount = resolverOutput?.services.length ?? 0;
	const estimatedMemoryMB = resolverOutput?.estimatedMemoryMB ?? 0;
	const warnings = resolverOutput?.warnings ?? [];
	const errors = resolverOutput?.errors ?? [];
	const addedDeps = resolverOutput?.addedDependencies ?? [];

	const memoryDisplay =
		estimatedMemoryMB >= 1024
			? `${(estimatedMemoryMB / 1024).toFixed(1)} GB`
			: `${estimatedMemoryMB} MB`;

	// Build CLI command
	const cliCommand =
		selectedServiceIds.length > 0
			? `npx better-openclaw init ${projectName || "my-stack"} --services ${selectedServiceIds.join(",")}`
			: `npx better-openclaw init ${projectName || "my-stack"}`;

	// Multi-file compose result
	const composeResult: ComposeResult | null = useMemo(() => {
		if (!resolverOutput || resolverOutput.services.length === 0) return null;
		try {
			return composeMultiFile(resolverOutput, {
				projectName: projectName || "my-stack",
				proxy: "none",
				gpu: false,
				platform: "linux/amd64",
				deployment: "local",
				openclawVersion: "latest",
				openclawImage: "official",
				hardened: true,
				openclawInstallMethod: "docker",
			});
		} catch {
			return null;
		}
	}, [resolverOutput, projectName]);

	// Structured env vars
	const envVarGroups: EnvVarGroup[] = useMemo(() => {
		if (!resolverOutput) return [];
		try {
			return getStructuredEnvVars(resolverOutput);
		} catch {
			return [];
		}
	}, [resolverOutput]);

	// Files that actually have content
	const composeFiles = useMemo(() => {
		if (!composeResult) return [];
		return FILE_ORDER.filter(
			(f) => composeResult.files[f] && composeResult.files[f].trim().length > 0,
		);
	}, [composeResult]);

	// Ensure active sub-tab is valid
	const currentComposeFile = composeFiles.includes(activeComposeFile)
		? activeComposeFile
		: (composeFiles[0] ?? "docker-compose.yml");

	// Toggle group expansion
	const toggleGroup = (serviceId: string) => {
		setExpandedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(serviceId)) next.delete(serviceId);
			else next.add(serviceId);
			return next;
		});
	};

	// Toggle secret reveal
	const toggleSecret = (key: string) => {
		setRevealedSecrets((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	return (
		<div className="flex h-full flex-col gap-4">
			{/* Stats bar */}
			<div className="grid grid-cols-3 gap-3">
				<div className="rounded-lg border border-border bg-surface/60 p-3 text-center">
					<div className="flex items-center justify-center gap-1.5 text-muted-foreground">
						<Box className="h-3.5 w-3.5" />
						<span className="text-[10px] uppercase tracking-wider">Services</span>
					</div>
					<p className="mt-1 text-2xl font-bold text-foreground">{serviceCount}</p>
				</div>
				<div className="rounded-lg border border-border bg-surface/60 p-3 text-center">
					<div className="flex items-center justify-center gap-1.5 text-muted-foreground">
						<Cpu className="h-3.5 w-3.5" />
						<span className="text-[10px] uppercase tracking-wider">Skills</span>
					</div>
					<p className="mt-1 text-2xl font-bold text-foreground">
						{resolverOutput?.services.reduce(
							(acc, s) => acc + (s.definition.skills?.length ?? 0),
							0,
						) ?? 0}
					</p>
				</div>
				<div className="rounded-lg border border-border bg-surface/60 p-3 text-center">
					<div className="flex items-center justify-center gap-1.5 text-muted-foreground">
						<HardDrive className="h-3.5 w-3.5" />
						<span className="text-[10px] uppercase tracking-wider">RAM</span>
					</div>
					<p
						className={cn(
							"mt-1 text-2xl font-bold",
							estimatedMemoryMB > 8192
								? "text-red-400"
								: estimatedMemoryMB > 4096
									? "text-yellow-400"
									: "text-foreground",
						)}
					>
						{memoryDisplay}
					</p>
				</div>
			</div>

			{/* Auto-added dependencies */}
			{addedDeps.length > 0 && (
				<div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
					<p className="mb-1 text-xs font-semibold text-accent">Auto-added dependencies</p>
					<ul className="space-y-0.5">
						{addedDeps.map((dep) => (
							<li key={`${dep.service}-${dep.reason}`} className="text-xs text-muted-foreground">
								<span className="font-medium text-foreground">{dep.service}</span>
								{" — "}
								{dep.reason}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Warnings */}
			{warnings.length > 0 && (
				<div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
					<p className="mb-1 flex items-center gap-1 text-xs font-semibold text-yellow-400">
						<AlertTriangle className="h-3 w-3" />
						Warnings
					</p>
					<ul className="space-y-0.5">
						{warnings.map((w) => (
							<li key={w.message} className="text-xs text-muted-foreground">
								{w.message}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Errors */}
			{errors.length > 0 && (
				<div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
					<p className="mb-1 text-xs font-semibold text-red-400">Errors</p>
					<ul className="space-y-0.5">
						{errors.map((e) => (
							<li key={e.message} className="text-xs text-muted-foreground">
								{e.message}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* ── Main Tabs ──────────────────────────────────────────────────────── */}
			<div className="flex border-b border-border">
				<button
					type="button"
					onClick={() => setActiveTab("compose")}
					className={cn(
						"flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors",
						activeTab === "compose"
							? "border-b-2 border-primary bg-primary/20 text-primary"
							: "bg-surface text-muted-foreground hover:text-foreground",
					)}
				>
					<FileCode2 className="h-3.5 w-3.5" />
					Compose Files
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("env")}
					className={cn(
						"flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors",
						activeTab === "env"
							? "border-b-2 border-primary bg-primary/20 text-primary"
							: "bg-surface text-muted-foreground hover:text-foreground",
					)}
				>
					<Variable className="h-3.5 w-3.5" />
					Environment Variables
				</button>
			</div>

			{/* ── Tab Content ────────────────────────────────────────────────────── */}

			{activeTab === "compose" && (
				<div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface dark:bg-[#0D1117]">
					{/* Compose sub-tabs */}
					{composeResult && composeFiles.length > 1 && (
						<div className="flex flex-wrap gap-0 border-b border-border bg-surface/30">
							{composeFiles.map((file) => (
								<button
									key={file}
									type="button"
									onClick={() => setActiveComposeFile(file)}
									className={cn(
										"px-3 py-1.5 text-[11px] font-medium transition-colors",
										currentComposeFile === file
											? "border-b-2 border-accent bg-accent/10 text-accent"
											: "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
									)}
								>
									{FILE_LABEL_MAP[file] ?? file}
								</button>
							))}
						</div>
					)}

					{/* File header */}
					<div className="flex items-center justify-between border-b border-border px-4 py-2">
						<span className="text-xs font-medium text-muted-foreground">
							{composeResult ? currentComposeFile : "docker-compose.yml"}
						</span>
						<span className="text-[10px] text-muted-foreground/50">preview</span>
					</div>

					{/* YAML content */}
					<div className="max-h-[400px] overflow-auto p-4">
						<pre className="whitespace-pre font-mono text-xs leading-relaxed text-foreground/80">
							{composeResult
								? composeResult.files[currentComposeFile] || "# No content for this file"
								: composeYaml || "# Select services to preview your stack..."}
						</pre>
					</div>

					{/* Profiles hint */}
					{composeResult && composeResult.profiles.length > 0 && (
						<div className="border-t border-border bg-surface/20 px-4 py-2">
							<p className="text-[11px] text-muted-foreground">
								<span className="font-medium text-accent">Tip:</span> Use{" "}
								<code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-foreground">
									docker compose {composeResult.profiles.map((p) => `--profile ${p}`).join(" ")} up
								</code>{" "}
								to start specific groups
							</p>
						</div>
					)}
				</div>
			)}

			{activeTab === "env" && (
				<div className="flex flex-1 flex-col gap-2 overflow-auto">
					{envVarGroups.length === 0 ? (
						<div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-surface/30 p-8">
							<p className="text-sm text-muted-foreground">
								Select services to see environment variables...
							</p>
						</div>
					) : (
						envVarGroups.map((group) => (
							<div
								key={group.serviceId}
								className="overflow-hidden rounded-lg border border-border bg-surface/40"
							>
								{/* Group header */}
								<button
									type="button"
									onClick={() => toggleGroup(group.serviceId)}
									className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface/80"
								>
									{expandedGroups.has(group.serviceId) ? (
										<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
									) : (
										<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
									)}
									<span className="text-sm">{group.serviceIcon}</span>
									<span className="text-xs font-semibold text-foreground">{group.serviceName}</span>
									<span className="ml-auto text-[10px] text-muted-foreground">
										{group.vars.length} var{group.vars.length !== 1 ? "s" : ""}
									</span>
								</button>

								{/* Group vars */}
								{expandedGroups.has(group.serviceId) && (
									<div className="border-t border-border">
										{group.vars.map((v) => (
											<div
												key={v.key}
												className="flex flex-col gap-1 border-b border-border/50 px-3 py-2 last:border-b-0"
											>
												<div className="flex items-center gap-2">
													<code className="font-mono text-xs font-medium text-accent">{v.key}</code>
													<div className="flex items-center gap-1">
														{v.required && (
															<span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
																<ShieldCheck className="h-2.5 w-2.5" />
																Required
															</span>
														)}
														{v.secret && (
															<span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-yellow-400">
																<Lock className="h-2.5 w-2.5" />
																Secret
															</span>
														)}
													</div>
												</div>
												{v.description && (
													<p className="text-[11px] text-muted-foreground">{v.description}</p>
												)}
												{v.defaultValue && (
													<div className="flex items-center gap-1.5">
														<span className="text-[10px] text-muted-foreground/60">Default:</span>
														{v.secret ? (
															<div className="flex items-center gap-1">
																<code className="font-mono text-[11px] text-foreground/60">
																	{revealedSecrets.has(v.key) ? v.defaultValue : "••••••••"}
																</code>
																<button
																	type="button"
																	onClick={() => toggleSecret(v.key)}
																	className="text-muted-foreground transition-colors hover:text-foreground"
																>
																	{revealedSecrets.has(v.key) ? (
																		<EyeOff className="h-3 w-3" />
																	) : (
																		<Eye className="h-3 w-3" />
																	)}
																</button>
															</div>
														) : (
															<code className="font-mono text-[11px] text-foreground/60">
																{v.defaultValue}
															</code>
														)}
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						))
					)}
				</div>
			)}

			{/* CLI Command */}
			<CommandOutput command={cliCommand} />
		</div>
	);
}
