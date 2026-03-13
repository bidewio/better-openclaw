import {
	IconFileText,
	IconLoader2,
	IconMessage,
	IconSearch,
	IconSparkles,
	IconTargetArrow,
	IconX,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
	agent: {
		icon: <IconSparkles size={14} />,
		color: "text-[var(--accent-blue)]",
		label: "Agent",
	},
	task: {
		icon: <IconTargetArrow size={14} />,
		color: "text-[var(--accent-orange)]",
		label: "Task",
	},
	document: {
		icon: <IconFileText size={14} />,
		color: "text-[var(--accent-green)]",
		label: "Document",
	},
	activity: {
		icon: <IconMessage size={14} />,
		color: "text-muted-foreground",
		label: "Activity",
	},
};

interface SearchOverlayProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const results = useQuery(
		api.search.globalSearch,
		query.length >= 2 ? { query, limit: 20 } : "skip",
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		},
		[onClose],
	);

	useEffect(() => {
		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
			// Focus input after short delay for transition
			const timer = setTimeout(() => inputRef.current?.focus(), 50);
			return () => {
				document.removeEventListener("keydown", handleKeyDown);
				clearTimeout(timer);
			};
		}
		// Reset query when closed
		setQuery("");
	}, [isOpen, handleKeyDown]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Dialog */}
			<div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
				{/* Search Input */}
				<div className="flex items-center gap-3 px-4 py-3 border-b border-border">
					<IconSearch size={18} className="text-muted-foreground shrink-0" />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search agents, tasks, documents..."
						className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
					/>
					{query.length > 0 && (
						<button
							title="Clear search"
							type="button"
							onClick={() => setQuery("")}
							className="p-1 hover:bg-secondary rounded text-muted-foreground"
						>
							<IconX size={14} />
						</button>
					)}
					<kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-secondary rounded border border-border/50">
						ESC
					</kbd>
				</div>

				{/* Results */}
				<div className="max-h-[360px] overflow-y-auto">
					{query.length < 2 && (
						<div className="px-4 py-8 text-center text-sm text-muted-foreground">
							Type at least 2 characters to search
						</div>
					)}

					{query.length >= 2 && results === undefined && (
						<div className="flex items-center justify-center py-8 text-muted-foreground">
							<IconLoader2 size={16} className="animate-spin mr-2" />
							<span className="text-sm">Searching...</span>
						</div>
					)}

					{query.length >= 2 && results !== undefined && results.length === 0 && (
						<div className="px-4 py-8 text-center text-sm text-muted-foreground">
							No results for "{query}"
						</div>
					)}

					{results &&
						results.length > 0 &&
						results.map((result) => {
							const config = TYPE_CONFIG[result.type] || TYPE_CONFIG.activity;
							return (
								<button
									key={result.id}
									type="button"
									onClick={onClose}
									className="w-full text-left px-4 py-2.5 hover:bg-secondary/50 transition-colors flex items-start gap-3 border-b border-border/30 last:border-0"
								>
									<span className={`mt-0.5 ${config?.color}`}>{config?.icon}</span>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium text-foreground truncate">
												{result.title}
											</span>
											<span
												className={`text-[10px] px-1.5 py-0.5 rounded-full bg-secondary ${config?.color}`}
											>
												{config?.label}
											</span>
										</div>
										{result.subtitle && (
											<span className="text-xs text-muted-foreground">{result.subtitle}</span>
										)}
										{result.excerpt && (
											<p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">
												{result.excerpt}
											</p>
										)}
									</div>
								</button>
							);
						})}
				</div>

				{/* Footer */}
				{results && results.length > 0 && (
					<div className="px-4 py-2 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
						{results.length} result{results.length !== 1 ? "s" : ""}
					</div>
				)}
			</div>
		</div>
	);
}
