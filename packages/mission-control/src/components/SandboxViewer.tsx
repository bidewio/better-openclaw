import {
	IconCircleCheck,
	IconCircleX,
	IconDeviceDesktop,
	IconExternalLink,
	IconLoader2,
	IconMaximize,
	IconMinimize,
	IconPlayerStop,
	IconRefresh,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useCallback, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface SandboxSession {
	_id: Id<"sandboxSessions">;
	sandboxId: string;
	novncUrl: string;
	vncEndpoint?: string;
	devtoolsUrl?: string;
	image: string;
	resolution?: string;
	status: "creating" | "running" | "terminated" | "error";
	errorMessage?: string;
}

interface SandboxViewerProps {
	session: SandboxSession;
	/** Compact mode for inline embedding in TaskDetailPanel */
	compact?: boolean;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
	creating: {
		icon: <IconLoader2 size={14} className="animate-spin" />,
		label: "Creating",
		color: "text-[var(--accent-orange)]",
	},
	running: {
		icon: <IconCircleCheck size={14} />,
		label: "Running",
		color: "text-[var(--accent-green)]",
	},
	terminated: {
		icon: <IconCircleX size={14} />,
		label: "Terminated",
		color: "text-muted-foreground",
	},
	error: {
		icon: <IconCircleX size={14} />,
		label: "Error",
		color: "text-destructive",
	},
};

export default function SandboxViewer({ session, compact = false }: SandboxViewerProps) {
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [activeTab, setActiveTab] = useState<"vnc" | "devtools">("vnc");
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const terminateSession = useMutation(api.sandboxes.terminateSession);

	const statusInfo = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.error!;
	const isChrome = session.image.includes("chrome");
	const hasDevTools = isChrome && session.devtoolsUrl;

	const handleTerminate = useCallback(async () => {
		await terminateSession({ sessionId: session._id });
	}, [terminateSession, session._id]);

	const handleRefresh = useCallback(() => {
		if (iframeRef.current) {
			iframeRef.current.src = iframeRef.current.src;
		}
	}, []);

	const handleFullscreen = useCallback(() => {
		setIsFullscreen((prev) => !prev);
	}, []);

	const containerClass = isFullscreen
		? "fixed inset-0 z-[100] bg-background flex flex-col"
		: compact
			? "bg-card rounded-lg border border-border overflow-hidden"
			: "bg-card rounded-lg border border-border overflow-hidden h-full flex flex-col";

	const iframeHeight = compact ? "h-[300px]" : isFullscreen ? "flex-1" : "h-[500px]";

	const currentUrl =
		activeTab === "devtools" && hasDevTools ? session.devtoolsUrl! : session.novncUrl;

	return (
		<div className={containerClass}>
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
				<div className="flex items-center gap-2">
					<IconDeviceDesktop size={16} className="text-primary" />
					<span className="text-xs font-medium text-foreground truncate">
						{session.sandboxId.slice(0, 12)}
					</span>
					<span className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
						{statusInfo.icon}
						{statusInfo.label}
					</span>
				</div>

				<div className="flex items-center gap-1">
					{/* Tab buttons for Chrome DevTools */}
					{hasDevTools && (
						<div className="flex items-center gap-0.5 bg-secondary/50 rounded p-0.5 mr-2">
							<button
								type="button"
								onClick={() => setActiveTab("vnc")}
								className={`px-2 py-0.5 text-[10px] rounded ${
									activeTab === "vnc" ? "bg-background text-foreground" : "text-muted-foreground"
								}`}
							>
								Desktop
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("devtools")}
								className={`px-2 py-0.5 text-[10px] rounded ${
									activeTab === "devtools"
										? "bg-background text-foreground"
										: "text-muted-foreground"
								}`}
							>
								DevTools
							</button>
						</div>
					)}

					<button
						type="button"
						onClick={handleRefresh}
						className="p-1 hover:bg-accent rounded text-muted-foreground"
						title="Refresh viewer"
					>
						<IconRefresh size={14} />
					</button>
					<a
						href={currentUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="p-1 hover:bg-accent rounded text-muted-foreground"
						title="Open in new tab"
					>
						<IconExternalLink size={14} />
					</a>
					<button
						type="button"
						onClick={handleFullscreen}
						className="p-1 hover:bg-accent rounded text-muted-foreground"
						title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
					>
						{isFullscreen ? <IconMinimize size={14} /> : <IconMaximize size={14} />}
					</button>
					{session.status === "running" && (
						<button
							type="button"
							onClick={handleTerminate}
							className="p-1 hover:bg-destructive/20 rounded text-destructive"
							title="Terminate sandbox"
						>
							<IconPlayerStop size={14} />
						</button>
					)}
				</div>
			</div>

			{/* iframe viewer */}
			{session.status === "running" ? (
				<iframe
					ref={iframeRef}
					src={currentUrl}
					className={`w-full ${iframeHeight} border-0`}
					title={`Sandbox ${session.sandboxId}`}
					sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
					allow="clipboard-read; clipboard-write"
				/>
			) : session.status === "creating" ? (
				<div className={`w-full ${iframeHeight} flex items-center justify-center`}>
					<div className="text-center">
						<IconLoader2 size={32} className="animate-spin text-primary mx-auto mb-2" />
						<p className="text-sm text-muted-foreground">Creating sandbox...</p>
					</div>
				</div>
			) : (
				<div className={`w-full ${iframeHeight} flex items-center justify-center`}>
					<div className="text-center">
						<IconCircleX size={32} className="text-muted-foreground mx-auto mb-2" />
						<p className="text-sm text-muted-foreground">
							{session.status === "error"
								? (session.errorMessage ?? "Sandbox error")
								: "Sandbox terminated"}
						</p>
					</div>
				</div>
			)}

			{/* Footer metadata */}
			{!compact && (
				<div className="px-3 py-2 border-t border-border text-xs text-muted-foreground flex items-center gap-3">
					<span className="bg-secondary px-2 py-0.5 rounded font-mono">{session.image}</span>
					{session.resolution && <span>{session.resolution}</span>}
				</div>
			)}
		</div>
	);
}
