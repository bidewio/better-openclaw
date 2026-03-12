"use client";

import { motion } from "framer-motion";
import { Activity, ChevronRight, Copy, Cpu, Server, Shield, Terminal } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/* ── Typewriter terminal lines ─────────────────────────────────────────────── */
const terminalLines = [
	{ text: "$ npx create-better-openclaw my-stack", style: "text-foreground" },
	{ text: "✓ Selected: Redis, Qdrant, n8n, FFmpeg", style: "text-emerald-400" },
	{
		text: "✓ Resolved 2 dependencies: PostgreSQL, Prometheus",
		style: "text-emerald-400",
	},
	{
		text: "✓ Generated docker-compose.yml (6 services)",
		style: "text-emerald-400",
	},
	{ text: "✓ Created .env with secure secrets", style: "text-emerald-400" },
	{ text: "✓ Installed 4 OpenClaw skills", style: "text-emerald-400" },
	{ text: "", style: "" },
	{
		text: "Your stack is ready! cd my-stack && docker compose up -d",
		style: "text-primary font-semibold",
	},
];

/* ── Status Indicators ─────────────────────────────────────────────────────── */
const systemStatus = [
	{ icon: Activity, label: "System", value: "Operational", color: "text-emerald-400" },
	{ icon: Server, label: "Nodes", value: "186/186", color: "text-blue-400" },
	{ icon: Shield, label: "Security", value: "Enforced", color: "text-purple-400" },
	{ icon: Cpu, label: "Load", value: "12%", color: "text-amber-400" },
];

/* ── Stagger helpers ───────────────────────────────────────────────────────── */
const container = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: { staggerChildren: 0.1, delayChildren: 0.1 },
	},
};

const fadeUp = {
	hidden: { opacity: 0, y: 20 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.5, ease: "easeOut" as const },
	},
};

/* ── Typewriter hook ───────────────────────────────────────────────────────── */
function useTypewriter(lines: typeof terminalLines) {
	const [displayed, setDisplayed] = useState<string[]>([]);

	useEffect(() => {
		let lineIdx = 0;
		let charIdx = 0;
		let cancelled = false;

		function tick() {
			if (cancelled) return;
			if (lineIdx >= lines.length) return;

			const line = lines[lineIdx].text;
			charIdx++;

			setDisplayed((prev) => {
				const next = [...prev];
				next[lineIdx] = line.slice(0, charIdx);
				return next;
			});

			if (charIdx >= line.length) {
				lineIdx++;
				charIdx = 0;
				setTimeout(tick, lineIdx === 0 ? 400 : 150); // Fast typing for effect
			} else {
				setTimeout(tick, 15);
			}
		}

		const initial = setTimeout(tick, 500);
		return () => {
			cancelled = true;
			clearTimeout(initial);
		};
	}, [lines]);

	return displayed;
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export function HeroAlternative() {
	const typed = useTypewriter(terminalLines);

	return (
		<section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-32">
			{/* Background effects */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-80" />

			<motion.div
				variants={container}
				initial="hidden"
				animate="show"
				className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
			>
				<div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
					{/* ── Left Column: Copy ────────────────────────────────────────────── */}
					<div className="text-center lg:text-left">
						<motion.div
							variants={fadeUp}
							className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6"
						>
							<span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
							v1.0.0 Now Available
						</motion.div>

						<motion.h1
							variants={fadeUp}
							className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl"
						>
							Your Personal
							<span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400 mt-2">
								AI Command Center
							</span>
						</motion.h1>

						<motion.p
							variants={fadeUp}
							className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground lg:mx-0"
						>
							Take back control. Better OpenClaw is the open-source infrastructure for deploying,
							managing, and scaling your own AI agents—on your own hardware.
						</motion.p>

						<motion.div
							variants={fadeUp}
							className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
						>
							<Link
								href="/new"
								className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-md bg-primary px-8 font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105"
							>
								<span className="mr-2">Deploy Stack</span>
								<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
								<div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
							</Link>

							<div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-4 py-3 font-mono text-sm text-foreground">
								<span className="text-muted-foreground">$</span>
								<span>npx create-better-openclaw</span>
								<button
									type="button"
									className="ml-2 rounded p-1 hover:bg-muted transition-colors"
									onClick={() => navigator.clipboard.writeText("npx create-better-openclaw")}
									aria-label="Copy command"
								>
									<Copy className="h-3.5 w-3.5 text-muted-foreground" />
								</button>
							</div>
						</motion.div>

						<motion.div
							variants={fadeUp}
							className="mt-10 flex items-center justify-center lg:justify-start gap-8 text-sm text-muted-foreground"
						>
							<div className="flex items-center gap-2">
								<Server className="h-4 w-4" /> Self-Hosted
							</div>
							<div className="flex items-center gap-2">
								<Shield className="h-4 w-4" /> Privacy First
							</div>
							<div className="flex items-center gap-2">
								<Cpu className="h-4 w-4" /> GPU Ready
							</div>
						</motion.div>
					</div>

					{/* ── Right Column: Terminal HUD ────────────────────────────────────── */}
					<motion.div variants={fadeUp} className="relative mx-auto w-full max-w-lg lg:max-w-none">
						{/* HUD Decoration */}
						<div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-600/30 opacity-50 blur-lg" />

						<div className="relative overflow-hidden rounded-xl border border-border/50 bg-[#0d1117]/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-[#0d1117]/60">
							{/* Header */}
							<div className="flex items-center justify-between border-b border-border/40 bg-white/5 px-4 py-3">
								<div className="flex items-center gap-2">
									<Terminal className="h-4 w-4 text-muted-foreground" />
									<span className="text-xs font-medium text-muted-foreground">local-env — zsh</span>
								</div>
								<div className="flex gap-1.5">
									<div className="h-2.5 w-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
									<div className="h-2.5 w-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
									<div className="h-2.5 w-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
								</div>
							</div>

							{/* Status Bar */}
							<div className="grid grid-cols-4 gap-px border-b border-border/40 bg-white/5">
								{systemStatus.map((stat) => (
									<div
										key={stat.label}
										className="flex flex-col items-center justify-center py-2 px-1"
									>
										<stat.icon className={`h-4 w-4 mb-1 ${stat.color}`} />
										<span className="text-[10px] uppercase tracking-wider text-muted-foreground">
											{stat.label}
										</span>
										<span className="text-xs font-mono font-medium text-foreground">
											{stat.value}
										</span>
									</div>
								))}
							</div>

							{/* Terminal Body */}
							<div className="p-5 font-mono text-xs sm:text-sm leading-relaxed min-h-[340px]">
								{terminalLines.map((line, i) => (
									<div
										key={`${line.text}-${line.style}`}
										className={`min-h-[1.5em] mb-1 ${line.style}`}
									>
										{typed[i] ?? ""}
										{i === typed.length - 1 && (typed[i]?.length ?? 0) < line.text.length && (
											<span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
										)}
									</div>
								))}
								{typed.length === terminalLines.length && (
									<div className="mt-4 flex gap-2">
										<span className="text-emerald-400">➜</span>
										<span className="text-blue-400">~</span>
										<span className="animate-pulse">_</span>
									</div>
								)}
							</div>
						</div>
					</motion.div>
				</div>
			</motion.div>
		</section>
	);
}
