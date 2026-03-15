import { Authenticated, Unauthenticated } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import AddAgentModal from "./components/AddAgentModal";
import AddTaskModal from "./components/AddTaskModal";
import AgentDetailTray from "./components/AgentDetailTray";
import AgentsSidebar from "./components/AgentsSidebar";
import ChatPanel from "./components/ChatPanel";
import CompliancePage from "./components/CompliancePage";
import FleetPage from "./components/FleetPage";
import GatewayPanel from "./components/GatewayPanel";
import Header, { type ActiveView } from "./components/Header";
import MissionQueue from "./components/MissionQueue";
import ObservabilityPage from "./components/ObservabilityPage";
import RegisterStackModal from "./components/RegisterStackModal";
import RightSidebar from "./components/RightSidebar";
import SandboxesPage from "./components/SandboxesPage";
import SearchOverlay from "./components/SearchOverlay";
import ServicesPage from "./components/ServicesPage";
import SessionsPage from "./components/SessionsPage";
import SignInForm from "./components/SignIn";
import SkillsPage from "./components/SkillsPage";
import StandupPanel from "./components/StandupPanel";
import TaskDetailPanel from "./components/TaskDetailPanel";
import TokenDashboard from "./components/TokenDashboard";
import ClawRecipesTray from "./components/Trays/ClawRecipesTray";
import TrayContainer from "./components/Trays/TrayContainer";

