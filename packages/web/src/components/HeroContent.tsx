"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CLOUD_ENABLED } from "@/lib/cloud";
import { ComingSoonModal, useComingSoonModal } from "./ComingSoonModal";

/* ── Floating HUD Data (module-level constant) ──────────────────────────── */
const activeNodes = [
	{ region: "US-EAST-1", status: "ONLINE" },
	{ region: "EU-WEST-2", status: "ONLINE" },
	{ region: "AP-SOUTH-1", status: "SYNCING" },
];

/* ── Animation variants (hoisted to module scope per rendering-hoist-jsx) ─ */
const fadeUp = {
	hidden: { opacity: 0, y: 25 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
	},
};

const container = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: { staggerChildren: 0.12, delayChildren: 0.3 },
	},
};

const _techBullets = [
	"GLOBAL DISTRIBUTED INFRASTRUCTURE",
	"AUTONOMOUS AGENT ORCHESTRATION",
	"SUB-10MS EXECUTION LATENCY",
];

const INSTALL_PRESETS = ["researcher", "devops", "full", "coding-team", "ai-playground"] as const;

const COMMAND_TABS = ["CLI", "Install", "MCP", "Skills"] as const;
type CommandTab = (typeof COMMAND_TABS)[number];

const PKG_MANAGERS = ["NPX", "BUN", "PNPM"] as const;
type PkgManager = (typeof PKG_MANAGERS)[number];

const MCP_PKG_MANAGERS = ["NPX", "BUN", "PNPM", "CLAUDE", "CURSOR_WINDSURF"] as const;
type MCPPkgManager = (typeof MCP_PKG_MANAGERS)[number];

const PKG_COMMANDS: Record<PkgManager, string> = {
	NPX: "npx create-better-openclaw@latest",
	BUN: "bun create better-openclaw@latest",
	PNPM: "pnpm create better-openclaw@latest",
};

const MCP_PKG_COMMANDS: Record<MCPPkgManager, string> = {
	NPX: "npx @better-openclaw/mcp",
	BUN: "bun  @better-openclaw/mcp",
	PNPM: "pnpm  @better-openclaw/mcp",
	CLAUDE: "claude mcp add better-openclaw -- npx -y @better-openclaw/mcp",
	CURSOR_WINDSURF: `{
  "better-openclaw": {
    "command": "npx",
    "args": ["-y", "@better-openclaw/mcp"]
  }
}`,
};

/**
 * HeroContent — The text/CTA section of the hero.
 * Extracted from hero.tsx for maintainability.
 */
