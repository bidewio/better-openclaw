/**
 * NotificationTicker — Scrolling status ticker bar.
 * Uses deterministic timestamps to avoid hydration mismatch
 * (Math.random() differs between server and client).
 */

const TICKER_MESSAGES = [
	"WARN: Latency_spike detected in zone_3 (resolved)",
	"INFO: New node registered [US-WEST-2] — status: ONLINE",
	"SYS: Auto-scaling triggered — +2 compute nodes allocated",
	"OK: Health check passed — all 186 services nominal",
	"INFO: Skill pack 'researcher' deployed to cluster_alpha",
	"SYS: TLS certificates renewed — expires: 2027-02-21",
];

/** Deterministic pseudo-random timestamp based on index (avoids hydration mismatch). */
function deterministicTimestamp(index: number): string {
	const h = String((index * 7 + 3) % 24).padStart(2, "0");
	const m = String((index * 13 + 5) % 60).padStart(2, "0");
	const s = String((index * 17 + 11) % 60).padStart(2, "0");
	return `${h}:${m}:${s}`;
}

export function NotificationTicker() {
	const doubled = [...TICKER_MESSAGES, ...TICKER_MESSAGES];

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
				{doubled.map((msg, i) => (
					<span
						key={`ticker-${i}`}
						className="flex items-center gap-3 font-mono text-xs tracking-wider"
					>
						<span className="text-muted-foreground/60">{deterministicTimestamp(i)}</span>
						<span
							className={
								msg.startsWith("WARN")
									? "text-amber-500"
									: msg.startsWith("OK")
										? "text-emerald-500"
										: "text-muted-foreground"
							}
						>
							{msg}
						</span>
					</span>
				))}
			</div>
		</div>
	);
}
