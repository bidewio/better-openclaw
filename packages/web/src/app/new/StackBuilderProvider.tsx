"use client";

import { composeMultiFile } from "@better-openclaw/core/composer";
import { generateEnvFiles } from "@better-openclaw/core/generators/env";
import { getAllPresets } from "@better-openclaw/core/presets/registry";
import { resolve } from "@better-openclaw/core/resolver";
import { getAllServices } from "@better-openclaw/core/services/registry";
import { getAllSkillPacks } from "@better-openclaw/core/skills/registry";
import type {
	AgentFramework,
	AiProvider,
	GsdRuntime,
	ResolverOutput,
	ServiceDefinition,
	SkillPack,
} from "@better-openclaw/core/types";
import JSZip from "jszip";
import { useSearchParams } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { SelectedSkill } from "@/components/stack-builder/SkillSelectorModal";
import { fetchSavedStack, generateStack } from "@/lib/api-client";

interface DownloadOptions {
	deploymentType: "docker" | "bare-metal";
	platform: string;
}

interface StackBuilderContextType {
	// State
	selectedServices: Set<string>;
	setSelectedServices: React.Dispatch<React.SetStateAction<Set<string>>>;
	projectName: string;
	setProjectName: React.Dispatch<React.SetStateAction<string>>;
	searchQuery: string;
	setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
	activePreset: string | null;
	setActivePreset: React.Dispatch<React.SetStateAction<string | null>>;
	isGenerating: boolean;
	setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
	generateError: string | null;
	setGenerateError: React.Dispatch<React.SetStateAction<string | null>>;
	downloadComplete: boolean;
	setDownloadComplete: React.Dispatch<React.SetStateAction<boolean>>;
	pendingRemovalId: string | null;
	setPendingRemovalId: React.Dispatch<React.SetStateAction<string | null>>;
	showDeploymentModal: boolean;
	setShowDeploymentModal: React.Dispatch<React.SetStateAction<boolean>>;
	deploymentType: "docker" | "bare-metal";
	setDeploymentType: React.Dispatch<React.SetStateAction<"docker" | "bare-metal">>;
	platform: string;
	setPlatform: React.Dispatch<React.SetStateAction<string>>;
	lastDownloadOptions: DownloadOptions | null;
	setLastDownloadOptions: React.Dispatch<React.SetStateAction<DownloadOptions | null>>;
	showClawexaModal: boolean;
	setShowClawexaModal: React.Dispatch<React.SetStateAction<boolean>>;
	clawexaAction: "idle" | "loading" | "sent" | "error";
	setClawexaAction: React.Dispatch<React.SetStateAction<"idle" | "loading" | "sent" | "error">>;
	selectedSkillPacks: Set<string>;
	setSelectedSkillPacks: React.Dispatch<React.SetStateAction<Set<string>>>;
	selectedAiProviders: Set<AiProvider>;
	setSelectedAiProviders: React.Dispatch<React.SetStateAction<Set<AiProvider>>>;
	selectedGsdRuntimes: Set<GsdRuntime>;
	setSelectedGsdRuntimes: React.Dispatch<React.SetStateAction<Set<GsdRuntime>>>;
	selectedPrimaryFramework: AgentFramework;
	setSelectedPrimaryFramework: React.Dispatch<React.SetStateAction<AgentFramework>>;
	selectedCompanionFrameworks: Set<AgentFramework>;
	setSelectedCompanionFrameworks: React.Dispatch<React.SetStateAction<Set<AgentFramework>>>;
	resolverError: string | null;
	setResolverError: React.Dispatch<React.SetStateAction<string | null>>;
	showSkillModal: boolean;
	setShowSkillModal: React.Dispatch<React.SetStateAction<boolean>>;
	showDeployToServerModal: boolean;
	setShowDeployToServerModal: React.Dispatch<React.SetStateAction<boolean>>;
	selectedIndividualSkills: Map<string, SelectedSkill>;
	setSelectedIndividualSkills: React.Dispatch<React.SetStateAction<Map<string, SelectedSkill>>>;
	showSaveModal: boolean;
	setShowSaveModal: React.Dispatch<React.SetStateAction<boolean>>;
	savedStackId: string | null;
	setSavedStackId: React.Dispatch<React.SetStateAction<string | null>>;
	isLoadingStack: boolean;

	// Derived State
	allServices: ServiceDefinition[];
	allPresets: ReturnType<typeof getAllPresets>;
	allSkillPacks: SkillPack[];
	filteredServices: ServiceDefinition[];
	resolverOutput: ResolverOutput | null;
	resolvedServiceIds: Set<string>;
	composeYaml: string;
	envContent: string;