export function HeroContent() {
	const [presetIndex, setPresetIndex] = useState(0);
	const [copied, setCopied] = useState(false);
	const [activeTab, setActiveTab] = useState<CommandTab>("CLI");
	const [pkgManager, setPkgManager] = useState<PkgManager>("NPX");
	const [mcpPkgManager, setMcpPkgManager] = useState<MCPPkgManager>("NPX");
	const [pkgDropdownOpen, setPkgDropdownOpen] = useState(false);
	const [mcpPkgDropdownOpen, setMcpPkgDropdownOpen] = useState(false);
	const comingSoon = useComingSoonModal();

	useEffect(() => {
		const interval = setInterval(() => {
			setPresetIndex((i) => (i + 1) % INSTALL_PRESETS.length);
		}, 3000);
		return () => clearInterval(interval);
	}, []);

	const currentPreset = INSTALL_PRESETS[presetIndex];

	const getCommandText = useCallback(() => {
		switch (activeTab) {
			case "CLI":
				return `${PKG_COMMANDS[pkgManager]} --preset ${currentPreset}`;
			case "Install":
				return `curl -fsSL https://better-openclaw.dev/install.sh | bash -s -- --preset ${currentPreset}`;
			case "MCP":
				return `${MCP_PKG_COMMANDS[mcpPkgManager]}`;
			case "Skills":
				return "npx better-openclaw skills add ai-research";
		}
	}, [activeTab, pkgManager, currentPreset, mcpPkgManager]);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(getCommandText()).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [getCommandText]);

	return (
		<motion.div
			variants={container}
			initial="hidden"
			animate="show"
			className="relative z-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center xl:items-start"
		>
			{/* Status Bar */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8 }}
				className="mb-8 flex items-center gap-3"
			>
				<div className="h-px w-10 bg-primary/50" aria-hidden="true" />
				<span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
					CLUSTER : READY | SYSTEM ONLINE
				</span>
				<div
					className="ml-2 h-2 w-2 rounded-full bg-emerald-500"
					style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
					aria-hidden="true"
				/>
			</motion.div>

			{/* Huge Typography (LCP Element) */}
			<h1 className="max-w-[900px] text-center xl:text-left">
				<span className="block text-6xl font-bold tracking-tight text-foreground md:text-8xl lg:text-9xl">
					SCALE WITH
				</span>
				<span
					className="block text-6xl font-bold tracking-tight md:text-8xl lg:text-9xl"
					style={{
						color: "transparent",
						WebkitTextStroke: "1.5px rgba(163,135,95,0.5)",
						animation: "border-breathe 4s ease-in-out infinite",
					}}
				>
					AUTONOMY
				</span>
			</h1>

			<p className="mt-10 max-w-[650px] text-center xl:text-left text-lg text-muted-foreground md:text-xl leading-relaxed">
				Deploy autonomous agents optimized for infrastructure scalability. Engineered for precision
				and zero-latency performance.
			</p>

			{/* Tech Bullets */}
			{/* <motion.ul
        variants={fadeUp}
        className="mt-10 flex flex-col gap-4 font-mono text-sm font-medium tracking-widest uppercase text-foreground/80"
      >
        {techBullets.map((text, i) => (
          <li key={text} className="flex items-center gap-3">
            <span
              className="h-1 w-1 bg-primary"
              style={{
                animation: `pulse-dot 2s ease-in-out infinite ${i * 0.3}s`,
              }}
              aria-hidden="true"
            />
            {text}
          </li>
        ))}
      </motion.ul> */}

			{/* Tabbed Command Block */}
			<motion.div variants={fadeUp} className="mt-12 w-full max-w-[820px] -z-1">
				<div className="rounded-lg border border-border/50 bg-[#0a0a0a] overflow-hidden">
					{/* Tab Bar + Pkg Manager Dropdown */}
					<div className="flex items-center justify-between border-b border-border/30 px-1">
						<div className="flex">
							{COMMAND_TABS.map((tab) => (
								<button
									key={tab}
									type="button"
									onClick={() => {
										setActiveTab(tab);
										setCopied(false);
									}}
									className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
										activeTab === tab
											? "text-primary border-b-2 border-primary"
											: "text-muted-foreground/60 hover:text-muted-foreground"
									}`}
								>
									{tab}
								</button>
							))}
						</div>

						{/* Package Manager Dropdown (CLI tab only) */}
						{activeTab === "CLI" && (
							<div className="relative mr-2">
								<button
									type="button"
									onClick={() => setPkgDropdownOpen(!pkgDropdownOpen)}
									className="flex items-center gap-1.5 rounded-md border border-border/40 bg-background/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer"
								>
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
									{pkgManager}
									<svg
										className={`h-3 w-3 transition-transform ${pkgDropdownOpen ? "rotate-180" : ""}`}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
									>
										<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								{pkgDropdownOpen && (
									<>
										<button
											type="button"
											className="fixed inset-0 z-10 cursor-default"
											onClick={() => setPkgDropdownOpen(false)}
											aria-label="Close dropdown"
										/>
										<div className="absolute right-0 top-full z-20 mt-1 min-w-[100px] rounded-md border border-border/50 bg-[#111] py-1 shadow-lg">
											{PKG_MANAGERS.map((pm) => (
												<button
													key={pm}
													type="button"
													onClick={() => {
														setPkgManager(pm);
														setPkgDropdownOpen(false);
														setCopied(false);
													}}
													className={`flex w-full items-center gap-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
														pkgManager === pm
															? "text-primary bg-primary/10"
															: "text-muted-foreground hover:text-foreground hover:bg-muted/30"
													}`}
												>
													{pkgManager === pm && (
														<span className="h-1 w-1 rounded-full bg-primary" />
													)}
													{pm}
												</button>
											))}
										</div>
									</>
								)}
							</div>
						)}

						{/* MCP and Coding Agent Package Manager Dropdown (MCP tab only) */}
						{activeTab === "MCP" && (
							<div className="relative mr-2">
								<button
									type="button"
									onClick={() => setMcpPkgDropdownOpen(!mcpPkgDropdownOpen)}
									className="flex items-center gap-1.5 rounded-md border border-border/40 bg-background/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer"
								>
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
									{mcpPkgManager}
									<svg
										className={`h-3 w-3 transition-transform ${mcpPkgDropdownOpen ? "rotate-180" : ""}`}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
									>
										<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								{mcpPkgDropdownOpen && (
									<>
										<button
											type="button"
											className="fixed inset-0 z-1 cursor-default"
											onClick={() => setMcpPkgDropdownOpen(false)}
											aria-label="Close dropdown"
										/>
										<div className="absolute right-0 top-full z-1 mt-1 min-w-[100px] min-h-[100px] rounded-md border border-border/50 bg-[#111] py-1 shadow-lg">
											{MCP_PKG_MANAGERS.map((mcppm) => (
												<button
													key={mcppm}
													type="button"
													onClick={() => {
														setMcpPkgManager(mcppm);
														setMcpPkgDropdownOpen(false);
														setCopied(false);
													}}
													className={`flex w-full items-center gap-2 px-3 py-1.5 z-1 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
														mcpPkgManager === mcppm
															? "text-primary bg-primary/10"
															: "text-muted-foreground hover:text-foreground hover:bg-muted/30"
													}`}
												>
													{mcpPkgManager === mcppm && (
														<span className="h-1 w-1 rounded-full bg-primary" />
													)}
													{mcppm}
												</button>
											))}
										</div>
									</>
								)}
							</div>
						)}
					</div>

					{/* Command Content */}
					<button
						type="button"
						onClick={handleCopy}
						className="group flex w-full items-center gap-3 px-4 py-3.5 text-left font-mono text-sm transition-all hover:bg-white/[0.02] cursor-pointer"
					>
						<span className="shrink-0 text-emerald-500/80 select-none" aria-hidden="true">
							{activeTab === "MCP" ? ">" : "$"}
						</span>
						<span className="flex-1 overflow-x-auto whitespace-nowrap text-foreground/80 scrollbar-none">
							<AnimatePresence mode="wait">
								<motion.span
									key={`${activeTab}-${pkgManager}`}
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.2 }}
									className="inline-flex items-center gap-1"
								>
									{activeTab === "CLI" && (
										<>
											<span className="text-foreground/90">{PKG_COMMANDS[pkgManager]}</span>
											<span className="text-muted-foreground"> --preset </span>
											<AnimatePresence mode="wait">
												<motion.span
													key={currentPreset}
													initial={{ opacity: 0, y: 8 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -8 }}
													transition={{ duration: 0.3 }}
													className="text-primary font-semibold"
												>
													{currentPreset}
												</motion.span>
											</AnimatePresence>
										</>
									)}
									{activeTab === "Install" && (
										<>
											<span className="text-muted-foreground">curl -fsSL</span>{" "}
											<span className="text-foreground/90">better-openclaw.dev/install.sh</span>{" "}
											<span className="text-muted-foreground">| bash -s -- --preset</span>{" "}
											<AnimatePresence mode="wait">
												<motion.span
													key={currentPreset}
													initial={{ opacity: 0, y: 8 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -8 }}
													transition={{ duration: 0.3 }}
													className="text-primary font-semibold"
												>
													{currentPreset}
												</motion.span>
											</AnimatePresence>
										</>
									)}
									{activeTab === "MCP" && (
										<span className="text-foreground/90">{MCP_PKG_COMMANDS[pkgManager]}</span>
									)}
									{activeTab === "Skills" && (
										<>
											<span className="text-foreground/90">npx better-openclaw</span>{" "}
											<span className="text-sky-400">skills add</span>{" "}
											<span className="text-primary font-semibold">ai-research</span>
										</>
									)}
								</motion.span>
							</AnimatePresence>
						</span>
						<span className="shrink-0 ml-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 transition-colors group-hover:text-primary/80">
							<svg
								className="h-3.5 w-3.5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.5}
							>
								<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
								<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
							</svg>
							{copied ? "COPIED!" : "COPY"}
						</span>
					</button>
				</div>
			</motion.div>

			{/* CTAs */}
			<motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center gap-6">
				<Link
					href="/new"
					className="group relative flex h-16 items-center justify-center overflow-hidden bg-primary px-10 font-mono text-sm font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(163,135,95,0.3)]"
				>
					<span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
					<span className="relative">INITIALIZE BUILD &rarr;</span>
				</Link>
				<Link
					href="/docs"
					className="group flex h-16 items-center justify-center border border-border bg-transparent px-10 font-mono text-sm font-bold uppercase tracking-widest text-foreground/80 transition-all hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
					style={{ animation: "border-breathe 6s ease-in-out infinite" }}
				>
					VIEW DOCUMENTATION
					<span className="ml-3 flex h-6 w-6 items-center justify-center border border-border rounded-sm text-xs transition-colors group-hover:border-primary/40">
						?
					</span>
				</Link>
			</motion.div>

			<motion.div variants={fadeUp} className="mt-10">
				<span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">
					NO CREDIT CARD REQ. | INSTANT PROVISIONING |{" "}
					{CLOUD_ENABLED ? (
						<a
							href="https://clawexa.net"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary/60 transition-colors hover:text-primary"
						>
							BETTER-OPENCLAW CLOUD
						</a>
					) : (
						<button
							type="button"
							onClick={comingSoon.open}
							className="text-primary/60 transition-colors hover:text-primary cursor-pointer"
						>
							BETTER-OPENCLAW CLOUD
						</button>
					)}
				</span>
			</motion.div>
			<ComingSoonModal open={comingSoon.isOpen} onClose={comingSoon.close} />
		</motion.div>
	);
}

/**
 * HeroHUD — Floating HUD widget panel (right side).
 * Shows active nodes and system health telemetry.
 */
export function HeroHUD() {
	const [uptime, setUptime] = useState("99.99%");
	const [latency, setLatency] = useState(12);

	useEffect(() => {
		const interval = setInterval(() => {
			const r = Math.random();
			if (r > 0.8) setUptime(`99.9${Math.floor(Math.random() * 9)}%`);
			else setUptime("99.99%");
			setLatency(Math.floor(8 + Math.random() * 8));
		}, 3000);
		return () => clearInterval(interval);
	}, []);

	return (
		<motion.div
			initial={{ opacity: 0, x: 40 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
			className="hidden xl:flex absolute right-10 top-1/2 -translate-y-1/2 flex-col gap-6"
			style={{ animation: "float-y-slow 6s ease-in-out infinite" }}
		>
			<div
				className="w-[340px] border border-border/50 bg-background/60 p-6 backdrop-blur-xl"
				style={{ animation: "screen-flicker 10s ease-in-out infinite" }}
			>
				<div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
					<span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
						LAUNCHED DAY
					</span>
					<span className="flex gap-1" aria-hidden="true">
						<span
							className="h-1 w-1 bg-muted-foreground"
							style={{ animation: "pulse-dot 3s infinite" }}
						/>
						<span
							className="h-1 w-1 bg-muted-foreground"
							style={{ animation: "pulse-dot 3s infinite 0.5s" }}
						/>
					</span>
				</div>
				<div className="flex flex-col gap-1 font-mono text-sm text-foreground/80">
					<motion.div variants={fadeUp} className="mt-8">
						<a
							href="https://www.producthunt.com/products/better-openclaw?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-better-openclaw"
							target="_blank"
							rel="noopener noreferrer"
						>
							<img
								alt="better-openclaw - Build your openclaw superstack under a minute | Product Hunt"
								width="250"
								height="54"
								src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1093340&theme=dark&t=1773049677898"
							/>
						</a>
					</motion.div>
				</div>
			</div>

			{/* Active Nodes Widget */}
			<div
				className="w-[340px] border border-border/50 bg-background/60 p-6 backdrop-blur-xl"
				style={{ animation: "screen-flicker 10s ease-in-out infinite" }}
			>
				<div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
					<span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
						ACTIVE_NODES
					</span>
					<span className="flex gap-1" aria-hidden="true">
						<span
							className="h-1 w-1 bg-muted-foreground"
							style={{ animation: "pulse-dot 3s infinite" }}
						/>
						<span
							className="h-1 w-1 bg-muted-foreground"
							style={{ animation: "pulse-dot 3s infinite 0.5s" }}
						/>
					</span>
				</div>
				<div className="flex flex-col gap-4 font-mono text-sm text-foreground/80">
					{activeNodes.map((n, i) => (
						<motion.div
							key={n.region}
							initial={{ opacity: 0, x: 10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 1.2 + i * 0.15 }}
							className="flex justify-between items-center"
						>
							<span>{n.region}</span>
							<span
								className={n.status === "ONLINE" ? "text-emerald-500" : "text-primary"}
								style={
									n.status === "SYNCING" ? { animation: "data-refresh 2s infinite" } : undefined
								}
							>
								{n.status}
							</span>
						</motion.div>
					))}
				</div>
			</div>

			{/* System Health Widget */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 1.5, duration: 0.8 }}
				className="w-[340px] border border-border/50 bg-background/60 p-6 backdrop-blur-xl relative overflow-hidden"
			>
				<div
					className="absolute right-3 top-3 h-4 w-4 border border-primary/30 flex items-center justify-center"
					style={{ animation: "pulse-glow 4s ease-in-out infinite" }}
					aria-hidden="true"
				>
					<span className="h-2 w-2 bg-primary" />
				</div>

				<span className="block font-mono text-xs tracking-widest text-muted-foreground uppercase mb-3">
					SYSTEM_HEALTH
				</span>
				<span
					className="block text-5xl font-bold tracking-tight text-foreground mb-6"
					style={{ animation: "data-refresh 5s ease-in-out infinite" }}
				>
					{uptime}
				</span>

				<div className="flex flex-col gap-2">
					<div className="flex justify-between font-mono text-[9px] text-muted-foreground uppercase">
						<span>LOAD_STREAM</span>
					</div>
					<div className="h-1 w-full bg-muted overflow-hidden">
						<motion.div
							className="h-full bg-primary shadow-[0_0_8px_rgba(163,135,95,0.8)]"
							initial={{ width: "0%" }}
							animate={{ width: "24%" }}
							transition={{ duration: 2, delay: 1.8, ease: [0.16, 1, 0.3, 1] }}
						/>
					</div>
					<div className="flex justify-between font-mono text-[9px] uppercase mt-1">
						<span className="text-muted-foreground">LATENCY: {latency}ms</span>
						<span className="text-emerald-500">OPTIMAL</span>
					</div>
				</div>

				{/* Scan line inside widget */}
				<div className="absolute inset-0 pointer-events-none overflow-hidden">
					<div
						className="absolute left-0 w-full h-px bg-primary/10"
						style={{ animation: "scan-line 5s linear infinite 2s" }}
					/>
				</div>
			</motion.div>
		</motion.div>
	);
}
