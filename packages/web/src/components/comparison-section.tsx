"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const comparisonData = [
	{
		feature: "Data Ownership",
		selfHosted: { label: "100% Yours", check: true },
		managed: { label: "Vendor Cloud", check: false },
	},
	{
		feature: "Cost",
		selfHosted: { label: "Infrastructure Only", check: true },
		managed: { label: "Recurring Fees per Seat", check: false },
	},
	{
		feature: "Privacy",
		selfHosted: { label: "Zero Telemetry", check: true },
		managed: { label: "Data Mining Risk", check: false },
	},
	{
		feature: "Customization",
		selfHosted: { label: "Full Code Access", check: true },
		managed: { label: "Plugin Only", check: false },
	},
	{
		feature: "Rate Limits",
		selfHosted: { label: "None (Hardware Limited)", check: true },
		managed: { label: "API Quotas", check: false },
	},
	{
		feature: "Agent Framework Choice",
		selfHosted: { label: "8 Frameworks", check: true },
		managed: { label: "Vendor Lock-in", check: false },
	},
];

export function ComparisonSection() {
	return (
		<section className="py-24 bg-surface/30 border-y border-border">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="mb-16 text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
						Why Self-Hosted?
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
						Stop renting your intelligence. Own your infrastructure.
					</p>
				</div>

				<div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-border bg-background shadow-lg">
					<div className="grid grid-cols-3 border-b border-border bg-surface/50 p-4 text-sm font-semibold text-foreground">
						<div className="pl-4">Feature</div>
						<div className="text-center text-primary">Better OpenClaw</div>
						<div className="text-center text-muted-foreground">SaaS Alternatives</div>
					</div>

					<div className="divide-y divide-border">
						{comparisonData.map((row, i) => (
							<motion.div
								key={row.feature}
								initial={{ opacity: 0, x: -20 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.1 }}
								className="grid grid-cols-3 items-center p-4 hover:bg-surface/30 transition-colors"
							>
								<div className="pl-4 font-medium text-foreground">{row.feature}</div>

								<div className="flex flex-col items-center justify-center gap-1 text-center">
									{row.selfHosted.check ? (
										<Check className="h-5 w-5 text-emerald-500" />
									) : (
										<X className="h-5 w-5 text-red-500" />
									)}
									<span className="text-sm font-medium text-foreground">
										{row.selfHosted.label}
									</span>
								</div>

								<div className="flex flex-col items-center justify-center gap-1 text-center opacity-80">
									{row.managed.check ? (
										<Check className="h-5 w-5 text-emerald-500" />
									) : (
										<X className="h-5 w-5 text-red-500" />
									)}
									<span className="text-sm text-muted-foreground">{row.managed.label}</span>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
