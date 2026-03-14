"use client";

import type { AgentFramework, AgentFrameworkDefinition } from "@better-openclaw/core";
import { getAllFrameworks } from "@better-openclaw/core";
import { Check } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface FrameworkSelectorProps {
	selectedPrimary: AgentFramework;
	onPrimaryChange: (id: AgentFramework) => void;
	selectedCompanions: Set<AgentFramework>;
	onCompanionsChange: (ids: Set<AgentFramework>) => void;
}

const runtimeBadge: Record<string, { label: string; className: string }> = {
	node: { label: "Node.js", className: "bg-emerald-500/10 text-emerald-500" },
	python: { label: "Python", className: "bg-blue-500/10 text-blue-400" },
	rust: { label: "Rust", className: "bg-orange-500/10 text-orange-400" },
};

function FrameworkCard({
	fw,
	selected,
	onClick,
	showCheck,
}: {
	fw: AgentFrameworkDefinition;
	selected: boolean;
	onClick: () => void;
	showCheck: boolean;
}) {
	const badge = runtimeBadge[fw.runtime] ?? { label: fw.runtime, className: "bg-muted text-muted-foreground" };

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
				selected
					? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(163,135,95,0.15)]"
					: "border-border/50 bg-surface/50 hover:border-border hover:bg-surface",
			)}
		>
			{showCheck && selected && (
				<div className="absolute right-2 top-2">
					<Check className="h-4 w-4 text-primary" />
				</div>
			)}
			<div className="flex items-center gap-2">
				<span className="text-lg">{fw.icon}</span>
				<span className="text-sm font-semibold text-foreground">{fw.name}</span>
			</div>
			<p className="text-xs text-muted-foreground line-clamp-2">{fw.description}</p>
			<span className={cn("mt-auto rounded-full px-2 py-0.5 text-[10px] font-medium", badge.className)}>
				{badge.label}
			</span>
		</button>
	);
}

export function FrameworkSelector({
	selectedPrimary,
	onPrimaryChange,
	selectedCompanions,
	onCompanionsChange,
}: FrameworkSelectorProps) {
	const allFrameworks = useMemo(() => getAllFrameworks(), []);
	const primaryFrameworks = useMemo(() => allFrameworks.filter((fw) => fw.canBePrimary), [allFrameworks]);
	const companionFrameworks = useMemo(
		() => allFrameworks.filter((fw) => fw.canBeCompanion && fw.id !== selectedPrimary),
		[allFrameworks, selectedPrimary],
	);

	const toggleCompanion = (id: AgentFramework) => {
		const next = new Set(selectedCompanions);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		onCompanionsChange(next);
	};

	return (
		<div className="space-y-5">
			{/* Primary Framework */}
			<div>
				<h3 className="text-sm font-semibold text-foreground">Primary Agent Framework</h3>
				<p className="mt-0.5 text-xs text-muted-foreground">
					The main orchestrator for your stack
				</p>
				<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
					{primaryFrameworks.map((fw) => (
						<FrameworkCard
							key={fw.id}
							fw={fw}
							selected={selectedPrimary === fw.id}
							onClick={() => onPrimaryChange(fw.id as AgentFramework)}
							showCheck={false}
						/>
					))}
				</div>
			</div>

			{/* Companion Frameworks */}
			{companionFrameworks.length > 0 && (
				<div>
					<h3 className="text-sm font-semibold text-foreground">Companion Frameworks</h3>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Optional — run additional agents alongside {primaryFrameworks.find((fw) => fw.id === selectedPrimary)?.name ?? "your primary"}
					</p>
					<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
						{companionFrameworks.map((fw) => (
							<FrameworkCard
								key={fw.id}
								fw={fw}
								selected={selectedCompanions.has(fw.id as AgentFramework)}
								onClick={() => toggleCompanion(fw.id as AgentFramework)}
								showCheck={true}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
