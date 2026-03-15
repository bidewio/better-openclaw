import {
	IconBell,
	IconChartBar,
	IconChefHat,
	IconCoins,
	IconDeviceDesktop,
	IconLayoutSidebar,
	IconMenu2,
	IconMessageCircle,
	IconNetwork,
	IconPlugConnected,
	IconReport,
	IconSearch,
	IconServer,
	IconShieldCheck,
	IconSparkles,
	IconTargetArrow,
	IconTerminal2,
} from "@tabler/icons-react";
import SignOut from "./Signout";

export type ActiveView =
	| "missions"
	| "services"
	| "skills"
	| "observability"
	| "fleet"
	| "compliance"
	| "sessions"
	| "gateway"
	| "chat"
	| "tokens"
	| "standup"
	| "sandboxes";

interface HeaderProps {
	onOpenAgents: () => void;
	onOpenLiveFeed: () => void;
	onOpenClawRecipes: () => void;
	onOpenSearch: () => void;
	activeView: ActiveView;
	onChangeView: (view: ActiveView) => void;
}

const NAV_ITEMS: { view: ActiveView; label: string; icon: React.ReactNode }[] = [
	{ view: "missions", label: "Missions", icon: <IconTargetArrow size={16} /> },
	{ view: "services", label: "Services", icon: <IconServer size={16} /> },
	{ view: "skills", label: "Skills", icon: <IconSparkles size={16} /> },
	{ view: "observability", label: "Observability", icon: <IconChartBar size={16} /> },
	{ view: "fleet", label: "Fleet", icon: <IconNetwork size={16} /> },
	{ view: "compliance", label: "Compliance", icon: <IconShieldCheck size={16} /> },
	{ view: "sessions", label: "Sessions", icon: <IconTerminal2 size={16} /> },
	{ view: "gateway", label: "Gateway", icon: <IconPlugConnected size={16} /> },
	{ view: "chat", label: "Chat", icon: <IconMessageCircle size={16} /> },
	{ view: "tokens", label: "Tokens", icon: <IconCoins size={16} /> },
	{ view: "standup", label: "Standup", icon: <IconReport size={16} /> },
	{ view: "sandboxes", label: "Sandboxes", icon: <IconDeviceDesktop size={16} /> },
];

export default function Header({
	onOpenAgents,
	onOpenLiveFeed,
	onOpenClawRecipes,
	onOpenSearch,
	activeView,
	onChangeView,
}: HeaderProps) {
	return (
		<header
			className="flex items-center justify-between px-6 border-b border-border/50 glass-panel z-10"
			style={{ gridArea: "header" }}
		>
			<div className="flex items-center gap-3">
				{/* Mobile drawer toggles */}
				<button
					type="button"
					className="md:hidden p-2 hover:bg-accent rounded-lg"
					onClick={onOpenAgents}
					aria-label="Open agents sidebar"
				>
					<IconMenu2 size={20} />
				</button>
				<span className="text-2xl">🎯</span>
				<div>
					<h1 className="text-lg font-semibold text-foreground leading-tight">Mission Control</h1>
					<p className="text-xs text-muted-foreground">Better OpenClaw • Agent Dashboard</p>
				</div>

				{/* View navigation tabs */}
				<nav className="hidden md:flex items-center gap-1 ml-6 bg-secondary/50 rounded-lg p-1">
					{NAV_ITEMS.map(({ view, label, icon }) => (
						<button
							key={view}
							type="button"
							onClick={() => onChangeView(view)}
							className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
								activeView === view
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{icon}
							{label}
						</button>
					))}
				</nav>
			</div>

			<div className="flex items-center gap-4">
				<button
					type="button"
					className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
					onClick={onOpenSearch}
					aria-label="Search"
				>
					<IconSearch size={16} />
					<span className="text-xs">Search</span>
					<kbd className="ml-1 text-[10px] px-1.5 py-0.5 bg-background rounded border border-border/50">
						Ctrl+K
					</kbd>
				</button>
				<button
					type="button"
					className="hidden md:flex p-2 hover:bg-accent rounded-lg items-center gap-2 text-muted-foreground transition-colors"
					onClick={onOpenClawRecipes}
					aria-label="Open ClawRecipes Server Configuration"
				>
					<IconChefHat size={20} />
					<span className="text-sm font-medium">ClawRecipes</span>
				</button>
				<button
					type="button"
					className="md:hidden p-2 hover:bg-accent rounded-lg"
					onClick={onOpenLiveFeed}
					aria-label="Open live feed"
				>
					<IconLayoutSidebar size={20} />
				</button>
				<button
					type="button"
					className="relative p-2 hover:bg-accent rounded-lg text-muted-foreground"
					aria-label="Notifications"
				>
					<IconBell size={20} />
				</button>
				<SignOut />
			</div>
		</header>
	);
}