export default function App() {
	const [activeView, setActiveView] = useState<ActiveView>("missions");
	const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
	const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
	const [showRegisterStackModal, setShowRegisterStackModal] = useState(false);

	const closeSidebars = useCallback(() => {
		setIsLeftSidebarOpen(false);
		setIsRightSidebarOpen(false);
	}, []);

	const isAnySidebarOpen = useMemo(
		() => isLeftSidebarOpen || isRightSidebarOpen,
		[isLeftSidebarOpen, isRightSidebarOpen],
	);

	useEffect(() => {
		if (!isAnySidebarOpen) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeSidebars();
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [closeSidebars, isAnySidebarOpen]);

	const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
	const [showAddTaskModal, setShowAddTaskModal] = useState(false);
	const [addTaskPreselectedAgentId, setAddTaskPreselectedAgentId] = useState<string | undefined>(
		undefined,
	);
	const [selectedAgentId, setSelectedAgentId] = useState<Id<"agents"> | null>(null);
	const [showAddAgentModal, setShowAddAgentModal] = useState(false);

	// Document tray state
	const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | null>(null);
	const [showConversationTray, setShowConversationTray] = useState(false);
	const [showPreviewTray, setShowPreviewTray] = useState(false);
	const [showClawRecipesTray, setShowClawRecipesTray] = useState(false);
	const [showSearch, setShowSearch] = useState(false);

	// Ctrl+K global shortcut for search
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				setShowSearch((prev) => !prev);
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	const handleSelectDocument = useCallback((id: Id<"documents"> | null) => {
		if (id === null) {
			setSelectedDocumentId(null);
			setShowConversationTray(false);
			setShowPreviewTray(false);
		} else {
			setSelectedDocumentId(id);
			setShowConversationTray(true);
			setShowPreviewTray(true);
		}
	}, []);

	const handlePreviewDocument = useCallback((id: Id<"documents">) => {
		setSelectedDocumentId(id);
		setShowConversationTray(true);
		setShowPreviewTray(true);
	}, []);

	const handleCloseConversation = useCallback(() => {
		setShowConversationTray(false);
		setShowPreviewTray(false);
		setSelectedDocumentId(null);
	}, []);

	const handleClosePreview = useCallback(() => {
		setShowPreviewTray(false);
	}, []);

	const handleOpenPreview = useCallback(() => {
		setShowPreviewTray(true);
	}, []);

	const handleOpenRegisterStack = useCallback(() => {
		setShowRegisterStackModal(true);
	}, []);

	return (
		<>
			<Authenticated>
				<main className="app-container dark">
					<Header
						onOpenAgents={() => {
							setIsLeftSidebarOpen(true);
							setIsRightSidebarOpen(false);
						}}
						onOpenLiveFeed={() => {
							setIsRightSidebarOpen(true);
							setIsLeftSidebarOpen(false);
						}}
						onOpenClawRecipes={() => setShowClawRecipesTray(true)}
						onOpenSearch={() => setShowSearch(true)}
						activeView={activeView}
						onChangeView={setActiveView}
					/>

					{isAnySidebarOpen && (
						<div className="drawer-backdrop" onClick={closeSidebars} aria-hidden="true" />
					)}

					{/* Missions view (original kanban) */}
					{activeView === "missions" && (
						<>
							<AgentsSidebar
								isOpen={isLeftSidebarOpen}
								onClose={() => setIsLeftSidebarOpen(false)}
								onAddTask={(preselectedAgentId) => {
									setAddTaskPreselectedAgentId(preselectedAgentId);
									setShowAddTaskModal(true);
								}}
								onAddAgent={() => setShowAddAgentModal(true)}
								onSelectAgent={(agentId) => setSelectedAgentId(agentId as Id<"agents">)}
							/>
							<MissionQueue selectedTaskId={selectedTaskId} onSelectTask={setSelectedTaskId} />
							<RightSidebar
								isOpen={isRightSidebarOpen}
								onClose={() => setIsRightSidebarOpen(false)}
								selectedDocumentId={selectedDocumentId}
								onSelectDocument={handleSelectDocument}
								onPreviewDocument={handlePreviewDocument}
							/>
							<TrayContainer
								selectedDocumentId={selectedDocumentId}
								showConversation={showConversationTray}
								showPreview={showPreviewTray}
								onCloseConversation={handleCloseConversation}
								onClosePreview={handleClosePreview}
								onOpenPreview={handleOpenPreview}
							/>
							{showAddTaskModal && (
								<AddTaskModal
									onClose={() => {
										setShowAddTaskModal(false);
										setAddTaskPreselectedAgentId(undefined);
									}}
									onCreated={(taskId) => {
										setShowAddTaskModal(false);
										setAddTaskPreselectedAgentId(undefined);
										setSelectedTaskId(taskId);
									}}
									initialAssigneeId={addTaskPreselectedAgentId}
								/>
							)}
							{selectedAgentId && (
								<div
									className="fixed inset-0 z-99"
									onClick={() => setSelectedAgentId(null)}
									aria-hidden="true"
								/>
							)}
							<AgentDetailTray agentId={selectedAgentId} onClose={() => setSelectedAgentId(null)} />
							{showAddAgentModal && (
								<AddAgentModal
									onClose={() => setShowAddAgentModal(false)}
									onCreated={() => setShowAddAgentModal(false)}
								/>
							)}
							{selectedTaskId && (
								<>
									<div
										className="fixed inset-0 z-40"
										onClick={() => setSelectedTaskId(null)}
										aria-hidden="true"
									/>
									<TaskDetailPanel
										taskId={selectedTaskId}
										onClose={() => setSelectedTaskId(null)}
										onPreviewDocument={handlePreviewDocument}
									/>
								</>
							)}
						</>
					)}

					{/* Services view */}
					{activeView === "services" && (
						<div style={{ gridArea: "main" }}>
							<ServicesPage onRegisterStack={handleOpenRegisterStack} />
						</div>
					)}

					{/* Skills view */}
					{activeView === "skills" && (
						<div style={{ gridArea: "main" }}>
							<SkillsPage onRegisterStack={handleOpenRegisterStack} />
						</div>
					)}

					{/* Observability view */}
					{activeView === "observability" && (
						<div style={{ gridArea: "main" }}>
							<ObservabilityPage />
						</div>
					)}

					{/* Fleet view */}
					{activeView === "fleet" && (
						<div style={{ gridArea: "main" }}>
							<FleetPage />
						</div>
					)}

					{/* Compliance view */}
					{activeView === "compliance" && (
						<div style={{ gridArea: "main" }}>
							<CompliancePage />
						</div>
					)}

					{/* Sessions view */}
					{activeView === "sessions" && (
						<div style={{ gridArea: "main" }}>
							<SessionsPage />
						</div>
					)}

					{/* Gateway view */}
					{activeView === "gateway" && (
						<div style={{ gridArea: "main" }}>
							<GatewayPanel />
						</div>
					)}

					{/* Chat view */}
					{activeView === "chat" && (
						<div style={{ gridArea: "main" }}>
							<ChatPanel />
						</div>
					)}

					{/* Tokens view */}
					{activeView === "tokens" && (
						<div style={{ gridArea: "main" }}>
							<TokenDashboard />
						</div>
					)}

					{/* Standup view */}
					{activeView === "standup" && (
						<div style={{ gridArea: "main" }}>
							<StandupPanel />
						</div>
					)}

					{/* Sandboxes view */}
					{activeView === "sandboxes" && (
						<div style={{ gridArea: "main" }}>
							<SandboxesPage />
						</div>
					)}
				</main>
			</Authenticated>
			<Unauthenticated>
				<SignInForm />
			</Unauthenticated>

			<ClawRecipesTray isOpen={showClawRecipesTray} onClose={() => setShowClawRecipesTray(false)} />
			<SearchOverlay isOpen={showSearch} onClose={() => setShowSearch(false)} />

			{showRegisterStackModal && (
				<RegisterStackModal
					onClose={() => setShowRegisterStackModal(false)}
					onRegistered={() => setShowRegisterStackModal(false)}
				/>
			)}
		</>
	);
}
