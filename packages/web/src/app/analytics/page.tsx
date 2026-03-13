import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

export const metadata = {
	title: "Analytics",
	description:
		"Anonymous usage analytics for better-openclaw — see which services, presets, and platforms are most popular.",
	openGraph: {
		title: "Analytics | better-openclaw",
		description:
			"Explore anonymous usage metrics — popular services, presets, deployment targets, and more.",
		url: "https://better-openclaw.dev/analytics",
		type: "website",
	},
	alternates: { canonical: "https://better-openclaw.dev/analytics" },
};

async function fetchStats() {
	const apiBase =
		process.env.NEXT_PUBLIC_API_URL ||
		(process.env.NODE_ENV === "production"
			? "https://better-openclaw.dev/api/v1"
			: "http://localhost:3456/api/v1");

	try {
		const res = await fetch(`${apiBase}/analytics/stats`, {
			next: { revalidate: 300 },
		});
		if (!res.ok) return null;
		return res.json();
	} catch {
		return null;
	}
}

export default async function AnalyticsPage() {
	const stats = await fetchStats();

	return (
		<>
			<Navbar />
			<main className="min-h-screen bg-background pt-24 pb-16">
				<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-12">
						<div className="flex items-center gap-3 mb-4">
							<div className="h-px w-10 bg-primary/50" />
							<span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
								SYSTEM_TELEMETRY
							</span>
						</div>
						<h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
							Analytics
						</h1>
						<p className="mt-4 max-w-2xl text-lg text-muted-foreground">
							Anonymous usage metrics from better-openclaw stack generations across CLI, web, API,
							and MCP.
						</p>
					</div>

					{stats ? (
						<AnalyticsDashboard stats={stats} />
					) : (
						<div className="flex flex-col items-center justify-center py-24 text-center">
							<span className="font-mono text-sm text-muted-foreground">NO_DATA_AVAILABLE</span>
							<p className="mt-2 text-muted-foreground">
								Analytics data will appear here once stacks are generated.
							</p>
						</div>
					)}

					{/* Privacy note */}
					<div className="mt-16 border-t border-border/50 pt-8 text-center">
						<p className="font-mono text-xs text-muted-foreground/60">
							All analytics are anonymous. No PII is collected. Opt-out:{" "}
							<code className="text-primary/60">DISABLE_ANALYTICS=true</code>
						</p>
					</div>
				</div>
			</main>
			<Footer />
		</>
	);
}
