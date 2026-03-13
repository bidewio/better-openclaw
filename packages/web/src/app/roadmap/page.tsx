import { CheckCircle2, CircleDashed, Clock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Roadmap | better-openclaw",
	description: "See what we are building and what is coming next in better-openclaw.",
};

interface RoadmapItem {
	title: string;
	description: string;
	status: "completed" | "current" | "upcoming" | "planned";
	features: string[];
}

const ROADMAP: { quarter: string; items: RoadmapItem[] }[] = [
	{
		quarter: "Q1 2026",
		items: [
			{
				title: "Core Infrastructure Engine",
				description:
					"The foundation of better-openclaw. A robust engine capable of generating complex Docker Compose stacks in seconds.",
				status: "completed",
				features: [
					"90+ Service Catalog across 21 categories",
					"Interactive CLI Wizard with dependency resolution",
					"REST API for programmatic stack generation",
					"Web Builder UI with live preview",
				],
			},
		],
	},
	{
		quarter: "Q2 2026",
		items: [
			{
				title: "User Experience & Persistence",
				description:
					"Moving from stateless generation to stateful user accounts, enabling cloud saves and community sharing.",
				status: "current",
				features: [
					"User Accounts via Better-Auth (Email, Magic Link, Passkeys)",
					"Cloud Save & Favorite Stacks in PostgreSQL",
					"Transactional emails via Unsend",
					"Animated Data Visualization in Blog Posts",
				],
			},
			{
				title: "Sandboxed AI Code Execution",
				description:
					"Enabling AI agents to execute code safely in isolated containers with OpenSandbox integration, supporting multi-language runtimes and VNC desktop preview.",
				status: "current",
				features: [
					"OpenSandbox service with gVisor secure runtime and Docker socket management",
					"Multi-language sandboxes (Python, JS/TS, Java, Go, Bash) with resource limits",
					"VNC desktop preview for live GUI sandboxes (XFCE, Chrome, VS Code Web)",
					"Pre-pull image system with 3-tier priority for optimized deployment",
				],
			},
		],
	},
	{
		quarter: "Q3 2026",
		items: [
			{
				title: "Enterprise Deployments",
				description:
					"Bridging the gap between homelabs and enterprise production with advanced deployment targets and native execution.",
				status: "upcoming",
				features: [
					"Native Bare-Metal Recipes (PostgreSQL, Caddy, Redis)",
					"Team Collaboration (Organization Stacks)",
					"Advanced Deployment Targets (AWS ECS, Kubernetes)",
					"Distributed Environment Variables UI",
				],
			},
		],
	},
	{
		quarter: "Q4 2026",
		items: [
			{
				title: "Platform Extensibility",
				description:
					"Empowering developers to extend the better-openclaw ecosystem with their own custom logic and automated backups.",
				status: "planned",
				features: [
					"Automated Stack Backups to MinIO/S3",
					"Custom Skill Pack Builder GUI",
					"AI-Driven Stack Optimization Suggestions",
					"Community Plugin Marketplace",
				],
			},
		],
	},
];

const StatusIcon = ({ status }: { status: RoadmapItem["status"] }) => {
	switch (status) {
		case "completed":
			return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
		case "current":
			return (
				<div className="relative flex h-5 w-5 items-center justify-center">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75"></span>
					<div className="relative h-3 w-3 rounded-full bg-primary shadow-[0_0_10px_rgba(204,136,51,0.8)]"></div>
				</div>
			);
		case "upcoming":
			return <Clock className="h-5 w-5 text-blue-400" />;
		case "planned":
			return <CircleDashed className="h-5 w-5 text-muted-foreground" />;
	}
};

const StatusBadge = ({ status }: { status: RoadmapItem["status"] }) => {
	switch (status) {
		case "completed":
			return (
				<span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
					Completed
				</span>
			);
		case "current":
			return (
				<span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
					In Progress
				</span>
			);
		case "upcoming":
			return (
				<span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
					Upcoming
				</span>
			);
		case "planned":
			return (
				<span className="inline-flex items-center rounded-full bg-secondary/30 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
					Planned
				</span>
			);
	}
};

export default function RoadmapPage() {
	return (
		<main className="relative min-h-screen bg-background text-foreground pt-24 pb-32">
			{/* Grid Background Override */}
			<div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-size-[32px_32px]" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(204,136,51,0.15)_0%,transparent_70%)] blur-[80px] pointer-events-none" />

			<div className="relative z-10 mx-auto max-w-5xl px-6 lg:px-8">
				<div className="text-center mb-20">
					<h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
						The{" "}
						<span className="bg-gradient-to-r from-amber-200 to-primary bg-clip-text text-transparent">
							Roadmap
						</span>
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
						A transparent look at what we've built, what we're working on, and where better-openclaw
						is heading. Our goal is to build the ultimate open-source, vendor-agnostic stack
						builder.
					</p>
				</div>

				<div className="relative border-l border-border/50 ml-4 md:ml-8 pl-8 md:pl-16 space-y-24">
					{ROADMAP.map((quarterData, _qIdx) => (
						<div key={quarterData.quarter} className="relative">
							{/* Quarter Marker Line */}
							<div className="absolute -left-[33px] md:-left-[65px] top-2 flex items-center justify-center bg-background p-1">
								<div className="h-3 w-3 rounded-full border-2 border-primary bg-background shadow-[0_0_8px_rgba(204,136,51,0.5)]" />
							</div>

							<h2 className="text-2xl font-bold font-mono text-foreground mb-8">
								{quarterData.quarter}
							</h2>

							<div className="grid gap-8">
								{quarterData.items.map((item, _iIdx) => (
									<div
										key={item.title}
										className="group relative rounded-2xl border border-border/50 bg-[#0a0a0a]/50 p-6 md:p-8 backdrop-blur-sm transition-all hover:bg-secondary/20 hover:border-border overflow-hidden"
									>
										<div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
											<StatusIcon status={item.status} />
										</div>

										<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
											<div className="flex items-center gap-3">
												<h3 className="text-xl font-bold text-foreground">{item.title}</h3>
											</div>
											<StatusBadge status={item.status} />
										</div>

										<p className="text-muted-foreground mb-6 max-w-3xl leading-relaxed">
											{item.description}
										</p>

										<ul className="grid sm:grid-cols-2 gap-3">
											{item.features.map((feature, fIdx) => (
												<li
													key={fIdx}
													className="flex items-start gap-2 text-sm text-foreground/80"
												>
													<div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
													<span>{feature}</span>
												</li>
											))}
										</ul>
									</div>
								))}
							</div>
						</div>
					))}
				</div>

				<div className="mt-32 text-center">
					<div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/50 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
						<span className="relative flex h-2 w-2">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
							<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
						</span>
						Have a feature request? Let us know on{" "}
						<a
							href="https://github.com/bidewio/better-openclaw"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline font-medium"
						>
							GitHub
						</a>
						.
					</div>
				</div>
			</div>
		</main>
	);
}
