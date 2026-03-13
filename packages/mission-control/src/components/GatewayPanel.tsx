import {
	IconActivity,
	IconAlertTriangle,
	IconCircleCheck,
	IconCircleX,
	IconLoader2,
	IconPlugConnected,
	IconPlugConnectedX,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import {
	type ConnectionState,
	type GatewayLogEntry,
	useGatewaySocket,
} from "../lib/useGatewaySocket";

const STATE_LABELS: Record<ConnectionState, { label: string; color: string }> = {
	disconnected: { label: "Disconnected", color: "text-muted-foreground" },
	connecting: { label: "Connecting...", color: "text-[var(--accent-orange)]" },
	handshaking: { label: "Handshaking...", color: "text-[var(--accent-orange)]" },
	connected: { label: "Connected", color: "text-[var(--accent-green)]" },
};

const LOG_LEVEL_STYLES: Record<string, string> = {
	info: "text-muted-foreground",
	warn: "text-[var(--accent-orange)]",
	error: "text-destructive",
};

function formatTimestamp(ts: number): string {
	return new Date(ts).toLocaleTimeString("en-US", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export default function GatewayPanel() {
	const { connectionState, isConnected, latency, logs, errorHelp, connect, disconnect } =
		useGatewaySocket();

	const [url, setUrl] = useState("ws://127.0.0.1:18789");
	const [token, setToken] = useState("");

	const handleConnect = useCallback(() => {
		if (isConnected) {
			disconnect();
		} else {
			connect(url, token || undefined);
		}
	}, [isConnected, url, token, connect, disconnect]);

	const stateInfo = STATE_LABELS[connectionState];

	return (
		<div className="p-6 space-y-6 overflow-y-auto h-full">
			{/* Header */}
			<div className="flex items-center gap-3">
				<IconPlugConnected size={24} className="text-primary" />
				<div>
					<h2 className="text-lg font-semibold text-foreground">Gateway Connection</h2>
					<p className="text-xs text-muted-foreground">
						Connect to an OpenClaw gateway via WebSocket
					</p>
				</div>
			</div>

			{/* Connection Card */}
			<div className="bg-card rounded-lg border border-border p-6 space-y-4">
				{/* Status Row */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<span
							className={`w-3 h-3 rounded-full ${
								isConnected
									? "bg-[var(--accent-green)]"
									: connectionState === "disconnected"
										? "bg-muted-foreground/40"
										: "bg-[var(--accent-orange)] animate-pulse"
							}`}
						/>
						<span className={`text-sm font-medium ${stateInfo.color}`}>{stateInfo.label}</span>
						{latency !== null && (
							<span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
								{latency}ms
							</span>
						)}
					</div>
				</div>

				{/* URL + Token Inputs */}
				<div className="space-y-3">
					<div>
						<label className="block text-xs font-medium text-muted-foreground mb-1">
							Gateway URL
						</label>
						<input
							type="text"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							disabled={isConnected}
							placeholder="ws://127.0.0.1:18789"
							className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
						/>
					</div>
					<div>
						<label className="block text-xs font-medium text-muted-foreground mb-1">
							Auth Token
							<span className="ml-1 text-muted-foreground/60">(optional)</span>
						</label>
						<input
							type="password"
							value={token}
							onChange={(e) => setToken(e.target.value)}
							disabled={isConnected}
							placeholder="Gateway auth token"
							className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
						/>
					</div>
				</div>

				{/* Connect Button */}
				<button
					type="button"
					onClick={handleConnect}
					disabled={connectionState === "connecting" || connectionState === "handshaking"}
					className={`flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
						isConnected
							? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
							: "bg-primary text-primary-foreground hover:opacity-90"
					}`}
				>
					{connectionState === "connecting" || connectionState === "handshaking" ? (
						<>
							<IconLoader2 size={16} className="animate-spin" />
							{connectionState === "connecting" ? "Connecting..." : "Handshaking..."}
						</>
					) : isConnected ? (
						<>
							<IconPlugConnectedX size={16} />
							Disconnect
						</>
					) : (
						<>
							<IconPlugConnected size={16} />
							Connect
						</>
					)}
				</button>
			</div>

			{/* Error Help */}
			{errorHelp && (
				<div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex gap-3">
					<IconAlertTriangle size={20} className="text-destructive shrink-0 mt-0.5" />
					<div className="text-sm text-destructive">{errorHelp}</div>
				</div>
			)}

			{/* Connection Info */}
			{isConnected && (
				<div className="grid grid-cols-3 gap-4">
					<div className="bg-card rounded-lg border border-border p-4 text-center">
						<IconCircleCheck size={18} className="text-[var(--accent-green)] mx-auto mb-1" />
						<p className="text-xs text-muted-foreground">Status</p>
						<p className="text-sm font-medium text-foreground">Online</p>
					</div>
					<div className="bg-card rounded-lg border border-border p-4 text-center">
						<IconActivity size={18} className="text-[var(--accent-blue)] mx-auto mb-1" />
						<p className="text-xs text-muted-foreground">Latency</p>
						<p className="text-sm font-medium text-foreground tabular-nums">
							{latency !== null ? `${latency}ms` : "—"}
						</p>
					</div>
					<div className="bg-card rounded-lg border border-border p-4 text-center">
						<IconPlugConnected size={18} className="text-primary mx-auto mb-1" />
						<p className="text-xs text-muted-foreground">Protocol</p>
						<p className="text-sm font-medium text-foreground">v3</p>
					</div>
				</div>
			)}

			{/* Log Viewer */}
			<div className="bg-card rounded-lg border border-border overflow-hidden">
				<div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
					<span className="text-xs font-medium text-muted-foreground">Connection Log</span>
					<span className="text-xs text-muted-foreground">{logs.length} entries</span>
				</div>
				<div className="max-h-[300px] overflow-y-auto font-mono text-xs">
					{logs.length === 0 && (
						<div className="px-4 py-6 text-center text-muted-foreground">
							No log entries yet. Connect to a gateway to see activity.
						</div>
					)}
					{logs.map((entry) => (
						<LogLine key={entry.id} entry={entry} />
					))}
				</div>
			</div>
		</div>
	);
}

function LogLine({ entry }: { entry: GatewayLogEntry }) {
	const icon =
		entry.level === "error" ? (
			<IconCircleX size={12} className="text-destructive shrink-0" />
		) : entry.level === "warn" ? (
			<IconAlertTriangle size={12} className="text-[var(--accent-orange)] shrink-0" />
		) : null;

	return (
		<div className="flex items-start gap-2 px-4 py-1.5 border-b border-border/30 hover:bg-secondary/10">
			<span className="text-muted-foreground/60 shrink-0 tabular-nums">
				{formatTimestamp(entry.timestamp)}
			</span>
			{icon}
			<span className={LOG_LEVEL_STYLES[entry.level] || "text-muted-foreground"}>
				{entry.message}
			</span>
		</div>
	);
}
