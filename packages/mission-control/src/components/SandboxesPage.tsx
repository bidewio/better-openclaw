import { IconDeviceDesktop } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import SandboxViewer from "./SandboxViewer";

export default function SandboxesPage() {
	const activeSessions = useQuery(api.sandboxes.listActive, {});
	const allSessions = useQuery(api.sandboxes.listAll, {});
	const [selectedSessionId, setSelectedSessionId] = useState<Id<"sandboxSessions"> | null>(null);

	const allItems = allSessions ?? [];
	const selectedSession = selectedSessionId
		? (allItems.find((s) => s._id === selectedSessionId) ?? null)
		: (activeSessions?.[0] ?? null);

	return (
		<div className="p-6 space-y-6 overflow-y-auto h-full">
			{/* Header */}
			<div className="flex items-center gap-3">
				<IconDeviceDesktop size={24} className="text-primary" />
				<div>
					<h2 className="text-lg font-semibold text-foreground">Desktop Sandboxes</h2>
					<p className="text-xs text-muted-foreground">
						Live VNC desktop sessions from OpenSandbox
					</p>
				</div>
			</div>

			{/* Active Sessions Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Session list sidebar */}
				<div className="bg-card rounded-lg border border-border overflow-hidden">
					<div className="px-4 py-2 border-b border-border bg-secondary/30">
						<span className="text-xs font-medium text-muted-foreground">
							Sessions ({activeSessions?.length ?? 0} active)
						</span>
					</div>
					<div className="max-h-[500px] overflow-y-auto">
						{allItems.map((session) => (
							<button
								key={session._id}
								type="button"
								onClick={() => setSelectedSessionId(session._id)}
								className={`w-full text-left px-4 py-3 border-b border-border/30 hover:bg-secondary/10 transition-colors ${
									selectedSessionId === session._id ||
									(!selectedSessionId && activeSessions?.[0]?._id === session._id)
										? "bg-secondary/20"
										: ""
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="text-xs font-mono text-foreground truncate">
										{session.sandboxId.slice(0, 16)}
									</span>
									<span
										className={`text-[10px] px-1.5 py-0.5 rounded ${
											session.status === "running"
												? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
												: session.status === "error"
													? "bg-destructive/20 text-destructive"
													: "bg-secondary text-muted-foreground"
										}`}
									>
										{session.status}
									</span>
								</div>
								<div className="text-[10px] text-muted-foreground mt-1 truncate">
									{session.image}
								</div>
							</button>
						))}
						{allItems.length === 0 && (
							<div className="px-4 py-8 text-center text-xs text-muted-foreground">
								No sandbox sessions yet. Create a desktop sandbox using the code-sandbox skill's{" "}
								<code>create_desktop</code> action.
							</div>
						)}
					</div>
				</div>

				{/* Viewer (2/3 width) */}
				<div className="lg:col-span-2">
					{selectedSession ? (
						<SandboxViewer session={selectedSession} />
					) : (
						<div className="bg-card rounded-lg border border-border h-[500px] flex items-center justify-center">
							<div className="text-center">
								<IconDeviceDesktop size={32} className="text-muted-foreground mx-auto mb-2" />
								<p className="text-sm text-muted-foreground">
									{allItems.length > 0
										? "Select a sandbox session to view"
										: "No active sandbox sessions"}
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
