export function DemoVideo() {
	return (
		<section
			id="demo"
			className="relative border-y border-border/50 bg-background py-24 sm:py-32 overflow-hidden"
		>
			{/* Architectural Background */}
			<div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent" />
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(163,135,95,0.05)_0%,transparent_100%)]" />

			<div className="relative mx-auto max-w-7xl px-6 lg:px-8">
				<div className="mx-auto max-w-2xl text-center mb-16">
					<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						See it in Action
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						Watch how easily you can design, validate, and deploy an enterprise-grade AI
						architecture in under 5 minutes.
					</p>
				</div>

				<div className="mx-auto max-w-5xl">
					{/* Supademo Interactive Demo */}
					<div
						className="relative w-full rounded-2xl border border-border/50 bg-[#0a0a0a] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
						style={{
							boxSizing: "content-box",
							maxHeight: "80vh",
							aspectRatio: "1.93",
							padding: "40px 0",
						}}
					>
						<iframe
							src="https://app.supademo.com/embed/cmmixxhcp1qkjzdh1mp8a1z4w?embed_v=2&utm_source=embed"
							loading="lazy"
							title="Set up full-stack AI with Anthropic, Video Creator, Research Agent"
							allow="clipboard-write"
							frameBorder="0"
							allowFullScreen
							className="absolute top-0 left-0 w-full h-full"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
