"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

const useCases = [
	{
		id: "ai-powerhouse",
		title: "Self-Hosted Manus Alternative",
		subtitle: "Autonomous AI Agent Infrastructure",
		description:
			"Build your own Manus/Perplexity Computer with local LLM, vector memory, web search, and browser automation. One command. Your hardware. Your data.",
		stack: ["Ollama", "Qdrant", "n8n", "SearXNG", "Browserless"],
		metrics: [
			{ label: "Cost Savings", value: "$1,800/year", highlight: true },
			{ label: "Setup Time", value: "5 minutes" },
			{ label: "Data Privacy", value: "100% Local" },
		],
		gradient: "from-amber-500/20 to-orange-600/20",
		icon: "🤖",
		link: "/blog/ai-powerhouse-self-hosted-manus-alternative",
	},
	{
		id: "perplexity-replacement",
		title: "Self-Hosted Perplexity",
		subtitle: "AI-Powered Search Engine",
		description:
			"Privacy-first AI search with SearXNG meta-search, browser automation for scraping, and local LLM synthesis. No tracking. No data sharing.",
		stack: ["SearXNG", "Browserless", "Ollama", "Qdrant", "Redis"],
		metrics: [
			{ label: "Search Engines", value: "70+ Sources", highlight: true },
			{ label: "Data Stored", value: "Your Server" },
			{ label: "Monthly Cost", value: "$0 API fees" },
		],
		gradient: "from-blue-500/20 to-cyan-600/20",
		icon: "🔍",
		link: "/blog/private-rag-pipeline-qdrant-searxng",
	},
	{
		id: "apollo-alternative",
		title: "Self-Hosted Lead Platform",
		subtitle: "Apollo.io / Hunter.io Alternative",
		description:
			"Automate prospecting and outreach with web scraping, company research, and personalized message generation. All data stays on your server.",
		stack: ["Browserless", "PostgreSQL", "n8n", "Ollama", "Redis"],
		metrics: [
			{ label: "Cost vs Apollo", value: "$4,800/year saved", highlight: true },
			{ label: "Lead Storage", value: "Unlimited" },
			{ label: "Compliance", value: "GDPR-Ready" },
		],
		gradient: "from-purple-500/20 to-pink-600/20",
		icon: "📊",
		link: "/docs/deployment",
	},
	{
		id: "research-assistant",
		title: "Autonomous Research Agent",
		subtitle: "Deep Research & Analysis",
		description:
			"Multi-source research with automatic credibility scoring, citation tracking, and synthesis. Perfect for market research, due diligence, and competitive analysis.",
		stack: ["SearXNG", "Qdrant", "n8n", "Ollama", "PostgreSQL"],
		metrics: [
			{ label: "Research Time", value: "10x Faster", highlight: true },
			{ label: "Source Types", value: "Web + Docs" },
			{ label: "Citation Tracking", value: "Automatic" },
		],
		gradient: "from-green-500/20 to-emerald-600/20",
		icon: "📚",
		link: "/blog/self-host-ai-agents-docker-compose",
	},
	{
		id: "content-pipeline",
		title: "Content Creation Pipeline",
		subtitle: "Research to Publication",
		description:
			"End-to-end content workflow: research topics, generate outlines, write drafts, create images, and publish. Multi-model routing for optimal quality.",
		stack: ["n8n", "Ollama", "Stable Diffusion", "PostgreSQL", "MinIO"],
		metrics: [
			{ label: "Content Types", value: "Blog, Social, Video", highlight: true },
			{ label: "Image Generation", value: "Unlimited" },
			{ label: "Publishing", value: "Auto-Deploy" },
		],
		gradient: "from-red-500/20 to-rose-600/20",
		icon: "✍️",
		link: "/blog/n8n-ai-workflow-automation",
	},
	{
		id: "coding-assistant",
		title: "AI Development Environment",
		subtitle: "Spec to Deployment",
		description:
			"Autonomous coding agents that understand specs, generate code, run tests, and deploy. Full code review and documentation generation.",
		stack: ["Ollama", "PostgreSQL", "Gitea", "n8n", "Code-Server"],
		metrics: [
			{ label: "Code Quality", value: "Test-First", highlight: true },
			{ label: "Documentation", value: "Auto-Generated" },
			{ label: "Git Integration", value: "Full CI/CD" },
		],
		gradient: "from-indigo-500/20 to-violet-600/20",
		icon: "💻",
		link: "/blog/building-ai-coding-assistant-continue-dev",
	},
];

