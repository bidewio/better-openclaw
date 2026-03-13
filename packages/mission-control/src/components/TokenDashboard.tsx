import {
	IconChartBar,
	IconCoin,
	IconLoader2,
	IconStack2,
	IconTrendingUp,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { api } from "../../convex/_generated/api";

type Timeframe = "24h" | "48h" | "7d";

const TIMEFRAME_HOURS: Record<Timeframe, number> = {
	"24h": 24,
	"48h": 48,
	"7d": 168,
};

const CHART_COLORS = [
	"var(--accent-blue)",
	"var(--accent-orange)",
	"var(--accent-green)",
	"var(--accent-red)",
	"var(--accent-brown)",
	"var(--chart-1)",
	"var(--chart-2)",
];

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

function formatCost(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

export default function TokenDashboard() {
	const [timeframe, setTimeframe] = useState<Timeframe>("24h");

	const metrics = useQuery(api.observability.getAgentMetrics, {
		timeRangeHours: TIMEFRAME_HOURS[timeframe],
	});
	const toolUsage = useQuery(api.observability.getToolUsageBreakdown, {});
	const costTimeline = useQuery(api.observability.getCostTimeline, { days: 7 });

	const isLoading = metrics === undefined;

	// Build chart data from tool usage
	const toolChartData = useMemo(() => {
		if (!toolUsage) return [];
		return toolUsage.slice(0, 8).map((t) => ({
			name: t.tool.length > 12 ? `${t.tool.slice(0, 12)}...` : t.tool,
			count: t.count,
			fullName: t.tool,
		}));
	}, [toolUsage]);

	// Cost timeline chart data
	const timelineData = useMemo(() => {
		if (!costTimeline) return [];
		return costTimeline.map((d) => ({
			date: d.date,
			cost: d.costCents / 100,
		}));
	}, [costTimeline]);

	// Model distribution from events (simulated from tool usage for now)
	const modelDistribution = useMemo(() => {
		if (!toolUsage || toolUsage.length === 0) return [];
		// Group by approximate category
		const categories = new Map<string, number>();
		for (const t of toolUsage) {
			const category =
				t.tool.includes("read") || t.tool.includes("Read")
					? "Read Operations"
					: t.tool.includes("write") || t.tool.includes("Write") || t.tool.includes("Edit")
						? "Write Operations"
						: t.tool.includes("search") || t.tool.includes("Grep") || t.tool.includes("Glob")
							? "Search Operations"
							: "Other Tools";
			categories.set(category, (categories.get(category) || 0) + t.count);
		}
		return Array.from(categories.entries()).map(([name, value]) => ({ name, value }));
	}, [toolUsage]);

	return (
		<div className="p-6 space-y-6 overflow-y-auto h-full">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<IconCoin size={24} className="text-primary" />
					<div>
						<h2 className="text-lg font-semibold text-foreground">Token Usage & Costs</h2>
						<p className="text-xs text-muted-foreground">
							Track token consumption and cost across agents
						</p>
					</div>
				</div>
				<div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
					{(["24h", "48h", "7d"] as Timeframe[]).map((tf) => (
						<button
							key={tf}
							type="button"
							onClick={() => setTimeframe(tf)}
							className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
								timeframe === tf
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{tf}
						</button>
					))}
				</div>
			</div>

			{isLoading && (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<IconLoader2 size={20} className="animate-spin mr-2" />
					Loading metrics...
				</div>
			)}

			{metrics && (
				<>
					{/* Metric Cards */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<MetricCard
							label="Total Events"
							value={formatNumber(metrics.totalEvents)}
							icon={<IconStack2 size={18} />}
							accent="text-[var(--accent-blue)]"
						/>
						<MetricCard
							label="Error Count"
							value={formatNumber(metrics.errors)}
							icon={<IconChartBar size={18} />}
							accent="text-destructive"
						/>
						<MetricCard
							label="Total Cost"
							value={formatCost(metrics.totalCostCents)}
							icon={<IconCoin size={18} />}
							accent="text-[var(--accent-orange)]"
						/>
						<MetricCard
							label="Avg Duration"
							value={`${Math.round(metrics.avgDurationMs)}ms`}
							icon={<IconTrendingUp size={18} />}
							accent="text-[var(--accent-green)]"
						/>
					</div>

					{/* Charts Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Cost Timeline */}
						{timelineData.length > 0 && (
							<div className="bg-card rounded-lg border border-border p-4">
								<h3 className="text-sm font-medium text-foreground mb-4">Cost Timeline (7 days)</h3>
								<ResponsiveContainer width="100%" height={200}>
									<LineChart data={timelineData}>
										<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
										<XAxis
											dataKey="date"
											tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
											tickFormatter={(v) => v.slice(5)}
										/>
										<YAxis
											tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
											tickFormatter={(v) => `$${v}`}
										/>
										<Tooltip
											contentStyle={{
												background: "var(--card)",
												border: "1px solid var(--border)",
												borderRadius: 8,
												fontSize: 12,
											}}
											formatter={(value) => [`$${Number(value).toFixed(2)}`, "Cost"]}
										/>
										<Line
											type="monotone"
											dataKey="cost"
											stroke="var(--accent-orange)"
											strokeWidth={2}
											dot={{ r: 3, fill: "var(--accent-orange)" }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}

						{/* Tool Usage Breakdown */}
						{toolChartData.length > 0 && (
							<div className="bg-card rounded-lg border border-border p-4">
								<h3 className="text-sm font-medium text-foreground mb-4">Tool Usage Breakdown</h3>
								<ResponsiveContainer width="100%" height={200}>
									<BarChart data={toolChartData} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
										<XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
										<YAxis
											type="category"
											dataKey="name"
											width={100}
											tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
										/>
										<Tooltip
											contentStyle={{
												background: "var(--card)",
												border: "1px solid var(--border)",
												borderRadius: 8,
												fontSize: 12,
											}}
											formatter={(value, _name, props) => [
												Number(value),
												(props as { payload?: { fullName?: string } }).payload?.fullName ??
													String(_name),
											]}
										/>
										<Bar dataKey="count" radius={[0, 4, 4, 0]}>
											{toolChartData.map((_entry, i) => (
												<Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</div>
						)}

						{/* Operation Distribution */}
						{modelDistribution.length > 0 && (
							<div className="bg-card rounded-lg border border-border p-4">
								<h3 className="text-sm font-medium text-foreground mb-4">Operation Distribution</h3>
								<ResponsiveContainer width="100%" height={200}>
									<PieChart>
										<Pie
											data={modelDistribution}
											cx="50%"
											cy="50%"
											innerRadius={50}
											outerRadius={80}
											paddingAngle={3}
											dataKey="value"
										>
											{modelDistribution.map((_, i) => (
												<Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
											))}
										</Pie>
										<Tooltip
											contentStyle={{
												background: "var(--card)",
												border: "1px solid var(--border)",
												borderRadius: 8,
												fontSize: 12,
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
								<div className="flex flex-wrap gap-3 mt-2 justify-center">
									{modelDistribution.map((item, i) => (
										<div key={item.name} className="flex items-center gap-1.5 text-xs">
											<span
												className="w-2.5 h-2.5 rounded-full"
												style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
											/>
											<span className="text-muted-foreground">{item.name}</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</>
			)}
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
