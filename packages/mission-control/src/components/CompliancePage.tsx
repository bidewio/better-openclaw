/**
 * CompliancePage — Audit trail, PII detection, and policy management.
 */

import {
	IconAlertTriangle,
	IconEye,
	IconPlus,
	IconShieldCheck,
	IconToggleLeft,
	IconToggleRight,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

const ACTOR_TYPE_COLORS: Record<string, string> = {
	agent: "bg-purple-500/20 text-purple-400",
	user: "bg-blue-500/20 text-blue-400",
	system: "bg-gray-500/20 text-gray-400",
};

const POLICY_TYPE_LABELS: Record<string, string> = {
	"pii-detection": "PII Detection",
	"access-control": "Access Control",
	"config-requirement": "Config Requirement",
	retention: "Data Retention",
};

export default function CompliancePage() {
	const [auditFilter, setAuditFilter] = useState<string | undefined>(undefined);
	const [piiOnly, setPiiOnly] = useState(false);
	const [showAddPolicy, setShowAddPolicy] = useState(false);

	const score = useQuery(api.compliance.getComplianceScore);
	const auditLog = useQuery(api.compliance.listAuditLog, {
		resourceType: auditFilter,
		piiOnly: piiOnly || undefined,
		limit: 50,
	});
	const piiSummary = useQuery(api.compliance.getPiiSummary);
	const policies = useQuery(api.compliance.listPolicies);

	const togglePolicy = useMutation(api.compliance.togglePolicy);
	const deletePolicy = useMutation(api.compliance.deletePolicy);

	return (
		<div className="flex-1 overflow-y-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
					<IconShieldCheck size={22} />
					Compliance & Governance
				</h2>
			</div>

			{/* Score + PII summary */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
				{/* Compliance score */}
				<div className="bg-secondary/30 rounded-xl p-5 border border-border/30 flex items-center gap-4">
					<div
						className={`text-4xl font-bold ${
							(score?.score ?? 100) >= 80
								? "text-green-400"
								: (score?.score ?? 100) >= 50
									? "text-yellow-400"
									: "text-red-400"
						}`}
					>
						{score?.score ?? 100}%
					</div>
					<div>
						<p className="text-sm font-medium text-foreground">Compliance Score</p>
						<p className="text-xs text-muted-foreground">
							{score?.passing ?? 0} of {score?.total ?? 0} policies passing
						</p>
						{(score?.totalViolations ?? 0) > 0 && (
							<p className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
								<IconAlertTriangle size={12} /> {score?.totalViolations} violations
							</p>
						)}
					</div>
				</div>

				{/* PII detection summary */}
				<div className="bg-secondary/30 rounded-xl p-5 border border-border/30">
					<div className="flex items-center gap-2 mb-2">
						<IconEye size={16} className="text-muted-foreground" />
						<span className="text-sm font-medium text-foreground">PII Detection</span>
					</div>
					{piiSummary && piiSummary.totalPiiEntries > 0 ? (
						<>
							<p className="text-xs text-muted-foreground mb-2">
								{piiSummary.totalPiiEntries} entries with PII
							</p>
							<div className="flex flex-wrap gap-1">
								{piiSummary.fields.map((f) => (
									<span
										key={f.field}
										className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded"
									>
										{f.field} ({f.count})
									</span>
								))}
							</div>
						</>
					) : (
						<p className="text-xs text-muted-foreground">No PII detected</p>
					)}
				</div>

				{/* Quick stats */}
				<div className="bg-secondary/30 rounded-xl p-5 border border-border/30">
					<p className="text-sm font-medium text-foreground mb-2">Policy Overview</p>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<p className="text-2xl font-bold text-foreground">
								{policies?.filter((p) => p.enabled).length ?? 0}
							</p>
							<p className="text-xs text-muted-foreground">Active Policies</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-foreground">{auditLog?.length ?? 0}</p>
							<p className="text-xs text-muted-foreground">Audit Entries</p>
						</div>
					</div>
				</div>
			</div>

			{/* Policies table */}
			<section className="bg-secondary/30 rounded-xl p-4 border border-border/30">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-medium text-muted-foreground">Compliance Policies</h3>
					<button
						type="button"
						className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors"
						onClick={() => setShowAddPolicy(true)}
					>
						<IconPlus size={14} /> Add Policy
					</button>
				</div>
				<div className="space-y-1.5">
					{policies && policies.length > 0 ? (
						policies.map((policy) => (
							<div
								key={policy._id}
								className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/20"
							>
								<button
									type="button"
									onClick={() => togglePolicy({ id: policy._id, enabled: !policy.enabled })}
									className="text-muted-foreground hover:text-foreground"
								>
									{policy.enabled ? (
										<IconToggleRight size={18} className="text-green-400" />
									) : (
										<IconToggleLeft size={18} />
									)}
								</button>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-foreground">{policy.name}</p>
									<p className="text-xs text-muted-foreground truncate">{policy.description}</p>
								</div>
								<span className="px-2 py-0.5 bg-secondary text-muted-foreground rounded text-[10px]">
									{POLICY_TYPE_LABELS[policy.type] ?? policy.type}
								</span>
								{(policy.violationCount ?? 0) > 0 && (
									<span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">
										{policy.violationCount} violations
									</span>
								)}
								<button
									type="button"
									onClick={() => deletePolicy({ id: policy._id })}
									className="p-1 hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-400"
								>
									<IconTrash size={14} />
								</button>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground italic py-2 text-center">
							No policies configured. Add policies to enforce compliance standards.
						</p>
					)}
				</div>
			</section>

			{/* Audit log */}
			<section className="bg-secondary/30 rounded-xl p-4 border border-border/30">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-medium text-muted-foreground">Audit Log</h3>
					<div className="flex gap-1 items-center">
						<button
							type="button"
							onClick={() => setPiiOnly(!piiOnly)}
							className={`px-2 py-1 rounded text-xs transition-colors ${
								piiOnly
									? "bg-red-500/20 text-red-400"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							PII Only
						</button>
						{["all", "task", "agent", "stack", "document"].map((type) => (
							<button
								key={type}
								type="button"
								onClick={() => setAuditFilter(type === "all" ? undefined : type)}
								className={`px-2 py-1 rounded text-xs transition-colors ${
									(type === "all" && !auditFilter) || auditFilter === type
										? "bg-primary/20 text-primary"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{type === "all" ? "All" : type}
							</button>
						))}
					</div>
				</div>
				<div className="space-y-1 max-h-72 overflow-y-auto">
					{auditLog && auditLog.length > 0 ? (
						auditLog.map((entry) => (
							<div
								key={entry._id}
								className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/20"
							>
								<span className="text-[10px] text-muted-foreground w-16 shrink-0">
									{new Date(entry._creationTime).toLocaleTimeString()}
								</span>
								<span
									className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
										ACTOR_TYPE_COLORS[entry.actorType] ?? "bg-secondary text-foreground"
									}`}
								>
									{entry.actorType}
								</span>
								<span className="text-xs text-foreground truncate flex-1">
									<span className="font-medium">{entry.actorName}</span>{" "}
									<span className="text-muted-foreground">{entry.action}</span>
									{entry.resourceId && (
										<span className="text-muted-foreground">
											{" "}
											on {entry.resourceType}:{entry.resourceId.slice(0, 8)}
										</span>
									)}
								</span>
								{entry.piiDetected && (
									<span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">
										PII
									</span>
								)}
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground italic py-4 text-center">
							No audit entries recorded
						</p>
					)}
				</div>
			</section>

			{showAddPolicy && <AddPolicyModal onClose={() => setShowAddPolicy(false)} />}
		</div>
	);
}

function AddPolicyModal({ onClose }: { onClose: () => void }) {
	const upsertPolicy = useMutation(api.compliance.upsertPolicy);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [type, setType] = useState("pii-detection");
	const [config, setConfig] = useState("{}");

	const handleSubmit = async () => {
		if (!name.trim()) return;
		await upsertPolicy({ name, description, type, enabled: true, config });
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				className="absolute inset-0 bg-black/50"
				onClick={onClose}
				aria-label="Close compliance policy modal"
			/>
			<div className="relative bg-background rounded-xl border border-border p-6 w-full max-w-md space-y-4">
				<h3 className="text-lg font-semibold">New Compliance Policy</h3>
				<div className="space-y-3">
					<div>
						<label htmlFor="policy-name" className="text-xs text-muted-foreground block mb-1">
							Name
						</label>
						<input
							id="policy-name"
							className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="No PII in agent outputs"
						/>
					</div>
					<div>
						<label
							htmlFor="policy-description"
							className="text-xs text-muted-foreground block mb-1"
						>
							Description
						</label>
						<input
							id="policy-description"
							className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Ensure agent outputs do not contain PII"
						/>
					</div>
					<div>
						<label htmlFor="policy-type" className="text-xs text-muted-foreground block mb-1">
							Type
						</label>
						<select
							id="policy-type"
							className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50"
							value={type}
							onChange={(e) => setType(e.target.value)}
						>
							<option value="pii-detection">PII Detection</option>
							<option value="access-control">Access Control</option>
							<option value="config-requirement">Config Requirement</option>
							<option value="retention">Data Retention</option>
						</select>
					</div>
					<div>
						<label htmlFor="policy-config" className="text-xs text-muted-foreground block mb-1">
							Configuration (JSON)
						</label>
						<textarea
							id="policy-config"
							className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border/50 font-mono h-20 resize-none"
							value={config}
							onChange={(e) => setConfig(e.target.value)}
							placeholder='{"fields": ["email", "phone", "ssn"]}'
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
						Create
					</button>
				</div>
			</div>
		</div>
	);
}
