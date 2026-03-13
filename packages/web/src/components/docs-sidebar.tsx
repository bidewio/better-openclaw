"use client";

import {
	BookOpen,
	ChevronRight,
	Code,
	Globe,
	Menu,
	Package,
	Plug,
	Rocket,
	Server,
	Terminal,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
	title: string;
	href: string;
}

interface NavSection {
	title: string;
	icon: React.ReactNode;
	items: NavItem[];
}

const navigation: NavSection[] = [
	{
		title: "Getting Started",
		icon: <BookOpen className="h-4 w-4" />,
		items: [
			{ title: "Quick Start", href: "/docs" },
			{ title: "Installation", href: "/docs/installation" },
			{ title: "Direct Install", href: "/docs/installation#direct-install" },
		],
	},
	{
		title: "MCP Server",
		icon: <Plug className="h-4 w-4" />,
		items: [
			{ title: "Overview", href: "/docs/mcp" },
			{ title: "Tools Reference", href: "/docs/mcp/tools" },
		],
	},
	{
		title: "CLI Reference",
		icon: <Terminal className="h-4 w-4" />,
		items: [
			{ title: "Commands", href: "/docs/cli" },
			{ title: "Interactive Wizard", href: "/docs/cli/wizard" },
		],
	},
	{
		title: "API Reference",
		icon: <Globe className="h-4 w-4" />,
		items: [
			{ title: "Overview", href: "/docs/api" },
			{ title: "Endpoints", href: "/docs/api/endpoints" },
			{ title: "Addon Stack API", href: "/docs/api/addon-stack" },
		],
	},
	{
		title: "Services",
		icon: <Server className="h-4 w-4" />,
		items: [
			{ title: "Service Catalog", href: "/docs/services" },
			{ title: "Adding Services", href: "/docs/services/adding" },
		],
	},
	{
		title: "Skill Packs",
		icon: <Package className="h-4 w-4" />,
		items: [{ title: "All Skill Packs", href: "/docs/skill-packs" }],
	},
	{
		title: "Deployment",
		icon: <Rocket className="h-4 w-4" />,
		items: [
			{ title: "Local / Docker", href: "/docs/deployment" },
			{ title: "Bare-metal", href: "/docs/deployment#bare-metal" },
			{ title: "VPS / Cloud", href: "/docs/deployment/vps" },
			{ title: "Homelab", href: "/docs/deployment/homelab" },
		],
	},
	{
		title: "Guides",
		icon: <Code className="h-4 w-4" />,
		items: [
			{ title: "Hosting Integration", href: "/docs/guides/hosting-integration" },
		],
	},
	{
		title: "Community",
		icon: <Users className="h-4 w-4" />,
		items: [{ title: "Contributing", href: "/docs/contributing" }],
	},
];

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
	const pathname = usePathname();

	return (
		<nav className="space-y-6 py-6 px-4">
			{navigation.map((section) => (
				<div key={section.title}>
					<h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{section.icon}
						{section.title}
					</h3>
					<ul className="space-y-0.5">
						{section.items.map((item) => {
							const isActive = pathname === item.href;
							return (
								<li key={item.href}>
									<Link
										href={item.href}
										onClick={onLinkClick}
										className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
											isActive
												? "bg-primary/10 text-primary font-medium"
												: "text-muted-foreground hover:text-foreground hover:bg-muted/50"
										}`}
									>
										<ChevronRight
											className={`h-3 w-3 transition-opacity ${
												isActive ? "opacity-100" : "opacity-0"
											}`}
										/>
										{item.title}
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</nav>
	);
}

export function DocsSidebar() {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<>
			{/* Mobile toggle */}
			<div className="sticky top-14 z-40 flex items-center border-b border-border bg-background/95 backdrop-blur-sm px-4 py-2 lg:hidden">
				<button
					type="button"
					onClick={() => setMobileOpen(!mobileOpen)}
					className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
					aria-label="Toggle docs navigation"
				>
					{mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
					Navigation
				</button>
			</div>

			{/* Mobile overlay */}
			{mobileOpen && (
				<div
					className="fixed inset-0 z-30 bg-background/40 lg:hidden"
					onClick={() => setMobileOpen(false)}
					aria-hidden
				/>
			)}

			{/* Mobile sidebar */}
			<aside
				className={`fixed top-14 left-0 z-30 h-[calc(100vh-56px)] w-72 transform overflow-y-auto border-r border-border bg-background transition-transform duration-200 ease-out lg:hidden ${
					mobileOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<SidebarContent onLinkClick={() => setMobileOpen(false)} />
			</aside>

			{/* Desktop sidebar */}
			<aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-14 lg:h-[calc(100vh-56px)] lg:overflow-y-auto lg:border-r lg:border-border scrollbar-none">
				<SidebarContent />
			</aside>
		</>
	);
}
