"use client";

import { useState } from "react";

interface ComingSoonModalProps {
	open: boolean;
	onClose: () => void;
}

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
						COMING SOON
					</span>
				</div>

				<h2 id="coming-soon-title" className="text-2xl font-bold tracking-tight text-foreground">
					CLAWEXA <span className="text-muted-foreground/60">CLOUD</span>
				</h2>

				<p className="mt-4 text-sm text-muted-foreground leading-relaxed">
					Clawexa Cloud is currently under development. The hosted version of better-openclaw will
					let you deploy AI agent stacks without managing servers, Docker, or infrastructure.
				</p>

				<p className="mt-3 font-mono text-xs text-muted-foreground/60">Stay tuned for updates.</p>

				<button
					type="button"
					onClick={onClose}
					className="mt-8 flex h-12 w-full items-center justify-center border border-border font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
				>
					CLOSE
				</button>
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
