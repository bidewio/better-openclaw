"use client";

import { generateStackAsZip, generateStackComplete } from "@/lib/api-client";
import { CLOUD_ENABLED } from "@/lib/cloud";
import { useStackBuilder } from "./StackBuilderProvider";

const CLAWEXA_DEPLOY_URL = process.env.NEXT_PUBLIC_CLAWEXA_DEPLOY_URL ?? "";
const CLAWEXA_SITE = "https://clawexa.net";

/** Builds the shared stack generation parameters from context. */
function useStackParams() {
	const { projectName, selectedServices, selectedAiProviders, selectedGsdRuntimes } =
		useStackBuilder();

	return {
		projectName: projectName || "my-stack",
		services: Array.from(selectedServices),
		skillPacks: [] as string[],
		aiProviders: Array.from(selectedAiProviders),
		gsdRuntimes: Array.from(selectedGsdRuntimes),
		proxy: "none" as const,
		gpu: false,
		platform: "linux/amd64",
		deployment: "local" as const,
		deploymentType: "docker" as const,
		monitoring: false,
	};
}

export function ClawexaModal() {
	const {
		selectedServices,
		isGenerating,
		setIsGenerating,
		setGenerateError,
		showClawexaModal,
		setShowClawexaModal,
		clawexaAction,
		setClawexaAction,
	} = useStackBuilder();

	const stackParams = useStackParams();

	if (!showClawexaModal || !CLOUD_ENABLED) return null;

	async function handleDownloadZip() {
		if (selectedServices.size === 0) return;
		setIsGenerating(true);
		setGenerateError(null);
		try {
			const blob = await generateStackAsZip(stackParams);
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${stackParams.projectName}.zip`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			setGenerateError(err instanceof Error ? err.message : "Failed to get ZIP");
		} finally {
			setIsGenerating(false);
		}
	}

	async function handleCopyJson() {
		if (selectedServices.size === 0) return;
		setIsGenerating(true);
		setGenerateError(null);
		try {
			const complete = await generateStackComplete(stackParams);
			await navigator.clipboard.writeText(JSON.stringify(complete, null, 2));
			setShowClawexaModal(false);
		} catch (err) {
			setGenerateError(err instanceof Error ? err.message : "Failed to copy JSON");
		} finally {
			setIsGenerating(false);
		}
	}

	async function handleSendToClawexa() {
		if (selectedServices.size === 0) return;
		setClawexaAction("loading");
		setGenerateError(null);
		try {
			const complete = await generateStackComplete(stackParams);
			const res = await fetch(CLAWEXA_DEPLOY_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(complete),
			});
			if (!res.ok) throw new Error(`Deploy failed: ${res.status}`);
			setClawexaAction("sent");
		} catch (err) {
			setGenerateError(err instanceof Error ? err.message : "Send failed");
			setClawexaAction("error");
		}
	}

	function handleClose() {
		setShowClawexaModal(false);
		setClawexaAction("idle");
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="clawexa-modal-title"
		>
			<div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-lg">
				<h2 id="clawexa-modal-title" className="text-lg font-semibold text-foreground">
					Deploy to clawexa.net
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Download as ZIP, copy complete JSON, or send to the clawexa.net endpoint (when
					configured).
				</p>
				<div className="mt-4 flex flex-col gap-2">
					<button
						type="button"
						disabled={isGenerating}
						onClick={handleDownloadZip}
						className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface/80 focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
					>
						Download ZIP
					</button>
					<button
						type="button"
						disabled={isGenerating}
						onClick={handleCopyJson}
						className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface/80 focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
					>
						Copy complete JSON
					</button>
					<a
						href={CLAWEXA_SITE}
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-surface/80 focus-visible:ring-1 focus-visible:ring-primary"
					>
						Open clawexa.net
					</a>
					{CLAWEXA_DEPLOY_URL ? (
						<button
							type="button"
							disabled={isGenerating || clawexaAction === "sent"}
							onClick={handleSendToClawexa}
							className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
						>
							{clawexaAction === "loading"
								? "Sending…"
								: clawexaAction === "sent"
									? "Sent"
									: "Send to clawexa.net"}
						</button>
					) : null}
				</div>
				<div className="mt-4 flex justify-end">
					<button
						type="button"
						onClick={handleClose}
						className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 focus-visible:ring-1 focus-visible:ring-primary"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
