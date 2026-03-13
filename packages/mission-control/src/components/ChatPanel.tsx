import { IconLoader2, IconMessage, IconSend } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

// Agent color themes for message bubbles
const AGENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
	LEAD: {
		bg: "bg-[var(--accent-orange)]/15",
		text: "text-[var(--accent-orange)]",
		border: "border-[var(--accent-orange)]/30",
	},
	INT: {
		bg: "bg-[var(--accent-blue)]/15",
		text: "text-[var(--accent-blue)]",
		border: "border-[var(--accent-blue)]/30",
	},
	SPC: {
		bg: "bg-[var(--accent-brown)]/15",
		text: "text-[var(--accent-brown)]",
		border: "border-[var(--accent-brown)]/30",
	},
};

const DEFAULT_COLORS = { bg: "bg-secondary/50", text: "text-foreground", border: "border-border" };

function formatTime(ts: number): string {
	return new Date(ts).toLocaleTimeString("en-US", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function ChatPanel() {
	const conversations = useQuery(api.chat.listConversations);
	const sendMessage = useMutation(api.chat.sendMessage);
	const agents = useQuery(api.queries.listAgents);

	const [activeConversation, setActiveConversation] = useState<string | null>(null);
	const [input, setInput] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [showNewChat, setShowNewChat] = useState(false);
	const [newChatAgent, setNewChatAgent] = useState<string>("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom on new messages
	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const handleSend = useCallback(async () => {
		if (!input.trim() || !activeConversation || isSending) return;
		setIsSending(true);
		try {
			await sendMessage({
				conversationId: activeConversation,
				content: input.trim(),
				fromUser: "operator",
				messageType: "text",
			});
			setInput("");
			setTimeout(scrollToBottom, 100);
		} finally {
			setIsSending(false);
		}
	}, [input, activeConversation, isSending, sendMessage, scrollToBottom]);

	const handleNewChat = useCallback(() => {
		if (!newChatAgent) return;
		const convId = `chat-${newChatAgent}-${Date.now()}`;
		setActiveConversation(convId);
		setShowNewChat(false);
		setNewChatAgent("");
	}, [newChatAgent]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	return (
		<div className="flex h-full">
			{/* Conversation List */}
			<div className="w-64 border-r border-border bg-card flex flex-col">
				<div className="p-4 border-b border-border flex items-center justify-between">
					<h3 className="text-sm font-semibold text-foreground">Conversations</h3>
					<button
						type="button"
						onClick={() => setShowNewChat(!showNewChat)}
						className="p-1 hover:bg-accent rounded text-muted-foreground"
					>
						<IconMessage size={16} />
					</button>
				</div>

				{showNewChat && (
					<div className="p-3 border-b border-border bg-secondary/30 space-y-2">
						<select
							value={newChatAgent}
							onChange={(e) => setNewChatAgent(e.target.value)}
							className="w-full text-xs bg-background border border-border rounded px-2 py-1.5 text-foreground"
						>
							<option value="">Select agent...</option>
							{agents?.map((a) => (
								<option key={a._id} value={a.name}>
									{a.avatar} {a.name}
								</option>
							))}
						</select>
						<button
							type="button"
							onClick={handleNewChat}
							disabled={!newChatAgent}
							className="w-full text-xs bg-primary text-primary-foreground rounded px-2 py-1.5 disabled:opacity-50"
						>
							Start Chat
						</button>
					</div>
				)}

				<div className="flex-1 overflow-y-auto">
					{conversations?.length === 0 && (
						<div className="p-4 text-center text-xs text-muted-foreground">
							No conversations yet
						</div>
					)}
					{conversations?.map((conv) => (
						<button
							key={conv.id}
							type="button"
							onClick={() => setActiveConversation(conv.id)}
							className={`w-full text-left px-4 py-3 border-b border-border/30 hover:bg-secondary/30 transition-colors ${
								activeConversation === conv.id ? "bg-secondary/50" : ""
							}`}
						>
							<div className="text-xs font-medium text-foreground truncate">{conv.id}</div>
							<div className="text-xs text-muted-foreground truncate mt-0.5">
								{conv.lastMessage}
							</div>
							<div className="flex items-center justify-between mt-1">
								<span className="text-xs text-muted-foreground/60">{conv.messageCount} msgs</span>
								<span className="text-xs text-muted-foreground/60">
									{formatTime(conv.lastMessageAt)}
								</span>
							</div>
						</button>
					))}
				</div>
			</div>

			{/* Message Area */}
			<div className="flex-1 flex flex-col">
				{!activeConversation ? (
					<div className="flex-1 flex items-center justify-center text-muted-foreground">
						<div className="text-center space-y-2">
							<IconMessage size={32} className="mx-auto opacity-40" />
							<p className="text-sm">Select or start a conversation</p>
						</div>
					</div>
				) : (
					<>
						{/* Messages */}
						<div className="flex-1 overflow-y-auto p-4 space-y-3">
							<MessageList conversationId={activeConversation} />
							<div ref={messagesEndRef} />
						</div>

						{/* Input */}
						<div className="p-4 border-t border-border bg-card">
							<div className="flex items-end gap-2">
								<textarea
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="Type a message..."
									rows={1}
									className="flex-1 resize-none px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary max-h-[120px]"
								/>
								<button
									type="button"
									onClick={handleSend}
									disabled={!input.trim() || isSending}
									className="p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
								>
									{isSending ? (
										<IconLoader2 size={16} className="animate-spin" />
									) : (
										<IconSend size={16} />
									)}
								</button>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function MessageList({ conversationId }: { conversationId: string }) {
	const messages = useQuery(api.chat.listMessages, { conversationId });

	if (messages === undefined) {
		return (
			<div className="flex items-center justify-center py-8 text-muted-foreground">
				<IconLoader2 size={16} className="animate-spin mr-2" />
				Loading...
			</div>
		);
	}

	if (messages.length === 0) {
		return (
			<div className="text-center py-8 text-xs text-muted-foreground">
				No messages yet. Start the conversation!
			</div>
		);
	}

	return (
		<>
			{messages.map((msg, _i) => {
				const isFromUser = !!msg.fromUser;
				const agentInfo = msg.fromAgent;
				const colors = agentInfo
					? AGENT_COLORS[agentInfo.role?.toUpperCase?.()] || DEFAULT_COLORS
					: DEFAULT_COLORS;

				const isSystem = msg.messageType === "system";

				if (isSystem) {
					return (
						<div key={msg._id} className="flex justify-center">
							<span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
								{msg.content}
							</span>
						</div>
					);
				}

				return (
					<div key={msg._id} className={`flex ${isFromUser ? "justify-end" : "justify-start"}`}>
						<div
							className={`max-w-[70%] rounded-lg px-3 py-2 border ${
								isFromUser
									? "bg-primary/10 border-primary/20 text-foreground"
									: `${colors.bg} ${colors.border}`
							}`}
						>
							{!isFromUser && agentInfo && (
								<div className={`text-xs font-medium mb-1 ${colors.text}`}>
									{agentInfo.avatar} {agentInfo.name}
								</div>
							)}
							{isFromUser && (
								<div className="text-xs font-medium mb-1 text-primary">{msg.fromUser}</div>
							)}
							<div className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</div>
							<div className="text-xs text-muted-foreground/60 mt-1 text-right">
								{formatTime(msg._creationTime)}
							</div>
						</div>
					</div>
				);
			})}
		</>
	);
}
