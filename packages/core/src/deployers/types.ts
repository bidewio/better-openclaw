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
	mariadb: unknown[];
	mongo: unknown[];
	mysql: unknown[];
	postgres: unknown[];
	redis: unknown[];
	compose: unknown[];
	project: Project;
}

export interface DokployApplication {
	applicationId: string;
	name: string;
	appName: string;
	description: string;
	env: string;
	previewEnv: unknown;
	watchPaths: unknown[];
	previewBuildArgs: unknown;
	previewBuildSecrets: unknown;
	previewLabels: unknown;
	previewWildcard: unknown;
	previewPort: number;
	previewHttps: boolean;
	previewPath: string;
	previewCertificateType: string;
	previewCustomCertResolver: unknown;
	previewLimit: number;
	isPreviewDeploymentsActive: boolean;
	previewRequireCollaboratorPermissions: boolean;
	rollbackActive: boolean;
	buildArgs: string;
	buildSecrets: string;
	memoryReservation: unknown;
	memoryLimit: unknown;
	cpuReservation: unknown;
	cpuLimit: unknown;
	title: unknown;
	enabled: unknown;
	subtitle: unknown;
	command: unknown;
	args: unknown;
	refreshToken: string;
	sourceType: string;
	cleanCache: boolean;
	repository: string;
	owner: string;
	branch: string;
	buildPath: string;
	triggerType: string;
	autoDeploy: boolean;
	gitlabProjectId: unknown;
	gitlabRepository: unknown;
	gitlabOwner: unknown;
	gitlabBranch: unknown;
	gitlabBuildPath: string;
	gitlabPathNamespace: unknown;
	giteaRepository: unknown;
	giteaOwner: unknown;
	giteaBranch: unknown;
	giteaBuildPath: string;
	bitbucketRepository: unknown;
	bitbucketRepositorySlug: unknown;
	bitbucketOwner: unknown;
	bitbucketBranch: unknown;
	bitbucketBuildPath: string;
	username: unknown;
	password: unknown;
	dockerImage: unknown;
	registryUrl: unknown;
	customGitUrl: unknown;
	customGitBranch: unknown;
	customGitBuildPath: unknown;
	customGitSSHKeyId: unknown;
	enableSubmodules: boolean;
	dockerfile: unknown;
	dockerContextPath: unknown;
	dockerBuildStage: unknown;
	dropBuildPath: unknown;
	healthCheckSwarm: unknown;
	restartPolicySwarm: unknown;
	placementSwarm: unknown;
	updateConfigSwarm: unknown;
	rollbackConfigSwarm: unknown;
	modeSwarm: unknown;
	labelsSwarm: unknown;
	networkSwarm: unknown;
	stopGracePeriodSwarm: unknown;
	endpointSpecSwarm: unknown;
	ulimitsSwarm: unknown;
	replicas: number;
	applicationStatus: string;
	buildType: string;
	railpackVersion: string;
	herokuVersion: unknown;
	publishDirectory: unknown;
	isStaticSpa: unknown;
	createEnvFile: boolean;
	createdAt: string;
	registryId: unknown;
	rollbackRegistryId: unknown;
	environmentId: string;
	githubId: string;
	gitlabId: unknown;
	giteaId: unknown;
	bitbucketId: unknown;
	serverId: string;
	buildServerId: unknown;
	buildRegistryId: unknown;
}

export interface Project {
	projectId: string;
	name: string;
	description: string;
	createdAt: string;
	organizationId: string;
	env: string;
}
