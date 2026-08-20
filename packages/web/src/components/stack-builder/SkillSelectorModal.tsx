"use client";

import { ExternalLink, Globe, Loader2, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CuratedSkillCard } from "./CuratedSkillCard";
import { MarketplaceSkillCard } from "./MarketplaceSkillCard";
import { CATEGORY_ORDER, useCuratedSkills } from "./use-curated-skills";
import { useMarketplaceSearch } from "./use-marketplace-search";

export interface SelectedSkill {
	id: string;
	name: string;
	emoji: string;
	source: "curated" | "marketplace";
}

interface SkillSelectorModalProps {
	open: boolean;
	onClose: () => void;
	selectedSkills: Map<string, SelectedSkill>;
	onApply: (skills: Map<string, SelectedSkill>) => void;
}

export function SkillSelectorModal({
	open,
	onClose,
	selectedSkills,
	onApply,
}: SkillSelectorModalProps) {
	const [tab, setTab] = useState<"curated" | "marketplace">("curated");
	const [localSelection, setLocalSelection] = useState<Map<string, SelectedSkill>>(new Map());
	const modalRef = useRef<HTMLDivElement>(null);

	const {
		search,
		setSearch,
		activeCategory,
		setActiveCategory,
		curatedSkills,
		categorizedSkills,
		categories,
		filteredCurated,
		groupedFiltered,
	} = useCuratedSkills();

	const {
		mpQuery,
		mpResults,
		mpLoading,
		mpError,
		mpSearchMode,
		handleMpQueryChange,
		handleMpSearchModeChange,
		clearMarketplaceSearch,
	} = useMarketplaceSearch();

	// Sync prop → local on open
	useEffect(() => {
		if (open) {
			setLocalSelection(new Map(selectedSkills));
			setSearch("");
			clearMarketplaceSearch();
			setTab("curated");
		}
	}, [open, selectedSkills, setSearch, clearMarketplaceSearch]);

	// Keyboard: Escape to close
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open, onClose]);

	// Toggle selection
	const toggleSkill = useCallback(
		(id: string, name: string, emoji: string, source: "curated" | "marketplace") => {
			setLocalSelection((prev) => {
				const next = new Map(prev);
				if (next.has(id)) {
					next.delete(id);
				} else {
					next.set(id, { id, name, emoji, source });
				}
				return next;
			});
		},
		[],
	);

	// Apply and close
	const handleApply = useCallback(() => {
		onApply(localSelection);
		onClose();
	}, [localSelection, onApply, onClose]);

	// Select / deselect all visible curated
	const selectAllVisible = useCallback(() => {
		setLocalSelection((prev) => {
			const next = new Map(prev);
			for (const skill of filteredCurated) {
				if (!next.has(skill.id)) {
					next.set(skill.id, {
						id: skill.id,
						name: skill.id.replace(/-/g, " "),
						emoji: skill.emoji,
						source: "curated",
					});
				}
			}
			return next;
		});
	}, [filteredCurated]);

	const deselectAllVisible = useCallback(() => {
		setLocalSelection((prev) => {
			const next = new Map(prev);
			for (const skill of filteredCurated) {
				next.delete(skill.id);
			}
			return next;
		});
	}, [filteredCurated]);

	if (!open) return null;

	const curatedCount = Array.from(localSelection.values()).filter(
		(s) => s.source === "curated",
	).length;
	const marketplaceCount = Array.from(localSelection.values()).filter(
		(s) => s.source === "marketplace",
	).length;

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="skill-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div
				ref={modalRef}
				className="mx-4 mt-8 flex max-h-[calc(100vh-64px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
			>
				{/* ── Header ─────────────────────────────────────────────── */}
				<div className="flex items-center justify-between border-b border-border px-6 py-4">
					<div>
						<h2 id="skill-modal-title" className="text-lg font-bold text-foreground">
							Browse Skills
						</h2>
						<p className="mt-0.5 text-xs text-muted-foreground">
							{localSelection.size} selected
							{curatedCount > 0 && (
								<span className="ml-1.5 inline-flex items-center gap-1 text-emerald-500">
									<ShieldCheck className="h-3 w-3" />
									{curatedCount} curated
								</span>
							)}
							{marketplaceCount > 0 && (
								<span className="ml-1.5 inline-flex items-center gap-1 text-blue-400">
									<Globe className="h-3 w-3" />
									{marketplaceCount} marketplace
								</span>
							)}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* ── Tabs ───────────────────────────────────────────────── */}
				<div className="flex items-center gap-1 border-b border-border px-6 overflow-x-auto">
					<button
						type="button"
						onClick={() => setTab("curated")}
						className={cn(
							"relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-lg",
							tab === "curated" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
						)}
					>
						<span className="flex items-center gap-1.5">
							<ShieldCheck className="h-4 w-4 shrink-0" />
							<span>Curated Skills</span>
							<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
								{curatedSkills.length}
							</span>
						</span>
						{tab === "curated" && (
							<span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
						)}
					</button>
					<button
						type="button"
						onClick={() => setTab("marketplace")}
						className={cn(
							"relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-lg",
							tab === "marketplace"
								? "text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<span className="flex items-center gap-1.5">
							<Globe className="h-4 w-4 shrink-0" />
							<span>SkillsMP Marketplace</span>
						</span>
						{tab === "marketplace" && (
							<span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
						)}
					</button>
				</div>

				{/* ── Content ────────────────────────────────────────────── */}
				<div className="flex-1 overflow-y-auto">
					{tab === "curated" ? (
						<div className="px-6 py-4">
							{/* Search + bulk actions */}
							<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
								<div className="relative flex-1">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<input
										type="text"
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										placeholder="Search curated skills..."
										className="w-full rounded-lg border border-border bg-surface/50 py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
									/>
									{search && (
										<button
											aria-label="Clear search"
											type="button"
											onClick={() => setSearch("")}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
										>
											<X className="h-3.5 w-3.5" />
										</button>
									)}
								</div>
								<div className="flex gap-2 shrink-0">
									<button
										type="button"
										onClick={selectAllVisible}
										className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
									>
										Select all
									</button>
									<button
										type="button"
										onClick={deselectAllVisible}
										className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
									>
										Deselect all
									</button>
								</div>
							</div>

							{/* Category chips */}
							<div className="mb-4 flex flex-wrap gap-1.5">
								<button
									type="button"
									onClick={() => setActiveCategory(null)}
									className={cn(
										"rounded-full px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
										!activeCategory
											? "bg-primary/10 text-primary border border-primary/30"
											: "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-transparent",
									)}
								>
									All {curatedSkills.length > 0 && `(${curatedSkills.length})`}
								</button>
								{categories.map((cat) => {
									const count = categorizedSkills.get(cat)?.length ?? 0;
									return (
										<button
											key={cat}
											type="button"
											onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
											className={cn(
												"rounded-full px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
												activeCategory === cat
													? "bg-primary/10 text-primary border border-primary/30"
													: "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-transparent",
											)}
										>
											{cat} ({count})
										</button>
									);
								})}
							</div>

							{/* Skill cards grouped by category */}
							<div className="space-y-5">
								{CATEGORY_ORDER.filter((cat) => groupedFiltered.has(cat)).map((cat) => {
									const skills = groupedFiltered.get(cat);
									if (!skills) return null;
									return (
										<div key={cat}>
											<h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
												{cat} <span className="font-normal">({skills.length})</span>
											</h4>
											<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
												{skills.map((skill) => (
													<CuratedSkillCard
														key={skill.id}
														id={skill.id}
														name={skill.id
															.replace(/-/g, " ")
															.replace(/\b\w/g, (c) => c.toUpperCase())}
														emoji={skill.emoji}
														services={skill.services}
														isSelected={localSelection.has(skill.id)}
														onToggle={toggleSkill}
													/>
												))}
											</div>
										</div>
									);
								})}
							</div>

							{filteredCurated.length === 0 && (
								<div className="py-12 text-center text-sm text-muted-foreground">
									No skills match your search.
								</div>
							)}
						</div>
					) : (
						/* ── Marketplace Tab ──────────────────────────────────── */
						<div className="px-6 py-4">
							<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
								<div className="relative flex-1">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<input
										type="text"
										value={mpQuery}
										onChange={(e) => handleMpQueryChange(e.target.value)}
										placeholder="Search SkillsMP marketplace..."
										className="w-full rounded-lg border border-border bg-surface/50 py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
									/>
									{mpQuery && (
										<button
											aria-label="Clear search"
											type="button"
											onClick={clearMarketplaceSearch}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
										>
											<X className="h-3.5 w-3.5" />
										</button>
									)}
								</div>
								{/* Search mode toggle */}
								<div className="flex shrink-0 rounded-lg border border-border">
									<button
										type="button"
										onClick={() => handleMpSearchModeChange("keyword")}
										className={cn(
											"rounded-l-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative z-10",
											mpSearchMode === "keyword"
												? "bg-primary/10 text-primary"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										<Search className="inline h-3 w-3 mr-1" />
										Keyword
									</button>
									<button
										type="button"
										onClick={() => handleMpSearchModeChange("ai")}
										className={cn(
											"rounded-r-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative z-10 -ml-px",
											mpSearchMode === "ai"
												? "bg-primary/10 text-primary"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										<Sparkles className="inline h-3 w-3 mr-1" />
										AI Search
									</button>
								</div>
							</div>

							{/* Loading state */}
							{mpLoading && (
								<div className="flex items-center justify-center py-12">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
									<span className="ml-2 text-sm text-muted-foreground">Searching SkillsMP...</span>
								</div>
							)}

							{/* Error state */}
							{mpError && (
								<div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center text-sm text-red-500">
									{mpError}
								</div>
							)}

							{/* Empty state */}
							{!mpLoading && !mpError && mpResults.length === 0 && (
								<div className="py-12 text-center">
									<Globe className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
									<p className="text-sm text-muted-foreground">
										{mpQuery
											? "No skills found — try different keywords"
											: "Search the SkillsMP marketplace for community skills"}
									</p>
									<p className="mt-1 text-xs text-muted-foreground/60">
										Powered by{" "}
										<a
											href="https://skillsmp.com"
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm px-1"
										>
											skillsmp.com
											<ExternalLink className="ml-0.5 inline h-2.5 w-2.5" />
										</a>
									</p>
								</div>
							)}

							{/* Results */}
							{!mpLoading && mpResults.length > 0 && (
								<div className="grid gap-2 sm:grid-cols-2">
									{mpResults.map((skill) => (
										<MarketplaceSkillCard
											key={skill.id}
											id={skill.id}
											name={skill.name}
											description={skill.description}
											stars={skill.stars}
											author={skill.author}
											isSelected={localSelection.has(skill.id)}
											onToggle={toggleSkill}
										/>
									))}
								</div>
							)}
						</div>
					)}
				</div>

				{/* ── Footer ─────────────────────────────────────────────── */}
				<div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-6 py-4 gap-4">
					<p className="text-xs text-muted-foreground">
						{localSelection.size} skill{localSelection.size !== 1 ? "s" : ""} selected
					</p>
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 sm:flex-none rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleApply}
							className="flex-1 sm:flex-none rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							Apply Selection
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
