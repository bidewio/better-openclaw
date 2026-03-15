/**
 * Common types for PaaS deployers (Dokploy, Coolify, etc.)
 *
 * This module defines the contract that all PaaS deployment providers must
 * implement. The deployer system is designed to be extensible — adding a new
 * provider only requires implementing the `PaasDeployer` interface and
 * registering it in `deployers/index.ts`.
 *
 * Architecture:
 *   Web UI / CLI  -->  API relay (/api/v1/deploy)  -->  PaaS instance (Dokploy/Coolify)
 *
 * The API server acts as a relay to avoid CORS issues when deploying from the
 * browser. The CLI calls the deployer directly (no relay needed).
 */

/** Credentials and connection info for a PaaS target. */
export interface DeployTarget {
	/** Base URL of the PaaS instance (e.g. "https://dokploy.example.com") */
	instanceUrl: string;
	/** API key / bearer token */
	apiKey: string;
}

/** Input for a deploy operation. */
export interface DeployInput {
	/** Target PaaS connection */
	target: DeployTarget;
	/** Project name to create or use */
	projectName: string;
	/** Raw docker-compose.yml content */
	composeYaml: string;
	/** Raw .env file content (key=value lines) */
	envContent: string;
	/** Optional description */
	description?: string;
	/** Optional server ID to deploy to (for PaaS platforms managing multiple servers) */
	serverId?: string;
	/** Optional operations logger for persistent audit logging */
	logger?: import("../logger/logger.js").OperationsLogger;
}

/** Step-level status for deploy progress. */
export interface DeployStep {
	step: string;
	status: "pending" | "running" | "done" | "error";
	detail?: string;
}

/** Result of a deploy operation. */
export interface DeployResult {
	success: boolean;
	/** URL to the deployed project/compose in the PaaS dashboard */
	dashboardUrl?: string;
	/** PaaS-assigned project ID */
	projectId?: string;
	/** PaaS-assigned compose/service ID */
	composeId?: string;
	/** Step-by-step progress */
	steps: DeployStep[];
	/** Error message if failed */
	error?: string;
}

/** Server available on a PaaS platform. */
export interface PaasServer {
	/** Server ID (used as identifier when deploying) */
	id: string;
	/** Human-readable server name */
	name: string;
	/** Server IP address or hostname */
	ip?: string;
}

/** Interface that all PaaS deployers implement. */
export interface PaasDeployer {
	/** Human-readable name */
	readonly name: string;
	/** Identifier (e.g. "dokploy", "coolify") */
	readonly id: string;
	/** Test connection to the PaaS instance */
	testConnection(target: DeployTarget): Promise<{ ok: boolean; error?: string }>;
	/** Deploy a compose stack */
	deploy(input: DeployInput): Promise<DeployResult>;
	/** List available servers on the PaaS instance (optional — not all providers manage multiple servers) */
	listServers?(target: DeployTarget): Promise<PaasServer[]>;
}

export interface ProviderCapabilities {
	compose: boolean;
	dockerImage: boolean;
	volumes: boolean;
	domains: boolean;
	secrets: boolean;
}

export interface DeploymentResult {
	success: boolean;
	url?: string;
	message?: string;
}

export interface DeploymentProvider {
	id: string;
	name: string;

	capabilities: ProviderCapabilities;

	deploy(config: NormalizedApp): Promise<DeploymentResult>;

	createSecret?(key: string, value: string): Promise<void>;

	createDomain?(service: string, domain: string): Promise<void>;
}

export interface NormalizedApp {
	name: string;
	services: NormalizedService[];
	env: Record<string, string>;
}

export interface NormalizedService {
	name: string;
	image?: string;
	build?: string;
	ports?: number[];
	volumes?: string[];
	env?: Record<string, string>;
}

export interface DokployEnvironment {
	environmentId: string;
	name: string;
	description: string;
	createdAt: string;
	env: string;
	projectId: string;
	isDefault: boolean;
	applications: DokployApplication[];
	mariadb: any[];
	mongo: any[];
	mysql: any[];
	postgres: any[];
	redis: any[];
	compose: any[];
	project: Project;
}

export interface DokployApplication {
	applicationId: string;
	name: string;
	appName: string;
	description: string;
	env: string;
	previewEnv: any;
	watchPaths: any[];
	previewBuildArgs: any;
	previewBuildSecrets: any;
	previewLabels: any;
	previewWildcard: any;
	previewPort: number;
	previewHttps: boolean;
	previewPath: string;
	previewCertificateType: string;
	previewCustomCertResolver: any;
	previewLimit: number;
	isPreviewDeploymentsActive: boolean;
	previewRequireCollaboratorPermissions: boolean;
	rollbackActive: boolean;
	buildArgs: string;
	buildSecrets: string;
	memoryReservation: any;
	memoryLimit: any;
	cpuReservation: any;
	cpuLimit: any;
	title: any;
	enabled: any;
	subtitle: any;
	command: any;
	args: any;
	refreshToken: string;
	sourceType: string;
	cleanCache: boolean;
	repository: string;
	owner: string;
	branch: string;
	buildPath: string;
	triggerType: string;
	autoDeploy: boolean;
	gitlabProjectId: any;
	gitlabRepository: any;
	gitlabOwner: any;
	gitlabBranch: any;
	gitlabBuildPath: string;
	gitlabPathNamespace: any;
	giteaRepository: any;
	giteaOwner: any;
	giteaBranch: any;
	giteaBuildPath: string;
	bitbucketRepository: any;
	bitbucketRepositorySlug: any;
	bitbucketOwner: any;
	bitbucketBranch: any;
	bitbucketBuildPath: string;
	username: any;
	password: any;
	dockerImage: any;
	registryUrl: any;
	customGitUrl: any;
	customGitBranch: any;
	customGitBuildPath: any;
	customGitSSHKeyId: any;
	enableSubmodules: boolean;
	dockerfile: any;
	dockerContextPath: any;
	dockerBuildStage: any;
	dropBuildPath: any;
	healthCheckSwarm: any;
	restartPolicySwarm: any;
	placementSwarm: any;
	updateConfigSwarm: any;
	rollbackConfigSwarm: any;
	modeSwarm: any;
	labelsSwarm: any;
	networkSwarm: any;
	stopGracePeriodSwarm: any;
	endpointSpecSwarm: any;
	ulimitsSwarm: any;
	replicas: number;
	applicationStatus: string;
	buildType: string;
	railpackVersion: string;
	herokuVersion: any;
	publishDirectory: any;
	isStaticSpa: any;
	createEnvFile: boolean;
	createdAt: string;
	registryId: any;
	rollbackRegistryId: any;
	environmentId: string;
	githubId: string;
	gitlabId: any;
	giteaId: any;
	bitbucketId: any;
	serverId: string;
	buildServerId: any;
	buildRegistryId: any;
}

export interface Project {
	projectId: string;
	name: string;
	description: string;
	createdAt: string;
	organizationId: string;
	env: string;
}
