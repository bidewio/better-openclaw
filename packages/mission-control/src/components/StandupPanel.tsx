import {
	IconAlertTriangle,
	IconCheck,
	IconClock,
	IconLoader2,
	IconPlayerPlay,
	IconReport,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../convex/_generated/api";

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

export default function StandupPanel() {
	const [view, setView] = useState<"current" | "history">("current");
	const [isGenerating, setIsGenerating] = useState(false);
	const reports = useQuery(api.standup.listReports, { limit: 10 });
	const generateStandup = useMutation(api.standup.generateStandup);

	const handleGenerate = useCallback(async () => {
		setIsGenerating(true);
		try {
			await generateStandup({});
		} finally {
			setIsGenerating(false);
		}
	}, [generateStandup]);

	const latestReport = reports?.[0];

	return (
		<div className="p-6 space-y-6 overflow-y-auto h-full">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<IconReport size={24} className="text-primary" />
					<div>
						<h2 className="text-lg font-semibold text-foreground">Daily Standup</h2>
						<p className="text-xs text-muted-foreground">Generate and review daily team reports</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
						<button
							type="button"
							onClick={() => setView("current")}
							className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
								view === "current"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							Current
						</button>
						<button
							type="button"
							onClick={() => setView("history")}
							className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
								view === "history"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							History
						</button>
					</div>
					<button
						type="button"
						onClick={handleGenerate}
						disabled={isGenerating}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
					>
						{isGenerating ? (
							<IconLoader2 size={16} className="animate-spin" />
						) : (
							<IconPlayerPlay size={16} />
						)}
						Generate
					</button>
				</div>
			</div>

			{view === "current" && latestReport && <StandupReport report={latestReport} />}

			{view === "current" && !latestReport && (
				<div className="bg-card rounded-lg border border-border p-8 text-center">
					<IconReport size={32} className="mx-auto text-muted-foreground/40 mb-3" />
					<p className="text-sm text-muted-foreground">
						No standup reports yet. Click "Generate" to create one.
					</p>
				</div>
			)}

			{view === "history" && (
				<div className="space-y-4">
					{reports === undefined && (
						<div className="flex items-center justify-center py-8 text-muted-foreground">
							<IconLoader2 size={16} className="animate-spin mr-2" />
							Loading reports...
						</div>
					)}
					{reports?.length === 0 && (
						<div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
							No reports generated yet.
						</div>
					)}
					{reports?.map((report) => (
						<StandupReport key={report._id} report={report} />
					))}
				</div>
			)}
		</div>
	);
}

function StandupReport({ report }: { report: any }) {
	const { summary, agentReports, teamAccomplishments, teamBlockers } = report;

	return (
		<div className="space-y-4">
			{/* Summary Cards */}
			<div className="bg-card rounded-lg border border-border p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-medium text-foreground">{report.date}</h3>
					<span className="text-xs text-muted-foreground">
						Generated {formatDate(report.generatedAt)}
					</span>
				</div>
				<div className="grid grid-cols-3 md:grid-cols-6 gap-3">
					<StatBadge label="Agents" value={summary.totalAgents} color="text-[var(--accent-blue)]" />
					<StatBadge
						label="Completed"
						value={summary.totalCompleted}
						color="text-[var(--accent-green)]"
					/>
					<StatBadge
						label="In Progress"
						value={summary.totalInProgress}
						color="text-[var(--accent-orange)]"
					/>
					<StatBadge label="Assigned" value={summary.totalAssigned} color="text-muted-foreground" />
					<StatBadge
						label="In Review"
						value={summary.totalReview}
						color="text-[var(--accent-blue)]"
					/>
					<StatBadge label="Blocked" value={summary.totalBlocked} color="text-destructive" />
				</div>
			</div>

			{/* Team Accomplishments */}
			{teamAccomplishments.length > 0 && (
				<div className="bg-card rounded-lg border border-border p-4">
					<h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
						<IconCheck size={16} className="text-[var(--accent-green)]" />
						Completed Today
					</h4>
					<ul className="space-y-1">
						{teamAccomplishments.map((task: any, i: number) => (
							<li
								key={task.id || i}
								className="text-sm text-muted-foreground flex items-start gap-2"
							>
								<span className="text-[var(--accent-green)] mt-0.5">+</span>
								{task.title}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Team Blockers */}
			{teamBlockers.length > 0 && (
				<div className="bg-card rounded-lg border border-border p-4">
					<h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
						<IconAlertTriangle size={16} className="text-destructive" />
						Blockers
					</h4>
					<ul className="space-y-1">
						{teamBlockers.map((task: any, i: number) => (
							<li
								key={task.id || i}
								className="text-sm text-muted-foreground flex items-start gap-2"
							>
								<span className="text-destructive mt-0.5">!</span>
								{task.title}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Agent Reports */}
			{agentReports.length > 0 && (
				<div className="bg-card rounded-lg border border-border p-4">
					<h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
						<IconClock size={16} className="text-[var(--accent-blue)]" />
						Per-Agent Breakdown
					</h4>
					<div className="space-y-3">
						{agentReports.map((ar: any) => (
							<div key={ar.agent.name} className="border border-border/50 rounded-md p-3">
								<div className="flex items-center gap-2 mb-2">
									<span>{ar.agent.avatar}</span>
									<span className="text-sm font-medium text-foreground">{ar.agent.name}</span>
									<span className="text-xs text-muted-foreground">({ar.agent.role})</span>
									<span
										className={`text-xs px-1.5 py-0.5 rounded-full ${
											ar.agent.status === "active"
												? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
												: ar.agent.status === "blocked"
													? "bg-destructive/15 text-destructive"
													: "bg-secondary text-muted-foreground"
										}`}
									>
										{ar.agent.status}
									</span>
								</div>
								<div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
									{ar.completedToday.length > 0 && (
										<span className="text-[var(--accent-green)]">
											{ar.completedToday.length} done
										</span>
									)}
									{ar.inProgress.length > 0 && (
										<span className="text-[var(--accent-orange)]">
											{ar.inProgress.length} in progress
										</span>
									)}
									{ar.review.length > 0 && (
										<span className="text-[var(--accent-blue)]">{ar.review.length} in review</span>
									)}
									{ar.blocked.length > 0 && (
										<span className="text-destructive">{ar.blocked.length} blocked</span>
									)}
									<span>{ar.activityCount} activities</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
	return (
		<div className="text-center">
			<p className={`text-xl font-semibold tabular-nums ${color}`}>{value}</p>
			<p className="text-xs text-muted-foreground">{label}</p>
		</div>
	);
}
