"use client";

import { motion } from "framer-motion";
import { Bot, Globe, LayoutDashboard, Package, Terminal } from "lucide-react";

/* ── Feature Data ──────────────────────────────────────────────────────────── */
function getFeatures(serviceCount: number) {
	const additionalCount = Math.max(0, serviceCount - 7);

	return [
		{
			colSpan: "lg:col-span-2",
			icon: Terminal,
			title: "Interactive CLI",
			description:
				"Build your stack interactively. Our wizard handles dependency resolution, secret generation, and configuration for you.",
			bg: "bg-gradient-to-br from-surface to-background",
		},
		{
			colSpan: "lg:col-span-1",
			icon: Globe,
			title: "REST API",
			description: "Programmatic generation for CI/CD pipelines.",
			bg: "bg-surface",
		},
		{
			colSpan: "lg:col-span-1",
			icon: LayoutDashboard,
			title: "Visual Builder",
			description: "Drag-and-drop service selection with instant preview.",
			bg: "bg-surface",
		},
		{
			colSpan: "lg:col-span-2",
			icon: Bot,
			title: "AI Coding Agents",
			description:
				"First-class support for running autonomous agents. Pre-configured environments for Claude Code, OpenCode, and Gemini - sandboxed and ready to code.",
			bg: "bg-gradient-to-tr from-primary/5 via-surface to-surface",
		},
		{
			colSpan: "lg:col-span-3",
			icon: Package,
			title: `${serviceCount}+ Production-Ready Services`,
			description:
				"Databases (Postgres, Redis, Qdrant), Browsers (Steel, Browserless), Workflow Engines (n8n, Activepieces), Media (FFmpeg), and more. All wired together with correct networking and secrets.",
			bg: "bg-surface border-primary/20",
			extra: (
				<div className="mt-4 flex flex-wrap gap-2">
					{["Postgres", "Redis", "Qdrant", "n8n", "Browserless", "Ollama", "vLLM"].map((tag) => (
						<span
							key={tag}
							className="rounded-md bg-background/50 px-2 py-1 text-xs font-mono text-muted-foreground border border-border/50"
						>
							{tag}
						</span>
					))}
					<span className="text-xs text-muted-foreground py-1">+{additionalCount} more</span>
				</div>
			),
		},
	];
}

/* ── Animation Variants ────────────────────────────────────────────────────── */
const container = {
	hidden: {},
	show: { transition: { staggerChildren: 0.1 } },
};

const item = {
	hidden: { opacity: 0, y: 20 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.5, ease: "easeOut" as const },
	},
};

/* ── Component ─────────────────────────────────────────────────────────────── */
interface FeaturesGridAlternativeProps {
	serviceCount?: number;
}

export function FeaturesGridAlternative({ serviceCount = 186 }: FeaturesGridAlternativeProps) {
	const features = getFeatures(serviceCount);

	return (
		<section id="features" className="py-24 relative overflow-hidden">
			{/* Background decoration */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />

			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="mb-16 text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
						The Ultimate <span className="text-primary">Agent Infrastructure</span>
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
						Everything you need to run sophisticated AI agents on your own hardware, orchestrated
						seamlessly.
					</p>
				</div>

				<motion.div
					variants={container}
					initial="hidden"
					whileInView="show"
					viewport={{ once: true, amount: 0.1 }}
					className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[minmax(180px,auto)]"
				>
					{features.map((f, _i) => {
						const Icon = f.icon;
						return (
							<motion.div
								key={f.title}
								variants={item}
								className={`group relative overflow-hidden rounded-2xl border border-border p-6 hover:border-primary/40 transition-colors ${f.colSpan} ${f.bg}`}
							>
								<div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-background/80 shadow-sm ring-1 ring-border">
									<Icon className="h-5 w-5 text-primary" />
								</div>

								<h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
									{f.title}
								</h3>

								<p className="mt-2 text-sm text-muted-foreground leading-relaxed">
									{f.description}
								</p>

								{f.extra}

								{/* Hover shine effect */}
								<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:animate-shimmer" />
							</motion.div>
						);
					})}
				</motion.div>
			</div>
		</section>
	);
}
