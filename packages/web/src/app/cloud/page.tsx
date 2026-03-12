import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { CLOUD_ENABLED } from "@/lib/cloud";
import { docsStats } from "@/lib/docs-stats";

export const metadata: Metadata = {
	title: "Clawexa Cloud — Hosted OpenClaw Platform",
	description:
		"Deploy AI agent stacks without managing infrastructure. Clawexa is the cloud-hosted version of better-openclaw — same powerful stack builder, zero server management.",
	keywords: [
		"Clawexa",
		"Clawexa cloud",
		"Better-Openclaw cloudd",
		"hosted OpenClaw",
		"cloud docker compose",
		"managed AI stack",
		"deploy AI agents",
		"cloud infrastructure",
		"better-openclaw cloud",
	],
	openGraph: {
		title: "Clawexa Cloud — Hosted OpenClaw Platform",
		description:
			"Deploy AI agent stacks without managing infrastructure. Same powerful stack builder, zero server management.",
		type: "website",
	},
	alternates: {
		canonical: "/cloud",
	},
};

function CloudComingSoon() {
	return (
		<section className="relative border-b border-border/50 py-32">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(163,135,95,0.06)_0%,transparent_60%)] -z-10" />
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
				<div className="mb-8 inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-1">
					<span className="h-1.5 w-1.5 rounded-full bg-primary" />
					<span className="font-mono text-[9px] uppercase tracking-widest text-primary">
						COMING SOON
					</span>
				</div>

				<h1 className="text-5xl font-bold tracking-tight text-foreground md:text-7xl">
					CLAWEXA <span className="text-muted-foreground/60">CLOUD</span>
				</h1>

				<p className="mt-8 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
					Clawexa Cloud is currently under development. The hosted version of better-openclaw will
					let you deploy AI agent stacks without managing servers, Docker, or infrastructure.
				</p>

				<p className="mt-4 font-mono text-xs text-muted-foreground/60">Stay tuned for updates.</p>

				<div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
					<Link
						href="/new"
						className="group relative flex h-16 items-center justify-center overflow-hidden bg-primary px-10 font-mono text-sm font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(163,135,95,0.3)]"
					>
						<span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
						<span className="relative">SELF-HOST NOW &rarr;</span>
					</Link>
					<Link
						href="/docs"
						className="group flex h-16 items-center justify-center border border-border bg-transparent px-10 font-mono text-sm font-bold uppercase tracking-widest text-foreground/80 transition-all hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
					>
						VIEW DOCUMENTATION
					</Link>
				</div>
			</div>
		</section>
	);
}

function CloudContent() {
	return (
		<>
			{/* Hero */}
			<section className="relative border-b border-border/50 py-32">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(163,135,95,0.06)_0%,transparent_60%)] -z-10" />
				<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
					<div className="mb-8 inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-1">
						<span className="h-1.5 w-1.5 rounded-full bg-primary" />
						<span className="font-mono text-[9px] uppercase tracking-widest text-primary">
							CLOUD PLATFORM
						</span>
					</div>

					<h1 className="text-5xl font-bold tracking-tight text-foreground md:text-7xl">
						CLAWEXA <span className="text-muted-foreground/60">CLOUD</span>
					</h1>

					<p className="mt-8 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
						The hosted version of better-openclaw. Same powerful stack builder with{" "}
						{docsStats.serviceCount}+ services and skill packs — without managing servers, Docker,
						or infrastructure.
					</p>

					<div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
						<a
							href="https://clawexa.net"
							target="_blank"
							rel="noopener noreferrer"
							className="group relative flex h-16 items-center justify-center overflow-hidden bg-primary px-10 font-mono text-sm font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(163,135,95,0.3)]"
						>
							<span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
							<span className="relative">GO TO CLAWEXA.NET &rarr;</span>
						</a>
						<Link
							href="/new"
							className="group flex h-16 items-center justify-center border border-border bg-transparent px-10 font-mono text-sm font-bold uppercase tracking-widest text-foreground/80 transition-all hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
						>
							SELF-HOST INSTEAD
						</Link>
					</div>
				</div>
			</section>

			{/* Comparison */}
			<section className="py-24">
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					<h2 className="mb-4 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
						DEPLOYMENT OPTIONS
					</h2>
					<h3 className="mb-16 text-center text-3xl font-bold tracking-tight text-foreground">
						Self-Hosted vs Clawexa Cloud
					</h3>

					<div className="grid md:grid-cols-2 gap-8">
						{/* Self-Hosted */}
						<div className="border border-border/50 p-8">
							<div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-border bg-secondary/50 px-3 py-1">
								<span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
									SELF-HOSTED
								</span>
							</div>
							<h4 className="text-xl font-bold text-foreground mb-4">better-openclaw</h4>
							<ul className="space-y-3 font-mono text-sm text-muted-foreground">
								<li className="flex items-center gap-3">
									<span className="h-1 w-1 bg-primary" />
									Full infrastructure control
								</li>
								<li className="flex items-center gap-3">
									<span className="h-1 w-1 bg-primary" />
									Run on your own hardware
								</li>
								<li className="flex items-center gap-3">
									<span className="h-1 w-1 bg-primary" />
									CLI, API, and web builder
								</li>
								<li className="flex items-center gap-3">
									<span className="h-1 w-1 bg-primary" />
									100% open source (MIT)
								</li>
							</ul>
							<Link
								href="/new"
								className="mt-8 flex h-12 w-full items-center justify-center border border-border font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
							>
								BUILD LOCALLY
							</Link>
						</div>

						{/* Clawexa Cloud */}
						<div className="border border-primary/30 bg-primary/5 p-8 relative">
							<div className="absolute top-0 right-0 bg-primary px-3 py-1">
								<span className="font-mono text-[9px] uppercase tracking-widest text-primary-foreground">
									MANAGED
								</span>
							</div>
							<div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-1">
								<span className="h-1.5 w-1.5 rounded-full bg-primary" />
								<span className="font-mono text-[9px] uppercase tracking-widest text-primary">
									CLOUD
								</span>
							</div>
							<h4 className="text-xl font-bold text-foreground mb-4">Clawexa</h4>
							<ul className="space-y-3 font-mono text-sm text-muted-foreground">
								<li className="flex items-center gap-3">
									<span className="h-1 w-1 bg-primary" />
									Zero infrastructure management
								</li>
								<li className="flex items-center gap-3">
									<span className="h-1 w-1 bg-primary" />
									One-click deploy from builder
								</li>
								<li className="flex items-center gap-3">
									<span className="h-1 w-1 bg-primary" />
									Automatic scaling and updates
								</li>
								<li className="flex items-center gap-3">
									<span className="h-1 w-1 bg-primary" />
									Same {docsStats.serviceCount}+ services catalog
								</li>
							</ul>
							<a
								href="https://clawexa.net"
								target="_blank"
								rel="noopener noreferrer"
								className="mt-8 flex h-12 w-full items-center justify-center bg-primary font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
							>
								DEPLOY ON CLAWEXA &rarr;
							</a>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}

export default function CloudPage() {
	return (
		<>
			<Navbar />
			<main className="min-h-screen pt-16">
				{CLOUD_ENABLED ? <CloudContent /> : <CloudComingSoon />}
			</main>
			<Footer />
		</>
	);
}
