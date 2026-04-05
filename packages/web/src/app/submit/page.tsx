"use client";

import { SERVICE_CATEGORIES } from "@better-openclaw/core/types";
import { Layers, Package, Send } from "lucide-react";
import { useState } from "react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export default function SubmitPage() {
	// Stack submission state
	const [stackName, setStackName] = useState("");
	const [stackDescription, setStackDescription] = useState("");
	const [stackGithub, setStackGithub] = useState("");
	const [stackScreenshot, setStackScreenshot] = useState("");

	// Service proposal state
	const [serviceName, setServiceName] = useState("");
	const [dockerImage, setDockerImage] = useState("");
	const [serviceCategory, setServiceCategory] = useState("");
	const [serviceDescription, setServiceDescription] = useState("");
	const [serviceWebsite, setServiceWebsite] = useState("");
	const [serviceWhy, setServiceWhy] = useState("");

	function submitStack() {
		const body = [
			`## Project: ${stackName}`,
			"",
			`**Description:** ${stackDescription}`,
			"",
			`**GitHub:** ${stackGithub}`,
			stackScreenshot ? `**Screenshot:** ${stackScreenshot}` : "",
		]
			.filter(Boolean)
			.join("\n");

		const url = `https://github.com/bidewio/better-openclaw/issues/new?title=${encodeURIComponent(
			`[Showcase] ${stackName}`,
		)}&body=${encodeURIComponent(body)}&labels=showcase`;

		window.open(url, "_blank");
	}

	function submitService() {
		const body = [
			`## Service: ${serviceName}`,
			"",
			`**Docker Image:** \`${dockerImage}\``,
			`**Category:** ${serviceCategory}`,
			`**Website:** ${serviceWebsite}`,
			"",
			`### Description`,
			serviceDescription,
			"",
			`### Why should this be included?`,
			serviceWhy,
		].join("\n");

		const url = `https://github.com/bidewio/better-openclaw/issues/new?title=${encodeURIComponent(
			`[Service] ${serviceName}`,
		)}&body=${encodeURIComponent(body)}&labels=service-proposal`;

		window.open(url, "_blank");
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<Navbar />

			<main className="pt-14">
				{/* Header */}
				<section className="border-b border-border">
					<div className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-8">
						<h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
							Submit to <span className="text-gradient">better-openclaw</span>
						</h1>
						<p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
							Share your stack or propose a new service for the community
						</p>
					</div>
				</section>

				{/* Cards */}
				<section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
					<div className="grid gap-8 lg:grid-cols-2">
						{/* ── Submit a Stack ── */}
						<div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
							<div className="mb-6 flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									<Layers className="h-5 w-5 text-primary" />
								</div>
								<div>
									<h2 className="text-xl font-semibold text-foreground">Submit a Stack</h2>
									<p className="text-sm text-muted-foreground">
										Share your better-openclaw stack with the community
									</p>
								</div>
							</div>

							<div className="space-y-4">
								<div>
									<label
										htmlFor="stack-name"
										className="mb-1.5 block text-sm font-medium text-foreground"
									>
										Project Name
									</label>
									<input
										id="stack-name"
										type="text"
										value={stackName}
										onChange={(e) => setStackName(e.target.value)}
										placeholder="My Awesome Stack"
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>

								<div>
									<label
										htmlFor="stack-description"
										className="mb-1.5 block text-sm font-medium text-foreground"
									>
										Description
									</label>
									<textarea
										id="stack-description"
										value={stackDescription}
										onChange={(e) => setStackDescription(e.target.value)}
										placeholder="Brief description of what your stack does..."
										rows={3}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
									/>
								</div>

								<div>
									<label
										htmlFor="stack-github"
										className="mb-1.5 block text-sm font-medium text-foreground"
									>
										GitHub URL
									</label>
									<input
										id="stack-github"
										type="url"
										value={stackGithub}
										onChange={(e) => setStackGithub(e.target.value)}
										placeholder="https://github.com/..."
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>

								<div>
									<label
										htmlFor="stack-screenshot"
										className="mb-1.5 block text-sm font-medium text-foreground"
									>
										Screenshot URL
									</label>
									<input
										id="stack-screenshot"
										type="url"
										value={stackScreenshot}
										onChange={(e) => setStackScreenshot(e.target.value)}
										placeholder="https://..."
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>

								<button
									type="button"
									onClick={submitStack}
									disabled={!stackName || !stackDescription || !stackGithub}
									className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Send className="h-4 w-4" />
									Submit Stack
								</button>
							</div>
						</div>

						{/* ── Propose a Service ── */}
						<div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
							<div className="mb-6 flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
									<Package className="h-5 w-5 text-accent" />
								</div>
								<div>
									<h2 className="text-xl font-semibold text-foreground">Propose a Service</h2>
									<p className="text-sm text-muted-foreground">
										Suggest a new service or tool for integration
									</p>
								</div>
							</div>

							<div className="space-y-4">
								<div>
									<label
										htmlFor="service-name"
										className="mb-1.5 block text-sm font-medium text-foreground"
									>
										Service Name
									</label>
									<input
										id="service-name"
										type="text"
										value={serviceName}
										onChange={(e) => setServiceName(e.target.value)}
										placeholder="e.g. Meilisearch"
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>

								<div>
									<label
										htmlFor="docker-image"
										className="mb-1.5 block text-sm font-medium text-foreground"
									>
										Docker Image
									</label>
									<input
										id="docker-image"
										type="text"
										value={dockerImage}
										onChange={(e) => setDockerImage(e.target.value)}
										placeholder="e.g. getmeili/meilisearch:latest"
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>

								<div>
									<label
										htmlFor="service-category"
										className="mb-1.5 block text-sm font-medium text-foreground"
									>
										Category
									</label>
									<select
										id="service-category"
										value={serviceCategory}
										onChange={(e) => setServiceCategory(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
									>
										<option value="">Select a category...</option>
										{SERVICE_CATEGORIES.map((cat) => (
											<option key={cat.id} value={cat.name}>
												{cat.icon} {cat.name}
											</option>
										))}
									</select>
								</div>

								<div>
									<label
										htmlFor="service-description"
										className="mb-1.5 block text-sm font-medium text-foreground"
									>
										Description
									</label>
									<textarea
										id="service-description"
										value={serviceDescription}
										onChange={(e) => setServiceDescription(e.target.value)}
										placeholder="What does this service do?"
										rows={2}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
									/>
								</div>

								<div>
									<label
										htmlFor="service-website"
										className="mb-1.5 block text-sm font-medium text-foreground"
									>
										Website URL
									</label>
									<input
										id="service-website"
										type="url"
										value={serviceWebsite}
										onChange={(e) => setServiceWebsite(e.target.value)}
										placeholder="https://..."
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>

								<div>
									<label
										htmlFor="service-why"
										className="mb-1.5 block text-sm font-medium text-foreground"
									>
										Why include it?
									</label>
									<textarea
										id="service-why"
										value={serviceWhy}
										onChange={(e) => setServiceWhy(e.target.value)}
										placeholder="Why should this service be part of better-openclaw?"
										rows={2}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
									/>
								</div>

								<button
									type="button"
									onClick={submitService}
									disabled={
										!serviceName ||
										!dockerImage ||
										!serviceCategory ||
										!serviceDescription ||
										!serviceWhy
									}
									className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition-all hover:bg-accent/90 hover:shadow-md hover:shadow-accent/25 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Send className="h-4 w-4" />
									Propose Service
								</button>
							</div>
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	);
}
