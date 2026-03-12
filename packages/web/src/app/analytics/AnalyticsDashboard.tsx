"use client";

/* ── Types ────────────────────────────────────────────────────────────────── */

interface CountItem {
	[key: string]: string | number;
}

interface AnalyticsStats {
	totals: {
		totalStacks: number;
		cliCount: number;
		webCount: number;
		apiCount: number;
		mcpCount: number;
		topService: string | null;
		topPreset: string | null;
	};
	timeline: {
		daily: { date: string; count: number }[];
		monthly: { month: string; count: number }[];
	};
	services: {
		topServices: { service: string; count: number }[];
		categories: { category: string; count: number }[];
	};
	presets: { preset: string; count: number }[];
	deployment: {
		targets: { target: string; count: number }[];
		types: { type: string; count: number }[];
		platforms: { platform: string; count: number }[];
		proxies: { proxy: string; count: number }[];
	};
	features: {
		sources: { source: string; count: number }[];
		gpuPercent: number;
		monitoringPercent: number;
		domainPercent: number;
	};
}

/* ── Chart Primitives ─────────────────────────────────────────────────────── */

function MetricCard({
	label,
	value,
	sub,
}: {
	label: string;
	value: string | number;
	sub?: string;
}) {
	return (
		<div className="border border-border/50 bg-background/60 p-6 backdrop-blur-xl">
			<span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
				{label}
			</span>
			<span className="block text-3xl font-bold tracking-tight text-foreground md:text-4xl">
				{value}
			</span>
			{sub && <span className="block mt-1 font-mono text-xs text-muted-foreground/60">{sub}</span>}
		</div>
	);
}

function PercentCard({ label, percent }: { label: string; percent: number }) {
	return (
		<div className="border border-border/50 bg-background/60 p-6 backdrop-blur-xl">
			<span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
				{label}
			</span>
			<span className="block text-3xl font-bold tracking-tight text-foreground">{percent}%</span>
			<div className="mt-3 h-1.5 w-full bg-muted overflow-hidden rounded-sm">
				<div
					className="h-full bg-primary transition-all duration-700"
					style={{ width: `${Math.min(percent, 100)}%` }}
				/>
			</div>
		</div>
	);
}

const BAR_COLORS = [
	"bg-primary",
	"bg-emerald-500",
	"bg-sky-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-violet-500",
	"bg-teal-500",
	"bg-orange-500",
];

