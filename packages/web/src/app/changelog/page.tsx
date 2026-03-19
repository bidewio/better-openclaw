import { Bug, Rocket, Sparkles, Wrench } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Changelog | better-openclaw",
	description: "Release notes and updates for better-openclaw.",
};

type ChangeType = "feature" | "improvement" | "fix" | "beta";

interface Change {
	type: ChangeType;
	description: string;
}

interface Release {
	version: string;
	date: string;
	title: string;
	changes: Change[];
}

const RELEASES: Release[] = [
	{
		version: "v1.2.0",
		date: "March 2026",
		title: "User Accounts & Cloud Persistence",
		changes: [
			{
				type: "feature",
				description:
					"Added Better-Auth integration with support for Email/Password, Magic Links, and Passkey authentication.",
			},
			{
				type: "feature",
				description:
					"Users can now save their generated architecture stacks to their account to revisit or redeploy later.",
			},
			{
				type: "feature",
				description:
					"Implemented 'Favorites' functionality for easy access to heavily used stacks.",
			},
			{
				type: "feature",
				description:
					"Integrated `usesend-js` for branded transactional emails (Welcome, Reset Password, Magic Links).",
			},
			{
				type: "improvement",
				description:
					"Optimized test suites using `better-auth/testUtils` and in-memory database adapters.",
			},
		],
	},
	{
		version: "v1.1.0",
		date: "March 2026",
		title: "Blog Visual Enhancements & Analytics",
		changes: [
			{
				type: "feature",
				description:
					"Expanded the knowledge base to 40 highly detailed, SEO-optimized blog articles.",
			},
			{
				type: "feature",
				description:
					"Automated the injection of 5 unique, animated SVG infographics across the blog to enrich learning (Architecture, Costs, Data Sovereignty, Workflows, Infrastructure).",
			},
			{
				type: "improvement",
				description:
					"Refactored `blogPosts.ts` into individual, maintainable files for easier editing and extension.",
			},
			{
				type: "feature",
				description:
					"Configured Google Analytics site-wide and added robots.txt + sitemap support.",
			},
			{
				type: "fix",
				description: "Resolved several Hono OpenAPI route handler TypeScript mismatches.",
			},
		],
	},
	{
		version: "v1.0.0",
		date: "February 2026",
		title: "The Initial Release",
		changes: [
			{
				type: "feature",
				description:
					"Launched the initial version of better-openclaw with 94 supported services across 21 categories.",
			},
			{
				type: "feature",
				description: "Interactive CLI Wizard to select services and define configuration options.",
			},
			{
				type: "feature",
				description: "Visual Web Builder UI with live rendering of Docker Compose architecture.",
			},
			{ type: "feature", description: "REST API for programmatic generation of stacks." },
			{
				type: "feature",
				description: "Smart dependency resolution (e.g., n8n auto-wires PostgreSQL).",
			},
			{
				type: "feature",
				description: "Direct one-click deployments to Dokploy and Coolify environments.",
			},
		],
	},
];

const TypeIcon = ({ type }: { type: ChangeType }) => {
	switch (type) {
		case "feature":
			return <Sparkles className="h-4 w-4 text-emerald-400" />;
		case "improvement":
			return <Wrench className="h-4 w-4 text-blue-400" />;
		case "fix":
			return <Bug className="h-4 w-4 text-rose-400" />;
		case "beta":
			return <Rocket className="h-4 w-4 text-amber-400" />;
	}
};

const TypeBadge = ({ type }: { type: ChangeType }) => {
	switch (type) {
		case "feature":
			return (
				<span className="inline-flex items-center rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
					Feature
				</span>
			);
		case "improvement":
			return (
				<span className="inline-flex items-center rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20 uppercase tracking-widest">
					Improvement
				</span>
			);
		case "fix":
			return (
				<span className="inline-flex items-center rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20 uppercase tracking-widest">
					Fix
				</span>
			);
		case "beta":
			return (
				<span className="inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20 uppercase tracking-widest">
					Beta
				</span>
			);
	}
};

export default function ChangelogPage() {
	return (
		<main className="relative min-h-screen bg-background text-foreground pt-24 pb-32">
			{/* Subdued Background Blur */}
			<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] blur-[100px] pointer-events-none" />

			<div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8">
				<div className="mb-20">
					<h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
						Changelog
					</h1>
					<p className="mt-6 text-xl text-muted-foreground">
						New updates, features, and improvements.
					</p>
				</div>

				<div className="space-y-20">
					{RELEASES.map((release, idx) => (
						<div
							key={release.version}
							className="relative grid md:grid-cols-[1fr_3fr] gap-8 md:gap-12"
						>
							{/* Left Sidebar: Version & Date */}
							<div className="md:sticky md:top-32 h-fit">
								<div className="flex items-center gap-3 mb-2">
									<h2 className="text-2xl font-bold font-mono text-foreground">
										{release.version}
									</h2>
								</div>
								<p className="text-sm text-muted-foreground uppercase tracking-widest font-mono">
									{release.date}
								</p>
							</div>

							{/* Right Content: Changes */}
							<div className="relative">
								{/* Only draw linking border if not the last item (desktop only) */}
								{idx !== RELEASES.length - 1 && (
									<div className="hidden md:block absolute -left-[2.5rem] top-8 bottom-0 w-px bg-border/50" />
								)}

								<h3 className="text-2xl font-semibold text-foreground mb-8">{release.title}</h3>

								<div className="space-y-4">
									{release.changes.map((change) => (
										<div
											key={`${change.type}-${change.description}`}
											className="group flex gap-4 p-4 rounded-xl border border-border/30 bg-[#0a0a0a]/30 hover:bg-secondary/20 hover:border-border/50 transition-colors"
										>
											<div className="mt-1 flex-shrink-0">
												<TypeIcon type={change.type} />
											</div>
											<div className="flex flex-col gap-1.5">
												<div className="flex items-center">
													<TypeBadge type={change.type} />
												</div>
												<p className="text-muted-foreground/90 leading-relaxed text-sm">
													{change.description}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="mt-28 border-t border-border/50 pt-16 flex justify-center">
					<p className="text-muted-foreground text-sm font-mono flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
						Follow releases on{" "}
						<a
							href="https://github.com/bidewio/better-openclaw/releases"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline font-bold tracking-wider"
						>
							GitHub
						</a>
					</p>
				</div>
			</div>
		</main>
	);
}