	// Handlers
	handleToggle: (id: string) => void;
	confirmMandatoryRemoval: () => void;
	cancelMandatoryRemoval: () => void;
	handlePreset: (presetId: string) => void;
	handleReset: () => void;
	handleDownload: (opts?: DownloadOptions) => Promise<void>;
}

const StackBuilderContext = createContext<StackBuilderContextType | null>(null);

export function useStackBuilder() {
	const context = useContext(StackBuilderContext);
	if (!context) {
		throw new Error("useStackBuilder must be used within a StackBuilderProvider");
	}
	return context;
}

export function StackBuilderProvider({ children }: { children: ReactNode }) {
	const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set(["tailscale"]));
	const [projectName, setProjectName] = useState("my-stack");
	const [searchQuery, setSearchQuery] = useState("");
	const [activePreset, setActivePreset] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generateError, setGenerateError] = useState<string | null>(null);
	const [downloadComplete, setDownloadComplete] = useState(false);
	const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
	const [showDeploymentModal, setShowDeploymentModal] = useState(false);
	const [deploymentType, setDeploymentType] = useState<"docker" | "bare-metal">("docker");
	const [platform, setPlatform] = useState<string>("linux/amd64");
	const [lastDownloadOptions, setLastDownloadOptions] = useState<DownloadOptions | null>(null);
	const [showClawexaModal, setShowClawexaModal] = useState(false);
	const [clawexaAction, setClawexaAction] = useState<"idle" | "loading" | "sent" | "error">("idle");
	const [selectedSkillPacks, setSelectedSkillPacks] = useState<Set<string>>(new Set());
	const [selectedAiProviders, setSelectedAiProviders] = useState<Set<AiProvider>>(
		new Set(["openai"]),
	);
	const [selectedGsdRuntimes, setSelectedGsdRuntimes] = useState<Set<GsdRuntime>>(new Set());
	const [selectedPrimaryFramework, setSelectedPrimaryFramework] =
		useState<AgentFramework>("openclaw");
	const [selectedCompanionFrameworks, setSelectedCompanionFrameworks] = useState<
		Set<AgentFramework>
	>(new Set());
	const [resolverError, setResolverError] = useState<string | null>(null);
	const [showSkillModal, setShowSkillModal] = useState(false);
	const [showDeployToServerModal, setShowDeployToServerModal] = useState(false);
	const [selectedIndividualSkills, setSelectedIndividualSkills] = useState<
		Map<string, SelectedSkill>
	>(new Map());
	const [showSaveModal, setShowSaveModal] = useState(false);
	const [savedStackId, setSavedStackId] = useState<string | null>(null);
	const [isLoadingStack, setIsLoadingStack] = useState(false);

	const searchParams = useSearchParams();

	// Load saved stack from URL
	useEffect(() => {
		const loadId = searchParams.get("load");
		if (!loadId) return;

		let cancelled = false;
		setIsLoadingStack(true);

		fetchSavedStack(loadId)
			.then((stack) => {
				if (cancelled) return;
				const config = (stack.config ?? {}) as Record<string, unknown>;
				const services = (stack.services ?? config.services ?? []) as string[];

				setProjectName((config.projectName as string) ?? stack.name ?? "my-stack");
				setSelectedServices(new Set(services));
				setSavedStackId(stack.id);

				if (Array.isArray(config.skillPacks)) {
					setSelectedSkillPacks(new Set(config.skillPacks as string[]));
				}
				if (Array.isArray(config.aiProviders)) {
					setSelectedAiProviders(new Set(config.aiProviders as AiProvider[]));
				}
				if (Array.isArray(config.gsdRuntimes)) {
					setSelectedGsdRuntimes(new Set(config.gsdRuntimes as GsdRuntime[]));
				}
				if (typeof config.primaryFramework === "string") {
					setSelectedPrimaryFramework(config.primaryFramework as AgentFramework);
				}
				if (Array.isArray(config.companionFrameworks)) {
					setSelectedCompanionFrameworks(new Set(config.companionFrameworks as AgentFramework[]));
				}
				if (Array.isArray(config.individualSkills)) {
					const map = new Map<string, SelectedSkill>();
					for (const s of config.individualSkills as Array<SelectedSkill & { id: string }>) {
						if (s.id) map.set(s.id, s);
					}
					setSelectedIndividualSkills(map);
				}
			})
			.catch((err) => {
				if (!cancelled) {
					console.error("Failed to load saved stack:", err);
					setGenerateError("Failed to load saved stack. It may have been deleted.");
				}
			})
			.finally(() => {
				if (!cancelled) setIsLoadingStack(false);
			});

		return () => {
			cancelled = true;
		};
	}, [searchParams]);

	// Load all services, presets, and skill packs
	const allServices = useMemo(() => getAllServices(), []);
	const allPresets = useMemo(() => getAllPresets(), []);
	const allSkillPacks = useMemo(() => getAllSkillPacks(), []);

	// Filter services based on search query
	const filteredServices = useMemo(() => {
		if (!searchQuery.trim()) return allServices;
		const q = searchQuery.toLowerCase().trim();
		return allServices.filter(
			(s) =>
				s.name.toLowerCase().includes(q) ||
				s.description.toLowerCase().includes(q) ||
				s.tags.some((t) => t.toLowerCase().includes(q)),
		);
	}, [allServices, searchQuery]);

	// Resolve dependencies
	const resolverOutput = useMemo(() => {
		if (selectedServices.size === 0 && selectedSkillPacks.size === 0) {
			setResolverError(null);
			return null;
		}
		try {
			const result = resolve({
				services: Array.from(selectedServices),
				skillPacks: Array.from(selectedSkillPacks),
				aiProviders: Array.from(selectedAiProviders),
				gsdRuntimes: Array.from(selectedGsdRuntimes),
				primaryFramework: selectedPrimaryFramework,
				proxy: "none",
				gpu: false,
				platform: "linux/amd64",
				monitoring: false,
			});
			if (!result.isValid) {
				setResolverError(result.errors.map((e) => e.message).join("; "));
			} else {
				setResolverError(null);
			}
			return result;
		} catch (err) {
			setResolverError(err instanceof Error ? err.message : "Resolution failed");
			return null;
		}
	}, [
		selectedServices,
		selectedSkillPacks,
		selectedAiProviders,
		selectedGsdRuntimes,
		selectedPrimaryFramework,
	]);

	// Build a set of all resolved service IDs
	const resolvedServiceIds = useMemo(() => {
		if (!resolverOutput) return new Set<string>();
		return new Set(resolverOutput.services.map((s) => s.definition.id));
	}, [resolverOutput]);

	// Generate compose text
	const composeYaml = useMemo(() => {
		if (!resolverOutput || resolverOutput.services.length === 0) return "";
		try {
			const result = composeMultiFile(resolverOutput, {
				projectName: projectName || "my-stack",
				primaryFramework: selectedPrimaryFramework,
				companionFrameworks: Array.from(selectedCompanionFrameworks),
				proxy: "none",
				gpu: false,
				platform: "linux/amd64",
				deployment: "local",
				openclawVersion: "latest",
				openclawImage: "official",
				hardened: true,
				openclawInstallMethod: "docker",
			});
			return result.files[result.mainFile] ?? "";
		} catch {
			return "# Error generating preview...";
		}
	}, [resolverOutput, projectName, selectedPrimaryFramework, selectedCompanionFrameworks]);

	// Generate env text
	const envContent = useMemo(() => {
		if (!resolverOutput || resolverOutput.services.length === 0) return "";
		try {
			const { env } = generateEnvFiles(resolverOutput, {
				generateSecrets: true,
				openclawVersion: "latest",
				openclawImage: "official",
			});
			return env;
		} catch {
			return "";
		}
	}, [resolverOutput]);

	// Toggle a service
	const handleToggle = useCallback(
		(id: string) => {
			const service = allServices.find((s) => s.id === id);
			const isMandatory = service?.mandatory === true;
			const isDeselecting = selectedServices.has(id);

			if (isDeselecting && isMandatory) {
				setPendingRemovalId(id);
				return;
			}

			setSelectedServices((prev) => {
				const next = new Set(prev);
				if (next.has(id)) {
					next.delete(id);
				} else {
					next.add(id);
				}
				return next;
			});
			setActivePreset(null);
		},
		[allServices, selectedServices],
	);

	const confirmMandatoryRemoval = useCallback(() => {
		if (pendingRemovalId) {
			setSelectedServices((prev) => {
				const next = new Set(prev);
				next.delete(pendingRemovalId);
				return next;
			});
			setActivePreset(null);
			setPendingRemovalId(null);
		}
	}, [pendingRemovalId]);

	const cancelMandatoryRemoval = useCallback(() => {
		setPendingRemovalId(null);
	}, []);

	// Apply a preset
	const handlePreset = useCallback(
		(presetId: string) => {
			const preset = allPresets.find((p) => p.id === presetId);
			if (!preset) return;
			if (activePreset === presetId) {
				setSelectedServices(new Set());
				setActivePreset(null);
			} else {
				setSelectedServices(new Set(preset.services));
				setActivePreset(presetId);
			}
		},
		[allPresets, activePreset],
	);

	// Reset
	const handleReset = useCallback(() => {
		setSelectedServices(new Set());
		setSelectedSkillPacks(new Set());
		setSelectedAiProviders(new Set(["openai"]));
		setSelectedGsdRuntimes(new Set());
		setSelectedIndividualSkills(new Map());
		setSelectedPrimaryFramework("openclaw");
		setSelectedCompanionFrameworks(new Set());
		setActivePreset(null);
		setSearchQuery("");
		setGenerateError(null);
		setResolverError(null);
	}, []);

	// Download
	const handleDownload = useCallback(
		async (opts?: DownloadOptions) => {
			if (selectedServices.size === 0) return;
			const dt = opts?.deploymentType ?? "docker";
			const plat = opts?.platform ?? "linux/amd64";
			setLastDownloadOptions({ deploymentType: dt, platform: plat });
			setIsGenerating(true);
			setGenerateError(null);
			setDownloadComplete(false);
			try {
				const name = projectName || "my-stack";

				const result = await generateStack({
					projectName: name,
					services: Array.from(selectedServices),
					skillPacks: Array.from(selectedSkillPacks),
					aiProviders: Array.from(selectedAiProviders),
					gsdRuntimes: Array.from(selectedGsdRuntimes),
					primaryFramework: selectedPrimaryFramework,
					companionFrameworks: Array.from(selectedCompanionFrameworks),
					proxy: "none",
					gpu: false,
					platform: plat,
					deployment: "local",
					deploymentType: dt,
					monitoring: false,
				});

				const zip = new JSZip();
				const folder = zip.folder(name);
				if (folder) {
					for (const [path, content] of Object.entries(result.files)) {
						folder.file(path, content as string);
					}
				}

				const blob = await zip.generateAsync({ type: "blob" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `${name}.zip`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);

				setDownloadComplete(true);
			} catch (err) {
				setGenerateError(err instanceof Error ? err.message : "Failed to generate stack");
			} finally {
				setIsGenerating(false);
			}
		},
		[
			selectedServices,
			projectName,
			selectedSkillPacks,
			selectedAiProviders,
			selectedGsdRuntimes,
			selectedPrimaryFramework,
			selectedCompanionFrameworks,
		],
	);

	const value = {
		selectedServices,
		setSelectedServices,
		projectName,
		setProjectName,
		searchQuery,
		setSearchQuery,
		activePreset,
		setActivePreset,
		isGenerating,
		setIsGenerating,
		generateError,
		setGenerateError,
		downloadComplete,
		setDownloadComplete,
		pendingRemovalId,
		setPendingRemovalId,
		showDeploymentModal,
		setShowDeploymentModal,
		deploymentType,
		setDeploymentType,
		platform,
		setPlatform,
		lastDownloadOptions,
		setLastDownloadOptions,
		showClawexaModal,
		setShowClawexaModal,
		clawexaAction,
		setClawexaAction,
		selectedSkillPacks,
		setSelectedSkillPacks,
		selectedAiProviders,
		setSelectedAiProviders,
		selectedGsdRuntimes,
		setSelectedGsdRuntimes,
		selectedPrimaryFramework,
		setSelectedPrimaryFramework,
		selectedCompanionFrameworks,
		setSelectedCompanionFrameworks,
		resolverError,
		setResolverError,
		showSkillModal,
		setShowSkillModal,
		showDeployToServerModal,
		setShowDeployToServerModal,
		selectedIndividualSkills,
		setSelectedIndividualSkills,
		showSaveModal,
		setShowSaveModal,
		savedStackId,
		setSavedStackId,
		isLoadingStack,
		allServices,
		allPresets,
		allSkillPacks,
		filteredServices,
		resolverOutput,
		resolvedServiceIds,
		composeYaml,
		envContent,
		handleToggle,
		confirmMandatoryRemoval,
		cancelMandatoryRemoval,
		handlePreset,
		handleReset,
		handleDownload,
	};

	return <StackBuilderContext.Provider value={value}>{children}</StackBuilderContext.Provider>;
}
