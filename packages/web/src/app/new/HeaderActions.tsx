"use client";

import { ArrowLeft, Download, Loader2, Rocket, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComingSoonModal, useComingSoonModal } from "@/components/ComingSoonModal";
import { useSession } from "@/lib/auth-client";
import { CLOUD_ENABLED } from "@/lib/cloud";
import { cn } from "@/lib/utils";
import { useStackBuilder } from "./StackBuilderProvider";

export function HeaderActions() {
	const router = useRouter();
	const { data: session } = useSession();
	const comingSoon = useComingSoonModal();

	const {
		projectName,
		setProjectName,
		handleReset,
		setShowSaveModal,
		savedStackId,
		selectedServices,
		setShowDeployToServerModal,
		setShowClawexaModal,
		setShowDeploymentModal,
		isGenerating,
	} = useStackBuilder();

	return (
		<>
			<header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
				<div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6">
					<div className="flex items-center gap-4">
						<Link
							href="/"
							className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							<ArrowLeft className="h-4 w-4" />
							Home
						</Link>
						<div className="h-4 w-px bg-border" aria-hidden="true" />
						<div className="flex items-center gap-2">
							<span className="text-lg">🦞</span>
							<h1 className="text-lg font-bold text-foreground">Stack Builder</h1>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{/* Project name input */}
						<div className="hidden items-center gap-2 sm:flex">
							<label htmlFor="project-name" className="text-xs text-muted-foreground">
								Project:
							</label>
							<input
								id="project-name"
								type="text"
								value={projectName}
								onChange={(e) => setProjectName(e.target.value)}
								placeholder="my-stack"
								className="w-36 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
							/>
						</div>

						<button
							type="button"
							onClick={handleReset}
							className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary"
							aria-label="Reset stack"
						>
							<RotateCcw className="h-3.5 w-3.5" />
							Reset
						</button>

						<button
							type="button"
							onClick={() => {
								if (!session) {
									router.push("/sign-in");
									return;
								}
								setShowSaveModal(true);
							}}
							disabled={selectedServices.size === 0}
							className={cn(
								"hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all focus-visible:ring-1 focus-visible:ring-emerald-500 sm:flex",
								selectedServices.size > 0
									? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
									: "border-border text-muted-foreground cursor-not-allowed",
							)}
							aria-label="Save stack"
						>
							<Save className="h-3.5 w-3.5" />
							{savedStackId ? "Saved ✓" : "Save Stack"}
						</button>

						<button
							type="button"
							onClick={() => setShowDeployToServerModal(true)}
							disabled={selectedServices.size === 0}
							className={cn(
								"hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all focus-visible:ring-1 focus-visible:ring-primary sm:flex",
								selectedServices.size > 0
									? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
									: "border-border text-muted-foreground cursor-not-allowed",
							)}
							aria-label="Deploy to server"
						>
							<Rocket className="h-3.5 w-3.5" />
							Deploy to Server
						</button>

						<button
							type="button"
							onClick={() => (CLOUD_ENABLED ? setShowClawexaModal(true) : comingSoon.open())}
							disabled={selectedServices.size === 0}
							className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none disabled:opacity-50 sm:block"
							aria-label="Deploy to clawexa.net"
						>
							Deploy to clawexa.net
						</button>

						<button
							type="button"
							onClick={() => setShowDeploymentModal(true)}
							disabled={selectedServices.size === 0 || isGenerating}
							className={cn(
								"flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary/50",
								selectedServices.size > 0
									? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
									: "bg-muted text-muted-foreground cursor-not-allowed",
							)}
							aria-label="Download stack"
						>
							{isGenerating ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Generating…
								</>
							) : (
								<>
									<Download className="h-4 w-4" />
									Download Stack
								</>
							)}
						</button>
					</div>
				</div>
			</header>
			<ComingSoonModal open={comingSoon.isOpen} onClose={comingSoon.close} />
		</>
	);
}
