import { IconArrowRight, IconFile, IconX } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import SandboxViewer from "./SandboxViewer";

interface TaskDetailPanelProps {
	taskId: Id<"tasks">;
	onClose: () => void;
	onPreviewDocument: (id: Id<"documents">) => void;
}

const STATUS_OPTIONS = [
	{ value: "inbox", label: "📥 Inbox" },
	{ value: "assigned", label: "📋 Assigned" },
	{ value: "in_progress", label: "⚡ In Progress" },
	{ value: "review", label: "🔍 Review" },
	{ value: "done", label: "✅ Done" },
];

export default function TaskDetailPanel({
	taskId,
	onClose,
	onPreviewDocument,
}: TaskDetailPanelProps) {
	const messages = useQuery(api.queries.listMessages, {
		taskId,
	});
	const tasks = useQuery(api.queries.listTasks, {});
	const agents = useQuery(api.queries.listAgents, {});
	const documents = useQuery(api.documents.listByTask, {
		taskId,
	});
	const sandboxSessions = useQuery(api.sandboxes.listAll, {
		taskId,
	});
	const updateStatus = useMutation(api.tasks.updateStatus);
	const sendMessage = useMutation(api.messages.send);

	const [newMessage, setNewMessage] = useState("");

	const task = tasks?.find((t) => t._id === taskId);

	if (!task) return null;

	const assignedAgents = (agents ?? []).filter((a) => task.assigneeIds.includes(a._id));

	const handleStatusChange = async (newStatus: string) => {
		const agent = agents?.[0];
		if (!agent) return;
		await updateStatus({
			taskId,
			status: newStatus as "inbox" | "assigned" | "in_progress" | "review" | "done" | "archived",
			agentId: agent._id,
		});
	};

	const handleSend = async () => {
		if (!newMessage.trim()) return;
		const agent = agents?.[0];
		if (!agent) return;
		await sendMessage({
			taskId,
			agentId: agent._id,
			content: newMessage.trim(),
		});
		setNewMessage("");
	};

	return (
		<div className="fixed top-(--header-height) right-0 bottom-0 w-[480px] max-w-full z-50 bg-card border-l border-border shadow-xl flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-border">
				<h2 className="text-base font-semibold text-card-foreground truncate pr-4">{task.title}</h2>
				<button
					aria-label="Close task detail panel"
					type="button"
					onClick={onClose}
					className="p-1.5 hover:bg-accent rounded-md text-muted-foreground"
				>
					<IconX size={18} />
				</button>
			</div>

			{/* Status & Meta */}
			<div className="p-4 border-b border-border space-y-3">
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground w-16">Status</span>
					<select
						aria-label="Task status"
						value={task.status}
						onChange={(e) => handleStatusChange(e.target.value)}
						className="text-xs bg-secondary rounded-md px-2 py-1 border border-border text-foreground"
					>
						{STATUS_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground w-16">Assigned</span>
					<div className="flex items-center gap-1.5">
						{assignedAgents.map((a) => (
							<span
								key={a._id}
								className="text-sm bg-secondary rounded-full px-2 py-0.5 text-secondary-foreground"
							>
								{a.avatar} {a.name}
							</span>
						))}
						{assignedAgents.length === 0 && (
							<span className="text-xs text-muted-foreground">None</span>
						)}
					</div>
				</div>

				{task.tags.length > 0 && (
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground w-16">Tags</span>
						<div className="flex flex-wrap gap-1">
							{task.tags.map((tag) => (
								<span
									key={tag}
									className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground"
								>
									{tag}
								</span>
							))}
						</div>
					</div>
				)}

				<p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
			</div>

			{/* Documents */}
			{documents && documents.length > 0 && (
				<div className="p-3 border-b border-border">
					<h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Documents</h4>
					<div className="space-y-1">
						{documents.map((doc) => (
							<button
								key={doc._id}
								type="button"
								onClick={() => onPreviewDocument(doc._id)}
								className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent text-left transition-colors"
							>
								<IconFile size={14} className="text-muted-foreground" />
								<span className="text-xs text-foreground truncate">{doc.title}</span>
								<IconArrowRight size={12} className="ml-auto text-muted-foreground" />
							</button>
						))}
					</div>
				</div>
			)}

			{/* Sandbox Sessions */}
			{sandboxSessions && sandboxSessions.filter((s) => s.status === "running").length > 0 && (
				<div className="p-3 border-b border-border">
					<h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
						Desktop Sandboxes
					</h4>
					<div className="space-y-2">
						{sandboxSessions
							.filter((s) => s.status === "running")
							.map((session) => (
								<SandboxViewer key={session._id} session={session} compact />
							))}
					</div>
				</div>
			)}

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-3">
				{messages?.map((msg) => (
					<div key={msg._id} className="flex gap-2">
						<span className="text-lg shrink-0">{msg.agentAvatar ?? "🤖"}</span>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-0.5">
								<span className="text-xs font-medium text-foreground">{msg.agentName}</span>
								<span className="text-[10px] text-muted-foreground">
									{new Date(msg._creationTime).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							</div>
							<div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
								{msg.content}
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Message Input */}
			<div className="p-3 border-t border-border">
				<div className="flex gap-2">
					<input
						type="text"
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSend()}
						placeholder="Add a comment..."
						className="flex-1 text-sm px-3 py-2 bg-input rounded-lg border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
					/>
					<button
						type="button"
						onClick={handleSend}
						className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
					>
						Send
					</button>
				</div>
			</div>
		</div>
	);
}
