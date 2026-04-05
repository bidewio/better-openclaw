"use client";

import { type AiProvider, type GsdRuntime, SERVICE_CATEGORIES } from "@better-openclaw/core/types";
import { Search, X } from "lucide-react";
import { FrameworkSelector } from "@/components/stack-builder/FrameworkSelector";
import { ServiceGrid } from "@/components/stack-builder/ServiceGrid";
import { getClientManifestSkills } from "@/lib/skill-manifest-client";
import { cn } from "@/lib/utils";
import { useStackBuilder } from "./StackBuilderProvider";

const CURATED_SKILL_COUNT = getClientManifestSkills().length;

export function StackCanvas() {
	const {
		allPresets,
		allSkillPacks,
		filteredServices,
		searchQuery,
		setSearchQuery,
		activePreset,
		handlePreset,
		selectedIndividualSkills,
		setSelectedIndividualSkills,
		setShowSkillModal,
		selectedSkillPacks,
		setSelectedSkillPacks,
		selectedAiProviders,
		setSelectedAiProviders,
		selectedGsdRuntimes,
		setSelectedGsdRuntimes,
		selectedPrimaryFramework,
		setSelectedPrimaryFramework,
		selectedCompanionFrameworks,
		setSelectedCompanionFrameworks,
		resolvedServiceIds,
		resolverOutput,
		handleToggle,
	} = useStackBuilder();

	return (
		<div className="flex-1 overflow-y-auto border-r border-border p-4 md:p-6">
			<div className="mb-6">
				<h2 className="text-xl font-bold text-foreground">Select Services</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Pick the services for your stack. Dependencies are resolved automatically.
				</p>
			</div>

			{/* Search bar */}
			<div className="relative mb-4">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search services..."
					className="w-full rounded-lg border border-border bg-surface/50 py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => setSearchQuery("")}
						className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
						aria-label="Clear search"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				)}
			</div>

			{/* Preset quick-select */}
			<div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
				{allPresets.map((preset) => (
					<button
						key={preset.id}
						type="button"
						onClick={() => handlePreset(preset.id)}
						className={cn(
							"shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
							activePreset === preset.id
								? "border-primary/30 bg-primary/10 text-primary"
								: "border-transparent bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30",
						)}
					>
						{preset.name}
					</button>
				))}
			</div>

			{/* Agent Framework Selection */}
			<div className="mb-6">
				<FrameworkSelector
					selectedPrimary={selectedPrimaryFramework}
					onPrimaryChange={setSelectedPrimaryFramework}
					selectedCompanions={selectedCompanionFrameworks}
					onCompanionsChange={setSelectedCompanionFrameworks}
				/>
			</div>

			{/* Advanced Skill Selection */}
			<div className="mb-6">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-sm font-semibold text-foreground">Agent Skills</h3>
						<p className="mt-0.5 text-xs text-muted-foreground">
							{selectedIndividualSkills.size > 0
								? `${selectedIndividualSkills.size} skill${selectedIndividualSkills.size !== 1 ? "s" : ""} selected`
								: `Browse ${CURATED_SKILL_COUNT} curated skills or search the SkillsMP marketplace`}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setShowSkillModal(true)}
						className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 border border-primary/20"
					>
						<Search className="h-4 w-4" />
						Browse Skills
					</button>
				</div>

				{/* Selected skills chips */}
				{selectedIndividualSkills.size > 0 && (
					<div className="mt-3 flex flex-wrap gap-1.5">
						{Array.from(selectedIndividualSkills.values()).map((skill) => (
							<span
								key={skill.id}
								className={cn(
									"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
									skill.source === "curated"
										? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
										: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
								)}
							>
								{skill.emoji} {skill.name}
								<button
									aria-label="Remove skill"
									type="button"
									onClick={() => {
										setSelectedIndividualSkills((prev) => {
											const next = new Map(prev);
											next.delete(skill.id);
											return next;
										});
									}}
									className="ml-0.5 rounded-full p-0.5 hover:bg-background/10 dark:hover:bg-white/10"
								>
									<X className="h-3 w-3" />
								</button>
							</span>
						))}
					</div>
				)}

				{/* Quick Skill Packs */}
				{allSkillPacks.length > 0 && (
					<div className="mt-4">
						<p className="mb-2 text-xs font-medium text-muted-foreground">Quick Packs:</p>
						<div className="flex flex-wrap gap-1.5">
							{allSkillPacks.map((pack) => {
								const isSelected = selectedSkillPacks.has(pack.id);
								return (
									<button
										key={pack.id}
										type="button"
										onClick={() => {
											setSelectedSkillPacks((prev) => {
												const next = new Set(prev);
												if (next.has(pack.id)) {
													next.delete(pack.id);
												} else {
													next.add(pack.id);
												}
												return next;
											});
										}}
										className={cn(
											"shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
											isSelected
												? "border-primary/30 bg-primary/10 text-primary"
												: "border-transparent bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
										)}
									>
										{pack.icon ?? ""} {pack.name}
									</button>
								);
							})}
						</div>
					</div>
				)}

				{/* AI Providers Selection */}
				<div className="mt-6 mb-6">
					<div className="flex items-center justify-between mb-2">
						<div>
							<h3 className="text-sm font-semibold text-foreground">AI Providers</h3>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Select one or more LLM gateways to configure
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2 mt-3">
						{[
							{ id: "openai", name: "OpenAI" },
							{ id: "anthropic", name: "Anthropic" },
							{ id: "google", name: "Google Gemini" },
							{ id: "xai", name: "xAI Grok" },
							{ id: "deepseek", name: "DeepSeek" },
							{ id: "groq", name: "Groq" },
							{ id: "openrouter", name: "OpenRouter" },
							{ id: "mistral", name: "Mistral" },
							{ id: "together", name: "Together AI" },
							{ id: "ollama", name: "Ollama (Local)" },
							{ id: "lmstudio", name: "LM Studio" },
							{ id: "vllm", name: "vLLM" },
						].map((provider) => {
							const providerId = provider.id as AiProvider;
							const isSelected = selectedAiProviders.has(providerId);
							return (
								<button
									key={provider.id}
									type="button"
									onClick={() => {
										setSelectedAiProviders((prev) => {
											const next = new Set(prev);
											if (next.has(providerId)) {
												next.delete(providerId);
											} else {
												next.add(providerId);
											}
											return next;
										});
									}}
									className={cn(
										"shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
										isSelected
											? "border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(163,135,95,0.2)]"
											: "border-border/50 bg-surface/50 text-muted-foreground hover:bg-surface hover:text-foreground",
									)}
								>
									{provider.name}
								</button>
							);
						})}
					</div>
				</div>

				{/* Get-Shit-Done Channels Selection */}
				<div className="mt-6 mb-6">
					<div className="flex items-center justify-between mb-2">
						<div>
							<h3 className="text-sm font-semibold text-foreground">GSD AI Runtimes (Optional)</h3>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Select one or more agent workflows to install automatically
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2 mt-3">
						{(
							[
								{ id: "claude", name: "Claude Code", emoji: "🟠" },
								{ id: "opencode", name: "OpenCode", emoji: "🟢" },
								{ id: "gemini", name: "Gemini CLI", emoji: "🔵" },
								{ id: "codex", name: "Codex", emoji: "🟣" },
							] as const
						).map((runtime) => {
							const runtimeId = runtime.id as unknown as GsdRuntime;
							const isSelected = selectedGsdRuntimes.has(runtimeId);
							return (
								<button
									key={runtime.id}
									type="button"
									onClick={() => {
										setSelectedGsdRuntimes((prev) => {
											const next = new Set(prev);
											if (next.has(runtime.id as GsdRuntime)) {
												next.delete(runtime.id as GsdRuntime);
											} else {
												next.add(runtime.id as GsdRuntime);
											}
											return next;
										});
									}}
									className={cn(
										"shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
										isSelected
											? "border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(163,135,95,0.2)]"
											: "border-border/50 bg-surface/50 text-muted-foreground hover:bg-surface hover:text-foreground",
									)}
								>
									{runtime.emoji} {runtime.name}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<ServiceGrid
				services={filteredServices}
				categories={SERVICE_CATEGORIES}
				selectedIds={resolvedServiceIds}
				resolvedServices={resolverOutput?.services ?? []}
				onToggle={handleToggle}
			/>

			{/* No results message */}
			{searchQuery && filteredServices.length === 0 && (
				<div className="py-12 text-center">
					<p className="text-sm text-muted-foreground">
						No services match &ldquo;{searchQuery}&rdquo;
					</p>
					<button
						type="button"
						onClick={() => setSearchQuery("")}
						className="mt-2 text-xs text-primary hover:underline"
					>
						Clear search
					</button>
				</div>
			)}
		</div>
	);
}
