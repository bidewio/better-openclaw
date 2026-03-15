/**
 * ObservabilityPage — Agent event timeline, cost tracking, tool usage, and alert rules.
 */

import {
	IconAlertTriangle,
	IconChartBar,
	IconClock,
	IconCoin,
	IconPlus,
	IconToggleLeft,
	IconToggleRight,
	IconTool,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

const EVENT_TYPE_COLORS: Record<string, string> = {
	tool_call: "bg-blue-500/20 text-blue-400",
	error: "bg-red-500/20 text-red-400",
	completion: "bg-green-500/20 text-green-400",
	token_usage: "bg-purple-500/20 text-purple-400",
};

export default function ObservabilityPage() {
	const [timeRange, setTimeRange] = useState(24);
	const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>(undefined);
	const [showAddAlert, setShowAddAlert] = useState(false);

	const metrics = useQuery(api.observability.getAgentMetrics, {
		timeRangeHours: timeRange,
	});
	const events = useQuery(api.observability.listAgentEvents, {
		eventType: eventTypeFilter,
		limit: 50,
	});
	const toolUsage = useQuery(api.observability.getToolUsageBreakdown, {});
	const costTimeline = useQuery(api.observability.getCostTimeline, { days: 7 });
	const alertRules = useQuery(api.observability.listAlertRules);

	const deleteAlert = useMutation(api.observability.deleteAlertRule);
	const upsertAlert = useMutation(api.observability.upsertAlertRule);

	const maxToolCount = toolUsage?.[0]?.count ?? 1;
	const maxDayCost = costTimeline?.reduce((m, d) => Math.max(m, d.costCents), 0) ?? 1;

	return (
		<div className="flex-1 overflow-y-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
					<IconChartBar size={22} />
					Agent Observability
				</h2>
				<select
					title="Time Range"
					className="bg-secondary/50 text-sm rounded-lg px-3 py-1.5 text-foreground border border-border/50"
					value={timeRange}
					onChange={(e) => setTimeRange(Number(e.target.value))}
				>
					<option value={1}>Last hour</option>
					<option value={6}>Last 6 hours</option>
					<option value={24}>Last 24 hours</option>
					<option value={168}>Last 7 days</option>
				</select>
			</div>

			{/* Metric cards */}
			<div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
				<MetricCard
					label="Total Events"
					value={metrics?.totalEvents ?? 0}
					icon={<IconChartBar size={16} />}
				/>
				<MetricCard
					label="Errors"
					value={metrics?.errors ?? 0}
					icon={<IconAlertTriangle size={16} />}
					accent={metrics?.errors ? "text-red-400" : undefined}
				/>
				<MetricCard
					label="Cost"
					value={`$${((metrics?.totalCostCents ?? 0) / 100).toFixed(2)}`}
					icon={<IconCoin size={16} />}
				/>
				<MetricCard
					label="Avg Duration"
					value={`${((metrics?.avgDurationMs ?? 0) / 1000).toFixed(1)}s`}
					icon={<IconClock size={16} />}
				/>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
				{/* Cost Timeline */}
				<section className="bg-secondary/30 rounded-xl p-4 border border-border/30">
					<h3 className="text-sm font-medium text-muted-foreground mb-3">Daily Cost (7d)</h3>
					{costTimeline && costTimeline.length > 0 ? (
						<div className="flex items-end gap-1 h-32">
							{costTimeline.map((d) => (
								<div key={d.date} className="flex-1 flex flex-col items-center gap-1">
									<div
										className="w-full bg-primary/60 rounded-t min-h-[2px] transition-all"
										style={{
											height: `${(d.costCents / (maxDayCost || 1)) * 100}%`,
										}}
										title={`$${(d.costCents / 100).toFixed(2)}`}
									/>
									<span className="text-[10px] text-muted-foreground">{d.date.slice(5)}</span>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground italic">No cost data yet</p>
					)}
				</section>

				{/* Tool Usage */}
				<section className="bg-secondary/30 rounded-xl p-4 border border-border/30">
					<h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
						<IconTool size={14} /> Tool Usage
					</h3>
					{toolUsage && toolUsage.length > 0 ? (
						<div className="space-y-2 max-h-32 overflow-y-auto">
							{toolUsage.slice(0, 10).map((t) => (
								<div key={t.tool} className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground w-28 truncate">{t.tool}</span>
									<div className="flex-1 bg-secondary/50 rounded h-4 overflow-hidden">
										<div
											className="bg-primary/50 h-full rounded transition-all"
											style={{ width: `${(t.count / maxToolCount) * 100}%` }}
										/>
									</div>
									<span className="text-xs text-foreground w-8 text-right">{t.count}</span>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground italic">No tool calls recorded</p>
					)}
				</section>
			</div>

			{/* Event Timeline */}
			<section className="bg-secondary/30 rounded-xl p-4 border border-border/30">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-medium text-muted-foreground">Event Timeline</h3>
					<div className="flex gap-1">
						{["all", "tool_call", "error", "completion"].map((type) => (
							<button
								key={type}
								type="button"
								onClick={() => setEventTypeFilter(type === "all" ? undefined : type)}
								className={`px-2 py-1 rounded text-xs transition-colors ${
									(type === "all" && !eventTypeFilter) || eventTypeFilter === type
										? "bg-primary/20 text-primary"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{type === "all" ? "All" : type.replace("_", " ")}
							</button>
						))}
					</div>
				</div>
				<div className="space-y-1.5 max-h-64 overflow-y-auto">
					{events && events.length > 0 ? (
						events.map((e) => (
							<div
								key={e._id}
								className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/20"
							>
								<span
									className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${EVENT_TYPE_COLORS[e.eventType] ?? "bg-secondary text-foreground"}`}
								>
									{e.eventType}
								</span>
								<span className="text-xs text-foreground flex-1 truncate">
									{e.agentName}
									{e.toolName ? ` → ${e.toolName}` : ""}
									{e.errorMessage ? `: ${e.errorMessage}` : ""}
								</span>
								{e.durationMs != null && (
									<span className="text-[10px] text-muted-foreground">
										{(e.durationMs / 1000).toFixed(1)}s
									</span>
								)}
								{e.costCents != null && e.costCents > 0 && (
									<span className="text-[10px] text-muted-foreground">
										${(e.costCents / 100).toFixed(3)}
									</span>
								)}
								<span className="text-[10px] text-muted-foreground">
									{new Date(e._creationTime).toLocaleTimeString()}
								</span>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground italic py-4 text-center">
							No events recorded yet
						</p>
					)}
				</div>
			</section>

			{/* Alert Rules */}
			<section className="bg-secondary/30 rounded-xl p-4 border border-border/30">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-medium text-muted-foreground">Alert Rules</h3>
					<button
						type="button"
						className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors"
						onClick={() => setShowAddAlert(true)}
					>
						<IconPlus size={14} /> Add Rule
					</button>
				</div>
				<div className="space-y-1.5">
					{alertRules && alertRules.length > 0 ? (
						alertRules.map((rule) => (
							<div
								key={rule._id}
								className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/20"
							>
								<button
									type="button"
									onClick={() =>
										upsertAlert({
											id: rule._id,
											name: rule.name,
											condition: rule.condition,
											threshold: rule.threshold,
											windowMinutes: rule.windowMinutes,
											enabled: !rule.enabled,
										})
									}
									className="text-muted-foreground hover:text-foreground"
								>
									{rule.enabled ? (
										<IconToggleRight size={18} className="text-green-400" />
									) : (
										<IconToggleLeft size={18} />
									)}
								</button>
								<span className="text-sm text-foreground flex-1">{rule.name}</span>
								<span className="text-xs text-muted-foreground">{rule.condition}</span>
								<span className="text-xs text-muted-foreground">threshold: {rule.threshold}</span>
								<span className="text-xs text-muted-foreground">{rule.windowMinutes}m window</span>
								<button
									title="Delete Alert"
									type="button"
									onClick={() => deleteAlert({ id: rule._id })}
									className="p-1 hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-400"
								>
									<IconTrash size={14} />
								</button>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground italic py-2 text-center">
							No alert rules configured
						</p>
					)}
				</div>
			</section>

			{/* Add Alert Modal */}
			{showAddAlert && <AddAlertModal onClose={() => setShowAddAlert(false)} />}
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
	value: string | number;
	icon: React.ReactNode;
	accent?: string;
}) {
	return (
		<div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
			<div className="flex items-center gap-2 text-muted-foreground mb-1">
				{icon}
				<span className="text-xs">{label}</span>
			</div>
			<p className={`text-2xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
		</div>
	);
}

function AddAlertModal({ onClose }: { onClose: () => void }) {
	const upsertAlert = useMutation(api.observability.upsertAlertRule);
	const [name, setName] = useState("");
	const [condition, setCondition] = useState("error_rate");
	const [threshold, setThreshold] = useState(10);
	const [windowMinutes, setWindowMinutes] = useState(60);

	const handleSubmit = async () => {
		if (!name.trim()) return;
		await upsertAlert({
			name,
			condition,
			threshold,
			windowMinutes,
			enabled: true,
		});
		onClose();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onClick={onClose}
		>
			<div
				className="bg-background rounded-xl border border-border p-6 w-full max-w-md space-y-4"
				onClick={(e) => e.stopPropagation()}
			>
				<h3 className="text-lg font-semibold">New Alert Rule</h3>
				<div className="space-y-3">
					<div>
						<label className="text-xs text-muted-foreground block mb-1">Name</label>
						<input
							className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="High error rate"
						/>
					</div>
					<div>
						<label className="text-xs text-muted-foreground block mb-1">Condition</label>
						<select
							title="Condition"
							className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50"
							value={condition}
							onChange={(e) => setCondition(e.target.value)}
						>
							<option value="error_rate">Error Rate (%)</option>
							<option value="cost_exceeds">Cost Exceeds ($)</option>
							<option value="duration_exceeds">Avg Duration Exceeds (s)</option>
							<option value="event_count">Event Count Exceeds</option>
						</select>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-xs text-muted-foreground block mb-1">Threshold</label>
							<input
								title="Threshold"
								type="number"
								className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50"
								value={threshold}
								onChange={(e) => setThreshold(Number(e.target.value))}
							/>
						</div>
						<div>
							<label className="text-xs text-muted-foreground block mb-1">Window (min)</label>
							<input
								title="Window"
								type="number"
								className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50"
								value={windowMinutes}
								onChange={(e) => setWindowMinutes(Number(e.target.value))}
							/>
						</div>
					</div>
				</div>
				<div className="flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						className="px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90"
					>
						Create
					</button>
				</div>
			</div>
		</div>
	);
}
