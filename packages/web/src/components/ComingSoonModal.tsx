"use client";

import { useState } from "react";

interface ComingSoonModalProps {
	open: boolean;
	onClose: () => void;
}

const REQUEST_MAILTO =
	"mailto:bachir@bidew.io?subject=Clawexa%20early%20access" +
	"&body=What%20I%20want%20to%20run%3A%0A%0AWhat%20I%20am%20doing%20today%20instead%3A%0A%0A";

export function ComingSoonModal({ open, onClose }: ComingSoonModalProps) {
	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="coming-soon-title"
		>
			<div className="w-full max-w-md border border-border bg-background p-8 shadow-lg text-center">
				<div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-1">
					<span className="h-1.5 w-1.5 rounded-full bg-primary" />
					<span className="font-mono text-[9px] uppercase tracking-widest text-primary">
						PRIVATE EARLY ACCESS
					</span>
				</div>

				<h2 id="coming-soon-title" className="text-2xl font-bold tracking-tight text-foreground">
					WANT US TO <span className="text-muted-foreground/60">RUN IT?</span>
				</h2>

				<p className="mt-4 text-sm text-muted-foreground leading-relaxed">
					We will deploy and operate this stack for you on a dedicated VPS. Self-serve signup is not
					open yet, so during early access we set instances up by hand.
				</p>

				<p className="mt-3 text-sm text-muted-foreground leading-relaxed">
					Tell us what you are trying to run and what you are doing today instead. We will tell you
					honestly whether this is a fit.
				</p>

				<a
					href={REQUEST_MAILTO}
					className="mt-8 flex h-12 w-full items-center justify-center bg-primary font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
				>
					REQUEST AN INSTANCE &rarr;
				</a>

				<button
					type="button"
					onClick={onClose}
					className="mt-3 flex h-12 w-full items-center justify-center border border-border font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
				>
					NO THANKS, I&apos;LL SELF-HOST
				</button>

				<p className="mt-6 font-mono text-[10px] text-muted-foreground/60">
					better-openclaw stays free and AGPL-3.0 either way.
				</p>
			</div>
		</div>
	);
}

/**
 * Hook that provides state management for the Coming Soon modal.
 * Use this in components that need to intercept cloud actions.
 */
export function useComingSoonModal() {
	const [isOpen, setIsOpen] = useState(false);
	return {
		isOpen,
		open: () => setIsOpen(true),
		close: () => setIsOpen(false),
	};
}
