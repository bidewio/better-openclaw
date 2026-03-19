"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const ingestionNodes = [
	{ name: "POSTGRES_V15", status: "CONFIGURED" },
	{ name: "QDRANT_VECTOR", status: "SYNC" },
	{ name: "N8N_WORKFLOW", status: "READY" },
];

const logLines = [
	{ ts: "00:01:21", text: 'init_sequence(target="cluster_alpha")', type: "info" },
	{ ts: "00:01:24", text: "allocating_resources... [OK]", type: "success" },
	{ ts: "00:01:25", text: "deploy_agents --mode=autonomous --src=Core", type: "info" },
	{ ts: "00:01:27", text: "WARN: latency_spike in zone_3 (resolved)", type: "warn" },
];

export function CommonSetups() {
	const [throughput, setThroughput] = useState("1.2");
	const [compute, setCompute] = useState(80);
	const [memory, setMemory] = useState(42);
	const logTickerLines = [
		...logLines.map((line) => ({
			...line,
			renderKey: `cycle-a-${line.ts}-${line.text}`,
		})),
		...logLines.map((line) => ({
			...line,
			renderKey: `cycle-b-${line.ts}-${line.text}`,
		})),
	];

	useEffect(() => {
		const interval = setInterval(() => {
			setThroughput((1.0 + Math.random() * 0.5).toFixed(1));
			setCompute(Math.floor(70 + Math.random() * 20));
			setMemory(Math.floor(35 + Math.random() * 20));
		}, 4000);
		return () => clearInterval(interval);
	}, []);

	return (
		<section className="relative w-full py-20 lg:py-32 overflow-hidden border-t border-border/50">
			{/* Ambient Center Glow */}
			<div className="absolute left-1/2 top-1/2 -z-10 h-[500px] w-[800px] -translate-y-1/2 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(163,135,95,0.12)_0%,transparent_60%)] blur-3xl" />

			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Top Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
					className="mb-16"
				>
					<div className="flex items-center gap-3 mb-4">
						<span
							className="h-2 w-2 bg-primary"
							style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
						/>
						<span className="font-mono text-xs tracking-widest text-primary uppercase">
							OPERATIONAL_LOGIC
						</span>
					</div>

					<h2 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
						SYSTEM <span className="text-muted-foreground/60">FLOW</span>
					</h2>
					<p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
						Operational pipeline outlining how better-openclaw connects, deploys, monitors, and
						scales production autonomous systems.
					</p>

					<div className="absolute right-8 top-32 hidden lg:flex items-center gap-2">
						<span
							className="h-1.5 w-1.5 rounded-full bg-emerald-500"
							style={{ animation: "pulse-dot 3s ease-in-out infinite" }}
						/>
						<span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
							PIPELINE ACTIVE v1.2.0
						</span>
					</div>
				</motion.div>

				{/* The Flow Visualization Area */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.2 }}
					className="relative flex flex-col lg:flex-row border border-border/50 bg-background/60 backdrop-blur-md"
					style={{ animation: "border-breathe 8s ease-in-out infinite" }}
				>
					{/* Left Column: Ingestion Nodes */}
					<div className="w-full lg:w-[30%] border-b lg:border-b-0 lg:border-r border-border/50 p-8">
						<h3 className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
							AVAILABLE SERVICES
						</h3>
						<div className="flex flex-col gap-4">
							{ingestionNodes.map((node, i) => (
								<motion.div
									key={node.name}
									initial={{ opacity: 0, x: -15 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true }}
									transition={{ delay: 0.4 + i * 0.1 }}
									className="group flex items-center justify-between border border-border/50 bg-secondary/30 px-4 py-3 transition-all hover:bg-secondary/60 hover:border-primary/20"
								>
									<div className="flex items-center gap-3">
										<span
											className="h-1.5 w-1.5 bg-primary"
											style={{ animation: `pulse-dot 2s ease-in-out infinite ${i * 0.5}s` }}
										/>
										<span className="font-mono text-sm text-foreground/80">{node.name}</span>
									</div>
									<span
										className={`font-mono text-[9px] uppercase tracking-widest ${node.status === "READY" || node.status === "SYNC" ? "text-emerald-500" : "text-primary"}`}
										style={
											node.status === "SYNC" ? { animation: "data-refresh 2s infinite" } : undefined
										}
									>
										{node.status}
									</span>
								</motion.div>
							))}
						</div>
						<div className="mt-8 pt-8 border-t border-border/50 flex justify-between items-center">
							<span className="font-mono text-[11px] text-muted-foreground uppercase">
								THROUGHPUT
							</span>
							<span
								className="font-mono text-sm text-foreground/80"
								style={{ animation: "data-refresh 4s infinite" }}
							>
								{throughput} GB/s
							</span>
						</div>
					</div>

					{/* Center Column: Engine Visualization */}
					<div className="relative flex min-h-[400px] w-full lg:w-[40%] flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-border/50 p-8 overflow-hidden">
						{/* Animated orbiting rings */}
						<div
							className="absolute left-1/2 top-[40%] h-[200px] w-[200px] rounded-full border border-primary/10 border-dashed"
							style={{ animation: "orbit-spin 20s linear infinite" }}
						>
							{/* Orbiting dot */}
							<span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_rgba(163,135,95,1)]" />
						</div>
						<div
							className="absolute left-1/2 top-[40%] h-[300px] w-[300px] rounded-full border border-border/50 border-dashed"
							style={{ animation: "orbit-spin-reverse 30s linear infinite" }}
						>
							<span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent/60 shadow-[0_0_6px_rgba(194,166,122,0.8)]" />
						</div>
						<div
							className="absolute left-1/2 top-[40%] h-[400px] w-[400px] rounded-full border border-white/[0.03]"
							style={{ animation: "orbit-spin 45s linear infinite" }}
						>
							<span className="absolute -top-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-zinc-500/40" />
						</div>

						{/* Center Core */}
						<div
							className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/30"
							style={{ animation: "pulse-glow 4s ease-in-out infinite" }}
						>
							<div className="h-8 w-8 rounded-sm bg-primary/20 border border-primary/50 flex items-center justify-center">
								<span
									className="h-3 w-3 bg-primary"
									style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
								/>
							</div>
						</div>

						<div className="absolute bottom-12 text-center">
							<h4 className="font-sans text-base font-bold tracking-widest text-foreground uppercase">
								SUPERSTACK ORCHESTRATION ENGINE
							</h4>
							<p className="mt-2 max-w-[280px] font-mono text-[9px] leading-relaxed text-muted-foreground uppercase">
								Deploying autonomous agents to optimized infrastructure zones. Zero-latency handoff
								protocols active.
							</p>
							<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
								<span
									className="h-1.5 w-1.5 rounded-full bg-emerald-500"
									style={{ animation: "pulse-dot 3s ease-in-out infinite" }}
								/>
								<span className="font-mono text-[9px] text-emerald-500 tracking-widest">
									SYSTEM OPTIMAL
								</span>
							</div>
						</div>
					</div>

					{/* Right Column: Telemetry & Scale */}
					<div className="w-full lg:w-[30%] flex flex-col p-8">
						<div className="mb-10">
							<h3 className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
								TELEMETRY
							</h3>
							<div className="grid grid-cols-2 gap-4">
								<div className="border border-border/50 bg-secondary/30 p-3 transition-all hover:border-primary/20">
									<span className="font-mono text-[11px] text-muted-foreground block mb-1">
										LATENCY
									</span>
									<span
										className="font-mono text-xl text-foreground"
										style={{ animation: "data-refresh 5s infinite" }}
									>
										{Math.floor(8 + Math.random() * 8)}ms
									</span>
								</div>
								<div className="border border-border/50 bg-secondary/30 p-3 transition-all hover:border-emerald-500/20">
									<span className="font-mono text-[11px] text-muted-foreground block mb-1">
										UPTIME
									</span>
									<span className="font-mono text-xl text-emerald-500">99.9%</span>
								</div>
							</div>
						</div>

						<div>
							<h3 className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
								AUTO-SCALING
							</h3>
							<div className="space-y-4">
								<div>
									<div className="flex justify-between font-mono text-[9px] mb-2 text-muted-foreground">
										<span>COMPUTE_ALLOC</span>
										<span>{compute}%</span>
									</div>
									<div className="h-1 w-full bg-muted overflow-hidden">
										<motion.div
											className="h-full bg-primary shadow-[0_0_8px_rgba(163,135,95,0.8)]"
											initial={{ width: "0%" }}
											whileInView={{ width: `${compute}%` }}
											viewport={{ once: true }}
											transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
										/>
									</div>
								</div>
								<div>
									<div className="flex justify-between font-mono text-[9px] mb-2 text-muted-foreground">
										<span>MEMORY_POOL</span>
										<span>{memory}%</span>
									</div>
									<div className="h-1 w-full bg-muted overflow-hidden">
										<motion.div
											className="h-full bg-zinc-500"
											initial={{ width: "0%" }}
											whileInView={{ width: `${memory}%` }}
											viewport={{ once: true }}
											transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</motion.div>

				{/* Global Logs Ribbon - Animated ticker */}
				<div className="mt-px flex h-12 w-full items-center border border-t-0 border-border/50 bg-background/40 px-6 backdrop-blur-md overflow-hidden">
					<span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60 mr-4 shrink-0">
						LOG_STREAM
					</span>
					<div className="overflow-hidden flex-1">
						<div
							className="flex gap-8 whitespace-nowrap"
							style={{ animation: "ticker-scroll 30s linear infinite" }}
						>
							{logTickerLines.map((line) => (
								<span key={line.renderKey} className="font-mono text-xs">
									<span className="text-muted-foreground/60">[{line.ts}]</span>{" "}
									<span
										className={
											line.type === "success"
												? "text-primary"
												: line.type === "warn"
													? "text-amber-500"
													: "text-muted-foreground"
										}
									>
										{line.text}
									</span>
								</span>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
