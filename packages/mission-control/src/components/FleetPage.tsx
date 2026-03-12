/**
 * FleetPage — Multi-instance dashboard with bulk ops and config diff.
 */

import {
	IconCircleCheck,
	IconCircleDot,
	IconCircleX,
	IconClock,
	IconLoader2,
	IconNetwork,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
	online: { color: "text-green-400", bg: "bg-green-500/20", icon: <IconCircleCheck size={14} /> },
	degraded: { color: "text-yellow-400", bg: "bg-yellow-500/20", icon: <IconCircleDot size={14} /> },
	offline: { color: "text-red-400", bg: "bg-red-500/20", icon: <IconCircleX size={14} /> },
	provisioning: {
		color: "text-blue-400",
		bg: "bg-blue-500/20",
		icon: <IconLoader2 size={14} className="animate-spin" />,
	},
};

export default function FleetPage() {
	const overview = useQuery(api.fleet.getFleetOverview);
	const instances = useQuery(api.fleet.listFleetInstances);
	const removeInstance = useMutation(api.fleet.removeFleetInstance);
	const bulkRemove = useMutation(api.fleet.bulkRemove);
	const bulkUpdateStatus = useMutation(api.fleet.bulkUpdateStatus);

	const [selected, setSelected] = useState<Set<Id<"fleetInstances">>>(new Set());
	const [showRegister, setShowRegister] = useState(false);

	const toggleSelect = (id: Id<"fleetInstances">) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectAll = () => {
		if (!instances) return;
		if (selected.size === instances.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(instances.map((i) => i._id)));
		}
	};

	const handleBulkRemove = async () => {
		if (selected.size === 0) return;
		await bulkRemove({ ids: [...selected] });
		setSelected(new Set());
	};

	const handleBulkOffline = async () => {
		if (selected.size === 0) return;
		await bulkUpdateStatus({ ids: [...selected], status: "offline" });
		setSelected(new Set());
	};

	const formatHeartbeat = (ts?: number) => {
		if (!ts) return "Never";
		const diff = Date.now() - ts;
		if (diff < 60_000) return "Just now";
		if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
		if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
		return `${Math.floor(diff / 86_400_000)}d ago`;
	};

	return (
		<div className="flex-1 overflow-y-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
					<IconNetwork size={22} />
					Fleet Management
				</h2>
				<button
					type="button"
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
					onClick={() => setShowRegister(true)}
				>
					<IconPlus size={16} /> Register Instance
				</button>
			</div>

			{/* Overview cards */}
			<div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
				<OverviewCard label="Total" value={overview?.total ?? 0} />
				<OverviewCard label="Online" value={overview?.online ?? 0} accent="text-green-400" />
				<OverviewCard label="Degraded" value={overview?.degraded ?? 0} accent="text-yellow-400" />
				<OverviewCard label="Offline" value={overview?.offline ?? 0} accent="text-red-400" />
			</div>

			{/* Bulk actions */}
			{selected.size > 0 && (
				<div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
					<span className="text-sm text-foreground">{selected.size} selected</span>
					<button
						type="button"
						onClick={handleBulkOffline}
						className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
					>
						Mark Offline
					</button>
					<button
						type="button"
						onClick={handleBulkRemove}
						className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
					>
						Remove
					</button>
					<button
						type="button"
						onClick={() => setSelected(new Set())}
						className="ml-auto text-xs text-muted-foreground hover:text-foreground"
					>
						Clear
					</button>
				</div>
			)}

			{/* Instance table */}
			<div className="bg-secondary/30 rounded-xl border border-border/30 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border/30 text-muted-foreground text-xs">
							<th className="p-3 text-left w-8">
								<input
									type="checkbox"
									className="rounded"
									checked={
										instances != null && instances.length > 0 && selected.size === instances.length
									}
									onChange={selectAll}
								/>
							</th>
							<th className="p-3 text-left">Label</th>
							<th className="p-3 text-left">Stack</th>
							<th className="p-3 text-left">Host</th>
							<th className="p-3 text-left">Status</th>
							<th className="p-3 text-left">Last Heartbeat</th>
							<th className="p-3 text-left">Config</th>
							<th className="p-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{instances && instances.length > 0 ? (
							instances.map((inst) => {
								const cfg = (STATUS_CONFIG[inst.status] ?? STATUS_CONFIG.offline)!;
								return (
									<tr key={inst._id} className="border-b border-border/10 hover:bg-secondary/20">
										<td className="p-3">
											<input
												type="checkbox"
												className="rounded"
												checked={selected.has(inst._id)}
												onChange={() => toggleSelect(inst._id)}
											/>
										</td>
										<td className="p-3 font-medium text-foreground">{inst.label}</td>
										<td className="p-3 text-muted-foreground">{inst.stackName}</td>
										<td className="p-3 text-muted-foreground font-mono text-xs">
											{inst.host ?? "—"}
										</td>
										<td className="p-3">
											<span
												className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${cfg.bg} ${cfg.color}`}
											>
												{cfg.icon} {inst.status}
											</span>
										</td>
										<td className="p-3 text-muted-foreground text-xs">
											<span className="flex items-center gap-1">
												<IconClock size={12} />
												{formatHeartbeat(inst.lastHeartbeat)}
											</span>
										</td>
										<td className="p-3">
											{inst.configHash ? (
												<span className="text-xs text-muted-foreground font-mono">
													{inst.configHash.slice(0, 8)}
												</span>
											) : (
												<span className="text-xs text-muted-foreground">—</span>
											)}
										</td>
										<td className="p-3 text-right">
											<button
												type="button"
												onClick={() => removeInstance({ id: inst._id })}
												className="p-1 hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-400"
												title="Remove instance"
											>
												<IconTrash size={14} />
											</button>
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td colSpan={8} className="p-8 text-center text-muted-foreground italic">
									No fleet instances registered. Click "Register Instance" to add one.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{showRegister && <RegisterInstanceModal onClose={() => setShowRegister(false)} />}
		</div>
	);
}

function OverviewCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
	return (
		<div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
			<p className="text-xs text-muted-foreground mb-1">{label}</p>
			<p className={`text-2xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
		</div>
	);
}

function RegisterInstanceModal({ onClose }: { onClose: () => void }) {
	const register = useMutation(api.fleet.registerFleetInstance);
	const stacks = useQuery(api.stacks.listStacks);
	const [stackId, setStackId] = useState<Id<"stacks"> | "">("");
	const [label, setLabel] = useState("");
	const [host, setHost] = useState("");

	const handleSubmit = async () => {
		if (!stackId || !label.trim()) return;
		await register({ stackId: stackId as Id<"stacks">, label, host: host || undefined });
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				className="absolute inset-0 bg-black/50"
				onClick={onClose}
				aria-label="Close fleet registration modal"
			/>
			<div className="relative bg-background rounded-xl border border-border p-6 w-full max-w-md space-y-4">
				<h3 className="text-lg font-semibold">Register Fleet Instance</h3>
				<div className="space-y-3">
					<div>
						<label htmlFor="fleet-stack" className="text-xs text-muted-foreground block mb-1">
							Stack
						</label>
						<select
							id="fleet-stack"
							className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50"
							value={stackId}
							onChange={(e) => setStackId(e.target.value as Id<"stacks">)}
						>
							<option value="">Select a stack...</option>
							{stacks?.map((s) => (
								<option key={s._id} value={s._id}>
									{s.projectName}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor="fleet-label" className="text-xs text-muted-foreground block mb-1">
							Label
						</label>
						<input
							id="fleet-label"
							className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							placeholder="production-eu-1"
						/>
					</div>
					<div>
						<label htmlFor="fleet-host" className="text-xs text-muted-foreground block mb-1">
							Host (optional)
						</label>
						<input
							id="fleet-host"
							className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50"
							value={host}
							onChange={(e) => setHost(e.target.value)}
							placeholder="192.168.1.100 or myserver.example.com"
						/>
					</div>
				</div>
				<div className="flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						className="px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90"
					>
						Register
					</button>
				</div>
			</div>
		</div>
	);
}
