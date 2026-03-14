"use client";

import { motion } from "framer-motion";
import { Database, Layers, Shield, TerminalSquare } from "lucide-react";
import Link from "next/link";

const features = [
	{
		id: "01",
		icon: TerminalSquare,
		title: "STACK GENERATION",
		description:
			"Instant provisioning of 94+ companion services across 8 agent frameworks with automated docker-compose configurations.",
	},
	{
		id: "02",
		icon: Layers,
		title: "SKILL INTEGRATION",
		description:
			"Pre-wired skill packs injecting core capabilities directly into your autonomous agents in sub-millisecond timeframes.",
	},
	{
		id: "03",
		icon: Shield,
		title: "PRODUCTION READY",
		description:
			"Secure-by-default environment with automated network isolation, persistent volume management, and TLS-ready ingress.",
	},
	{
		id: "04",
		icon: Database,
		title: "OPEN INFRASTRUCTURE",
		description:
			"100% open-source architecture ensuring zero vendor lock-in and complete data sovereignty for enterprise stacks.",
	},
];

const container = {
	hidden: { opacity: 0 },
	show: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const card = {
	hidden: { opacity: 0, y: 30 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
	},
};

export function FeaturesGrid() {
	return (
		<section className="relative w-full py-20 lg:py-32 overflow-hidden border-t border-border/50">
			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Header Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
					className="mb-16 flex flex-col gap-4"
				>
					<div className="flex items-center gap-3">
						<span
							className="h-2 w-2 bg-primary"
							style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
						/>
						<span className="font-mono text-xs tracking-widest text-primary uppercase">
							CORE_CAPABILITIES
						</span>
					</div>

					<h2 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
						INFRASTRUCTURE <span className="text-muted-foreground/60">PRIMITIVES</span>
					</h2>

					<p className="max-w-xl text-base leading-relaxed text-muted-foreground mt-2">
						The four pillars of the better-openclaw engine. Modular, scalable, and secure by design.
					</p>

					<div className="absolute right-8 top-32 hidden lg:block">
						<Link
							href="/docs"
							className="group font-mono text-[9px] tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
						>
							EXPLORE ALL FEATURES
							<span className="ml-1 inline-block transition-transform group-hover:translate-x-1">
								&rarr;
							</span>
						</Link>
					</div>
				</motion.div>

				{/* 4 Pillar Grid */}
				<motion.div
					variants={container}
					initial="hidden"
					whileInView="show"
					viewport={{ once: true, amount: 0.2 }}
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
				>
					{features.map((f, i) => {
						const Icon = f.icon;
						return (
							<motion.div
								key={f.id}
								variants={card}
								whileHover={{
									y: -4,
									transition: { duration: 0.3 },
								}}
								className={`group relative flex min-h-[360px] flex-col justify-between border-border/50 bg-background/40 p-8 backdrop-blur-sm transition-all duration-500 hover:bg-secondary/60
									${i === 0 ? "border border-r-0 lg:border-r" : ""}
									${i > 0 && i < 3 ? "border-y border-r-0 lg:border-r lg:border-l-0" : ""}
									${i === 3 ? "border lg:border-l-0" : ""}
								`}
								style={{ animation: `border-breathe 8s ease-in-out infinite ${i * 2}s` }}
							>
								{/* Hover Glow Edge Effect */}
								<div className="absolute left-0 top-0 h-full w-px bg-primary opacity-0 transition-opacity duration-500 group-hover:opacity-100 shadow-[0_0_12px_rgba(163,135,95,0.8)]" />

								{/* Scan line on hover */}
								<div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
									<div
										className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent"
										style={{ animation: "scan-line 4s linear infinite" }}
									/>
								</div>

								<div>
									{/* Top Row: Fig Label + Icon */}
									<div className="mb-8 flex items-center justify-between">
										<div className="flex px-2 py-1 border border-border rounded-sm transition-colors duration-300 group-hover:border-primary/30">
											<span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
												FIG. {f.id}
											</span>
										</div>
										<Icon className="h-4 w-4 text-muted-foreground/60 transition-all duration-500 group-hover:text-primary group-hover:drop-shadow-[0_0_8px_rgba(163,135,95,0.5)]" />
									</div>

									<h3 className="mb-4 font-sans text-base font-bold uppercase tracking-wide text-foreground transition-colors group-hover:text-primary/90">
										{f.title}
									</h3>

									<p className="font-mono text-xs leading-relaxed text-muted-foreground transition-colors group-hover:text-muted-foreground/80">
										{f.description}
									</p>
								</div>

								{/* Bottom Link */}
								<div className="mt-8">
									<Link
										href="/docs"
										className="group/link font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60 transition-colors group-hover:text-foreground"
									>
										READ SPECS
										<span className="ml-1 inline-block transition-transform group-hover/link:translate-x-1">
											&rarr;
										</span>
									</Link>
								</div>
							</motion.div>
						);
					})}
				</motion.div>
			</div>
		</section>
	);
}
