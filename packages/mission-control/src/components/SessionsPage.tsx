import {
	IconBrain,
	IconCircleCheck,
	IconCoin,
	IconLoader2,
	IconRefresh,
	IconTerminal2,
	IconTool,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

function formatCost(cost: number): string {
	return `$${cost.toFixed(2)}`;
}

function timeAgo(dateStr: string | undefined): string {
	if (!dateStr) return "—";
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function modelShortName(model: string | undefined): string {
	if (!model) return "—";
	if (model.includes("opus")) return "Opus";
	if (model.includes("sonnet")) return "Sonnet";
	if (model.includes("haiku")) return "Haiku";
	return model.split("-").slice(-1)[0] || model;
}

export default function SessionsPage() {
	const sessions = useQuery(api.claudeSessions.listSessions, {});
	const stats = useQuery(api.claudeSessions.getSessionStats);
	const syncSessions = useMutation(api.claudeSessions.syncSessions);

	const [isScanning, setIsScanning] = useState(false);
	const [scanError, setScanError] = useState<string | null>(null);
	const [lastScanTime, setLastScanTime] = useState<number | null>(null);
	const hasAutoScanned = useRef(false);

	const handleScan = useCallback(async () => {
		setIsScanning(true);
		setScanError(null);
		try {
			const res = await fetch("/api/claude-sessions");
			const data = await res.json();
			if (!data.ok) {
				setScanError(data.error || "Scan failed");
				return;
			}
			await syncSessions({ sessions: data.sessions });
			setLastScanTime(Date.now());
		} catch (err: any) {
			setScanError(err.message || "Failed to connect to scanner");
		} finally {
			setIsScanning(false);
		}
	}, [syncSessions]);

	// Auto-scan on mount (once)
	useEffect(() => {
		if (!hasAutoScanned.current) {
			hasAutoScanned.current = true;
			handleScan();
		}
	}, [handleScan]);

	return (
		<div className="p-6 space-y-6 overflow-y-auto h-full">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<IconTerminal2 size={24} className="text-primary" />
					<div>
						<h2 className="text-lg font-semibold text-foreground">Claude Code Sessions</h2>
						<p className="text-xs text-muted-foreground">
							Local session tracking from ~/.claude/projects/
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					{lastScanTime && (
						<span className="text-xs text-muted-foreground">
							Scanned {timeAgo(new Date(lastScanTime).toISOString())}
						</span>
					)}
					<button
						type="button"
						onClick={handleScan}
						disabled={isScanning}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
					>
						{isScanning ? (
							<IconLoader2 size={16} className="animate-spin" />
						) : (
							<IconRefresh size={16} />
						)}
						{isScanning ? "Scanning..." : "Scan Now"}
					</button>
				</div>
			</div>

			{scanError && (
				<div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md px-4 py-2 text-sm">
					{scanError}
				</div>
			)}

			{/* Metric Cards */}
			{stats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<MetricCard
						label="Total Sessions"
						value={stats.totalSessions.toString()}
						icon={<IconTerminal2 size={18} />}
						accent="text-[var(--accent-blue)]"
					/>
					<MetricCard
						label="Active Now"
						value={stats.activeSessions.toString()}
						icon={<IconCircleCheck size={18} />}
						accent="text-[var(--accent-green)]"
					/>
					<MetricCard
						label="Total Cost"
						value={formatCost(stats.totalCost)}
						icon={<IconCoin size={18} />}
						accent="text-[var(--accent-orange)]"
					/>
					<MetricCard
						label="Tool Uses"
						value={formatNumber(stats.totalToolUses)}
						icon={<IconTool size={18} />}
						accent="text-[var(--accent-brown)]"
					/>
				</div>
			)}

			{/* Sessions Table */}
			<div className="bg-card rounded-lg border border-border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border bg-secondary/30">
								<th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
								<th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
								<th className="text-left px-4 py-3 font-medium text-muted-foreground">Model</th>
								<th className="text-left px-4 py-3 font-medium text-muted-foreground">Branch</th>
								<th className="text-right px-4 py-3 font-medium text-muted-foreground">Messages</th>
								<th className="text-right px-4 py-3 font-medium text-muted-foreground">Tokens</th>
								<th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost</th>
								<th className="text-right px-4 py-3 font-medium text-muted-foreground">
									Last Active
								</th>
							</tr>
						</thead>
						<tbody>
							{sessions === undefined && (
								<tr>
									<td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
										<IconLoader2 size={20} className="animate-spin inline mr-2" />
										Loading sessions...
									</td>
								</tr>
							)}
							{sessions && sessions.length === 0 && (
								<tr>
									<td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
										No sessions found. Click "Scan Now" to discover local Claude Code sessions.
									</td>
								</tr>
							)}
							{sessions?.map((session) => (
								<tr
									key={session._id}
									className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
								>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
												session.isActive
													? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
													: "bg-secondary text-muted-foreground"
											}`}
										>
											<span
												className={`w-1.5 h-1.5 rounded-full ${
													session.isActive ? "bg-[var(--accent-green)]" : "bg-muted-foreground/50"
												}`}
											/>
											{session.isActive ? "Active" : "Idle"}
										</span>
									</td>
									<td className="px-4 py-3">
										<div className="font-medium text-foreground truncate max-w-[200px]">
											{decodeURIComponent(session.projectSlug.replace(/-/g, "/"))}
										</div>
										{session.lastUserPrompt && (
											<div className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">
												{session.lastUserPrompt.slice(0, 80)}
												{session.lastUserPrompt.length > 80 ? "..." : ""}
											</div>
										)}
									</td>
									<td className="px-4 py-3">
										<span className="inline-flex items-center gap-1 text-xs">
											<IconBrain size={14} className="text-muted-foreground" />
											{modelShortName(session.model ?? undefined)}
										</span>
									</td>
									<td className="px-4 py-3 text-xs text-muted-foreground">
										{session.gitBranch || "—"}
									</td>
									<td className="px-4 py-3 text-right tabular-nums">
										<span className="text-foreground">{session.userMessages}</span>
										<span className="text-muted-foreground mx-1">/</span>
										<span className="text-muted-foreground">{session.assistantMessages}</span>
									</td>
									<td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
										{formatNumber(session.inputTokens + session.outputTokens)}
									</td>
									<td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--accent-orange)]">
										{formatCost(session.estimatedCost)}
									</td>
									<td className="px-4 py-3 text-right text-xs text-muted-foreground">
										{timeAgo(session.lastMessageAt ?? undefined)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

function MetricCard({
	label,
	value,
	icon,
	accent,
}: {
	label: string;
	value: string;
	icon: React.ReactNode;
	accent: string;
}) {
	return (
		<div className="bg-card rounded-lg border border-border p-4">
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs text-muted-foreground font-medium">{label}</span>
				<span className={accent}>{icon}</span>
			</div>
			<p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
		</div>
	);
}