function HorizontalBarChart({
	title,
	data,
	labelKey,
	valueKey,
}: {
	title: string;
	data: CountItem[];
	labelKey: string;
	valueKey: string;
}) {
	if (!data || data.length === 0) return null;
	const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

	return (
		<div className="border border-border/50 bg-background/60 p-6 backdrop-blur-xl">
			<span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
				{title}
			</span>
			<div className="flex flex-col gap-3">
				{data.map((item, i) => {
					const val = Number(item[valueKey]) || 0;
					const pct = (val / max) * 100;
					return (
						<div key={String(item[labelKey])} className="flex items-center gap-3">
							<span className="w-28 shrink-0 truncate font-mono text-xs text-foreground/80">
								{String(item[labelKey])}
							</span>
							<div className="flex-1 h-4 bg-muted/50 overflow-hidden rounded-sm">
								<div
									className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]} transition-all duration-700`}
									style={{ width: `${pct}%` }}
								/>
							</div>
							<span className="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">
								{val}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function TimelineChart({
	title,
	data,
	labelKey,
	valueKey,
}: {
	title: string;
	data: CountItem[];
	labelKey: string;
	valueKey: string;
}) {
	if (!data || data.length === 0) return null;
	const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

	return (
		<div className="border border-border/50 bg-background/60 p-6 backdrop-blur-xl">
			<span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
				{title}
			</span>
			<div className="flex items-end gap-1 h-32">
				{data.map((item) => {
					const val = Number(item[valueKey]) || 0;
					const pct = (val / max) * 100;
					const label = String(item[labelKey]);
					const shortLabel = labelKey === "date" ? label.slice(5) : label; // MM-DD or YYYY-MM
					return (
						<div
							key={label}
							className="flex flex-1 flex-col items-center gap-1"
							title={`${label}: ${val}`}
						>
							<span className="font-mono text-[8px] text-muted-foreground/60">
								{val > 0 ? val : ""}
							</span>
							<div
								className="w-full bg-muted/30 rounded-sm flex flex-col justify-end"
								style={{ height: "100px" }}
							>
								<div
									className="w-full bg-primary rounded-sm transition-all duration-500"
									style={{ height: `${Math.max(pct, 2)}%` }}
								/>
							</div>
							<span className="font-mono text-[7px] text-muted-foreground/50 -rotate-45 origin-top-left whitespace-nowrap">
								{shortLabel}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function PieChart({
	title,
	data,
	labelKey,
	valueKey,
}: {
	title: string;
	data: CountItem[];
	labelKey: string;
	valueKey: string;
}) {
	if (!data || data.length === 0) return null;
	const total = data.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0);
	if (total === 0) return null;

	const COLORS = [
		"rgb(163,135,95)",
		"rgb(16,185,129)",
		"rgb(56,189,248)",
		"rgb(245,158,11)",
		"rgb(244,63,94)",
		"rgb(139,92,246)",
		"rgb(20,184,166)",
		"rgb(251,146,60)",
	];

	let cumPercent = 0;
	const segments = data.map((item, i) => {
		const val = Number(item[valueKey]) || 0;
		const pct = (val / total) * 100;
		const start = cumPercent;
		cumPercent += pct;
		return { label: String(item[labelKey]), pct, color: COLORS[i % COLORS.length], start, val };
	});

	const gradient = segments.map((s) => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(", ");

	return (
		<div className="border border-border/50 bg-background/60 p-6 backdrop-blur-xl">
			<span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
				{title}
			</span>
			<div className="flex items-center gap-6">
				<div
					className="h-28 w-28 shrink-0 rounded-full"
					style={{ background: `conic-gradient(${gradient})` }}
				/>
				<div className="flex flex-col gap-1.5">
					{segments.map((s) => (
						<div key={s.label} className="flex items-center gap-2">
							<span
								className="h-2 w-2 rounded-full shrink-0"
								style={{ backgroundColor: s.color }}
							/>
							<span className="font-mono text-xs text-foreground/80">{s.label}</span>
							<span className="font-mono text-[10px] text-muted-foreground/60">
								{s.val} ({s.pct.toFixed(1)}%)
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/* ── Section Header ───────────────────────────────────────────────────────── */

function SectionHeader({ title }: { title: string }) {
	return (
		<div className="flex items-center gap-3 mb-6 mt-12">
			<span className="h-1 w-1 bg-primary" />
			<h2 className="font-mono text-sm uppercase tracking-widest text-foreground/80">{title}</h2>
			<div className="flex-1 h-px bg-border/50" />
		</div>
	);
}

/* ── Main Dashboard ───────────────────────────────────────────────────────── */

export function AnalyticsDashboard({ stats }: { stats: AnalyticsStats }) {
	const { totals, timeline, services, presets, deployment, features } = stats;

	return (
		<div>
			{/* KEY METRICS */}
			<SectionHeader title="KEY_METRICS" />
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard label="Total Stacks" value={totals.totalStacks.toLocaleString()} />
				<MetricCard
					label="CLI / Online"
					value={`${totals.cliCount} / ${totals.webCount}`}
					sub="cli vs web+api"
				/>
				<MetricCard label="Top Service" value={totals.topService ?? "—"} />
				<MetricCard label="Top Preset" value={totals.topPreset ?? "—"} />
			</div>

			{/* TIMELINE */}
			<SectionHeader title="TIMELINE_ANALYSIS" />
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<TimelineChart
					title="Daily Generations (30 days)"
					data={timeline.daily}
					labelKey="date"
					valueKey="count"
				/>
				<TimelineChart
					title="Monthly Trends (12 months)"
					data={timeline.monthly}
					labelKey="month"
					valueKey="count"
				/>
			</div>

			{/* STACK CONFIGURATION */}
			<SectionHeader title="STACK_CONFIGURATION" />
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<HorizontalBarChart
					title="Top Services"
					data={services.topServices}
					labelKey="service"
					valueKey="count"
				/>
				<HorizontalBarChart
					title="Service Categories"
					data={services.categories}
					labelKey="category"
					valueKey="count"
				/>
				<PieChart title="Preset Distribution" data={presets} labelKey="preset" valueKey="count" />
				<PieChart
					title="Source Distribution"
					data={features.sources}
					labelKey="source"
					valueKey="count"
				/>
			</div>

			{/* DEPLOYMENT & PLATFORM */}
			<SectionHeader title="DEPLOYMENT_AND_PLATFORM" />
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<PieChart
					title="Deployment Target"
					data={deployment.targets}
					labelKey="target"
					valueKey="count"
				/>
				<HorizontalBarChart
					title="Platform"
					data={deployment.platforms}
					labelKey="platform"
					valueKey="count"
				/>
				<HorizontalBarChart
					title="Proxy Choice"
					data={deployment.proxies}
					labelKey="proxy"
					valueKey="count"
				/>
				<HorizontalBarChart
					title="Deployment Type"
					data={deployment.types}
					labelKey="type"
					valueKey="count"
				/>
			</div>

			{/* DEV TOOLS & CONFIG */}
			<SectionHeader title="DEV_TOOLS_AND_CONFIG" />
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<PercentCard label="GPU Enabled" percent={features.gpuPercent} />
				<PercentCard label="Monitoring" percent={features.monitoringPercent} />
				<PercentCard label="Domain Configured" percent={features.domainPercent} />
			</div>
		</div>
	);
}
