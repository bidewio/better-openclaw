/**
 * NotificationTicker — Scrolling status ticker bar.
 * Uses deterministic timestamps to avoid hydration mismatch
 * (Math.random() differs between server and client).
 */

interface TickerMessage {
	id: string;
	text: string;
}

function getTickerMessages(serviceCount: number): TickerMessage[] {
	return [
		"WARN: Latency_spike detected in zone_3 (resolved)",
		"INFO: New node registered [US-WEST-2] — status: ONLINE",
		"SYS: Auto-scaling triggered — +2 compute nodes allocated",
		`OK: Health check passed — all ${serviceCount} services nominal`,
		"INFO: Skill pack 'researcher' deployed to cluster_alpha",
		"SYS: TLS certificates renewed — expires: 2027-02-21",
	].map((text, index) => ({ id: `ticker-${index}`, text }));
}

/** Deterministic pseudo-random timestamp based on index (avoids hydration mismatch). */
function deterministicTimestamp(index: number): string {
	const h = String((index * 7 + 3) % 24).padStart(2, "0");
	const m = String((index * 13 + 5) % 60).padStart(2, "0");
	const s = String((index * 17 + 11) % 60).padStart(2, "0");
	return `${h}:${m}:${s}`;
}

interface NotificationTickerProps {
	serviceCount?: number;
}

export function NotificationTicker({ serviceCount = 186 }: NotificationTickerProps) {
	const tickerMessages = getTickerMessages(serviceCount);
	const doubled = [
		...tickerMessages.map((entry, index) => ({
			...entry,
			renderKey: `loop-a-${entry.id}`,
			sequence: index,
		})),
		...tickerMessages.map((entry, index) => ({
			...entry,
			renderKey: `loop-b-${entry.id}`,
			sequence: tickerMessages.length + index,
		})),
	];

	return (
		<div
			className="fixed top-16 left-0 right-0 z-30 h-8 overflow-hidden border-b border-border/50 bg-background/80 backdrop-blur-md lg:left-14"
			role="marquee"
			aria-label="System notification ticker"
		>
			<div
				className="flex h-full items-center gap-12 whitespace-nowrap"
				style={{ animation: "ticker-scroll 40s linear infinite" }}
			>
				{doubled.map((entry) => (
					<span
						key={entry.renderKey}
						className="flex items-center gap-3 font-mono text-xs tracking-wider"
					>
						<span className="text-muted-foreground/60">
							{deterministicTimestamp(entry.sequence)}
						</span>
						<span
							className={
								entry.text.startsWith("WARN")
									? "text-amber-500"
									: entry.text.startsWith("OK")
										? "text-emerald-500"
										: "text-muted-foreground"
							}
						>
							{entry.text}
						</span>
					</span>
				))}
			</div>
		</div>
	);
}