export function UseCaseCarousel() {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isPaused, setIsPaused] = useState(false);

	useEffect(() => {
		if (isPaused) return;

		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % useCases.length);
		}, 8000);

		return () => clearInterval(interval);
	}, [isPaused]);

	const currentUseCase = useCases[currentIndex];

	return (
		<section className="relative w-full py-20 lg:py-32 overflow-hidden border-t border-border/50">
			{/* Ambient Glow */}
			<div className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[1000px] -translate-y-1/2 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(163,135,95,0.08)_0%,transparent_60%)] blur-3xl" />

			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
					className="mb-16 text-center"
				>
					<div className="flex items-center justify-center gap-3 mb-4">
						<span
							className="h-2 w-2 bg-primary"
							style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
						/>
						<span className="font-mono text-xs tracking-widest text-primary uppercase">
							USE_CASE_CATALOG
						</span>
					</div>

					<h2 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
						WHAT YOU CAN <span className="text-muted-foreground/60">BUILD</span>
					</h2>
					<p className="mt-4 max-w-2xl mx-auto text-base leading-relaxed text-muted-foreground">
						Real-world applications built with better-openclaw. Self-hosted alternatives to
						expensive cloud services. One command. Your infrastructure.
					</p>
				</motion.div>

				{/* Carousel */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.2 }}
					className="relative"
					onMouseEnter={() => setIsPaused(true)}
					onMouseLeave={() => setIsPaused(false)}
				>
					{/* Main Card */}
					<div className="relative min-h-[500px] border border-border/50 bg-background/60 backdrop-blur-md overflow-hidden">
						{/* Gradient Background */}
						<div
							className={`absolute inset-0 bg-gradient-to-br ${currentUseCase.gradient} opacity-30 transition-opacity duration-1000`}
						/>

						<AnimatePresence mode="wait">
							<motion.div
								key={currentUseCase.id}
								initial={{ opacity: 0, x: 100 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -100 }}
								transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
								className="relative z-10 p-8 lg:p-12"
							>
								{/* Icon + Title */}
								<div className="mb-8">
									<div className="text-6xl mb-4">{currentUseCase.icon}</div>
									<div className="flex items-center gap-3 mb-2">
										<h3 className="text-3xl md:text-4xl font-bold text-foreground">
											{currentUseCase.title}
										</h3>
									</div>
									<p className="text-lg text-primary font-mono">{currentUseCase.subtitle}</p>
								</div>

								{/* Description */}
								<p className="text-lg leading-relaxed text-muted-foreground max-w-3xl mb-8">
									{currentUseCase.description}
								</p>

								{/* Stack Pills */}
								<div className="mb-8">
									<span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3 block">
										Stack Components
									</span>
									<div className="flex flex-wrap gap-2">
										{currentUseCase.stack.map((tech) => (
											<span
												key={tech}
												className="px-3 py-1 text-sm font-mono border border-border/50 bg-secondary/30 text-foreground/80"
											>
												{tech}
											</span>
										))}
									</div>
								</div>

								{/* Metrics */}
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
									{currentUseCase.metrics.map((metric) => (
										<div
											key={metric.label}
											className={`border ${metric.highlight ? "border-primary/40 bg-primary/5" : "border-border/50 bg-secondary/30"} p-4`}
										>
											<span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-1">
												{metric.label}
											</span>
											<span
												className={`font-mono text-xl ${metric.highlight ? "text-primary" : "text-foreground"}`}
											>
												{metric.value}
											</span>
										</div>
									))}
								</div>

								{/* CTA */}
								<Link
									href={currentUseCase.link}
									className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono text-sm uppercase tracking-widest hover:bg-primary/80 transition-colors border border-primary/20"
								>
									Learn More
									<span className="text-lg">→</span>
								</Link>
							</motion.div>
						</AnimatePresence>
					</div>

					{/* Navigation Dots */}
					<div className="flex items-center justify-center gap-2 mt-8">
						{useCases.map((useCase, index) => (
							<button
								type="button"
								key={useCase.id}
								onClick={() => setCurrentIndex(index)}
								className={`h-2 transition-all ${
									index === currentIndex ? "w-12 bg-primary" : "w-2 bg-border/50 hover:bg-border"
								}`}
								aria-label={`Show ${useCase.title}`}
							/>
						))}
					</div>

					{/* Auto-play indicator */}
					{!isPaused && (
						<div className="flex items-center justify-center gap-2 mt-4">
							<span
								className="h-1.5 w-1.5 rounded-full bg-emerald-500"
								style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
							/>
							<span className="font-mono text-xs text-muted-foreground">AUTO-ROTATING</span>
						</div>
					)}
				</motion.div>

				{/* Bottom CTA */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.4 }}
					className="mt-16 text-center"
				>
					<p className="text-sm text-muted-foreground mb-4">
						Ready to build your own self-hosted infrastructure?
					</p>
					<Link
						href="/new"
						className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-mono text-sm uppercase tracking-widest hover:bg-primary/80 transition-colors border border-primary/20"
					>
						Start Building Now
						<span className="text-lg">→</span>
					</Link>
				</motion.div>
			</div>
		</section>
	);
}
