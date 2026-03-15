import { getFrameworkById } from "../frameworks/index.js";
import type { ResolverOutput } from "../types.js";

/**
 * Options for README generation.
 */
export interface ReadmeOptions {
	projectName: string;
	domain?: string;
	proxy?: string;
	/** When "bare-metal", the stack uses native + Docker hybrid. */
	deploymentType?: "docker" | "bare-metal" | "local";
	/** True when some services run natively on the host (bare-metal only). */
	hasNativeServices?: boolean;
	/** How OpenClaw itself is installed: docker (container) or direct (host). */
	openclawInstallMethod?: "docker" | "direct";
	/** Primary agent framework (defaults to "openclaw"). */
	primaryFramework?: string;
}

/**
 * Generates a comprehensive README.md for the OpenClaw project.
 *
 * Includes: project description, service table, quick start instructions,
 * service URLs, skill packs, and scripts documentation.
 */
export function generateReadme(resolved: ResolverOutput, options: ReadmeOptions): string {
	const { projectName, domain, proxy, deploymentType, hasNativeServices, openclawInstallMethod, primaryFramework } =
		options;
	const isDirectInstall = openclawInstallMethod === "direct";
	const framework = getFrameworkById(primaryFramework ?? "openclaw");
	const frameworkName = framework?.name ?? "OpenClaw";
	const isOpenClaw = (primaryFramework ?? "openclaw") === "openclaw";
	const sections: string[] = [];

	// ── Title & Description ─────────────────────────────────────────────────

	sections.push(`# ${projectName}

> Self-hosted AI agent infrastructure powered by **${frameworkName}**${isOpenClaw ? " — [openclaw.dev](https://openclaw.dev)" : ""}.

This project provides a fully configured Docker Compose stack with ${resolved.services.length} services, ready to deploy on any server.${isDirectInstall ? ` ${frameworkName} itself runs directly on the host (not in Docker).` : ""}
${deploymentType === "bare-metal" && hasNativeServices ? `\n\n**Bare-metal (native + Docker):** Some services run natively on the host; the rest (including the ${frameworkName} gateway) run in Docker. Use the top-level \`install.sh\` or \`install.ps1\` to install/start native services first, then start the Docker stack.` : ""}

---`);

	// ── Service Table ────────────────────────────────────────────────────────

	const serviceRows = resolved.services
		.map(({ definition }) => {
			const mainPort = definition.ports.find((p) => p.exposed);
			const url = mainPort
				? domain
					? `https://${definition.id}.${domain}`
					: `http://localhost:${mainPort.host}`
				: "N/A (internal)";
			return `| ${definition.icon} | **${definition.name}** | ${url} | ${definition.description} |`;
		})
		.join("\n");

	sections.push(`## Services

| | Service | URL | Description |
|---|---------|-----|-------------|
${serviceRows}
`);

	// ── Quick Start ──────────────────────────────────────────────────────────

	sections.push(`## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- At least ${Math.ceil(resolved.estimatedMemoryMB / 1024)}GB of RAM available
${isDirectInstall ? "- Node.js 22+ (installed automatically by the OpenClaw installer)" : ""}

### 1. Extract the ZIP

\`\`\`bash
unzip ${projectName}.zip
cd ${projectName}
\`\`\`

### 2. Configure Environment

\`\`\`bash
cp .env.example .env
\`\`\`

Edit \`.env\` and update any values as needed. Secret values have been pre-generated — review and change them for production use.
${
	isDirectInstall
		? `
### 3. Install OpenClaw on the Host

\`\`\`bash
chmod +x scripts/install-openclaw.sh
./scripts/install-openclaw.sh
\`\`\`

This downloads and runs the official installer, which sets up Node.js 22+ and OpenClaw globally.

### 4. Start Companion Services

\`\`\`bash
docker compose up -d
\`\`\`

### 5. Run Onboarding

\`\`\`bash
openclaw onboard
\`\`\`
`
		: `
### 3. Start Services

\`\`\`bash
docker compose up -d
\`\`\`

Or use the provided start script:

\`\`\`bash
chmod +x scripts/*.sh
./scripts/start.sh
\`\`\`

### 4. Check Status

\`\`\`bash
docker compose ps
\`\`\`

### 5. View Logs

\`\`\`bash
docker compose logs -f ${primaryFramework ?? "openclaw"}-gateway
\`\`\`
`
}
All services should show a healthy status within 1–2 minutes.
`);

	// ── Docker Compose Profiles ──────────────────────────────────────────────

	sections.push(`## Using Docker Compose Profiles

Your stack may include profile-based compose files for optional service groups. Only the base services start by default — use profiles to activate additional groups:

\`\`\`bash
# Start base services only
docker compose up -d

# Start base + AI services (Ollama, Open WebUI, etc.)
docker compose -f docker-compose.yml -f docker-compose.ai.yml --profile ai up -d

# Start base + monitoring (Grafana, Prometheus, Uptime Kuma)
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d

# Start base + AI + dev tools
docker compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.tools.yml --profile ai --profile tools up -d
\`\`\`

Available profile files (if generated):
| File | Profile | Services |
|------|---------|----------|
| \`docker-compose.ai.yml\` | \`ai\` | AI models, chat UIs, LLM platforms |
| \`docker-compose.media.yml\` | \`media\` | FFmpeg, Remotion, Motion Canvas |
| \`docker-compose.monitoring.yml\` | \`monitoring\` | Grafana, Prometheus, Uptime Kuma, analytics |
| \`docker-compose.tools.yml\` | \`tools\` | Gitea, code-server, Portainer, coding agents |
| \`docker-compose.social.yml\` | \`social\` | Postiz, Mixpost |
| \`docker-compose.knowledge.yml\` | \`knowledge\` | Outline, Paperless-ngx, NocoDB |
| \`docker-compose.communication.yml\` | \`communication\` | Matrix, Rocket.Chat, Mattermost |
`);

	// ── Service URLs & Ports ─────────────────────────────────────────────────

	const portRows = resolved.services
		.filter(({ definition }) => definition.ports.length > 0)
		.map(({ definition }) => {
			const ports = definition.ports
				.map((p) => `\`${p.host}\` → \`${p.container}\` (${p.description})`)
				.join(", ");
			return `| ${definition.icon} ${definition.name} | ${ports} |`;
		})
		.join("\n");

	if (portRows) {
		sections.push(`## Ports

| Service | Ports |
|---------|-------|
${portRows}
`);
	}

	// ── Skill Packs ─────────────────────────────────────────────────────────

	const allSkills = resolved.services.flatMap(({ definition }) =>
		definition.skills.map((s) => ({
			skillId: s.skillId,
			serviceName: definition.name,
			serviceIcon: definition.icon,
		})),
	);

	if (allSkills.length > 0) {
		const skillRows = allSkills
			.map((s) => `| \`${s.skillId}\` | ${s.serviceIcon} ${s.serviceName} |`)
			.join("\n");

		sections.push(`## Skills

The following OpenClaw skills are automatically installed:

| Skill | Service |
|-------|---------|
${skillRows}

Skills are located in \`openclaw/workspace/skills/\`. Each skill provides a \`SKILL.md\` with usage instructions.
`);
	}

	// ── AI Memory Integration ──────────────────────────────────────────────

	const memoryServiceIds = ["mem0", "memu", "hindsight"];
	const vectorDbIds = ["qdrant", "chromadb", "weaviate", "milvus"];

	const memoryServices = resolved.services.filter(({ definition }) =>
		memoryServiceIds.includes(definition.id),
	);
	const vectorDbs = resolved.services.filter(({ definition }) =>
		vectorDbIds.includes(definition.id),
	);

	if (memoryServices.length > 0 || vectorDbs.length > 0) {
		let memSection = `## AI Memory Integration

This stack includes integrated AI memory services. The ${frameworkName} agent framework is automatically configured to use them via \`openclaw/config/openclaw.json\`.
`;

		if (memoryServices.length > 0) {
			const memList = memoryServices
				.map(({ definition }) => `- ${definition.icon} **${definition.name}** — ${definition.description.split(".")[0]}`)
				.join("\n");
			memSection += `
### Memory Services

${memList}
`;
		}

		if (vectorDbs.length > 0) {
			const vecList = vectorDbs
				.map(({ definition }) => `- ${definition.icon} **${definition.name}** — ${definition.description.split(".")[0]}`)
				.join("\n");
			memSection += `
### Vector Databases

${vecList}
`;
		}

		memSection += `
Skills for interacting with these services are in \`openclaw/workspace/skills/\`.
`;

		sections.push(memSection);
	}

	// ── Onboarding & Channels ──────────────────────────────────────────────
	// Only show OpenClaw-specific onboarding instructions for OpenClaw stacks

	if (isOpenClaw && isDirectInstall) {
		sections.push(`## OpenClaw Setup

OpenClaw is installed directly on the host (not in Docker). After running the install script:\n
\`\`\`bash
# Run onboarding to configure the gateway
openclaw onboard

# Launch the dashboard
openclaw dashboard
\`\`\`

When prompted during onboarding:
- **Gateway bind:** \`lan\`
- **Gateway auth:** \`token\`
- **Gateway token:** (use the value from \`.env\` → \`OPENCLAW_GATEWAY_TOKEN\`)

### Connect Messaging Channels (optional)

\`\`\`bash
# WhatsApp (scan QR code)
openclaw channels login

# Telegram
openclaw channels add --channel telegram --token <BOT_TOKEN>

# Discord
openclaw channels add --channel discord --token <BOT_TOKEN>
\`\`\`

See [Channel Docs](https://docs.openclaw.ai/channels) for more providers.
`);
	} else if (isOpenClaw) {
		sections.push(`## Onboarding & Channel Setup

After starting the stack, complete the gateway onboarding:

\`\`\`bash
# Interactive onboarding (sets up gateway auth and config)
docker compose run --rm openclaw-cli onboard --no-install-daemon
\`\`\`

When prompted:
- **Gateway bind:** \`lan\`
- **Gateway auth:** \`token\`
- **Gateway token:** (use the value from \`.env\` → \`OPENCLAW_GATEWAY_TOKEN\`)
- **Tailscale exposure:** Off
- **Install Gateway daemon:** No

### Connect Messaging Channels (optional)

\`\`\`bash
# WhatsApp (scan QR code)
docker compose run --rm openclaw-cli channels login

# Telegram
docker compose run --rm openclaw-cli channels add --channel telegram --token <BOT_TOKEN>

# Discord
docker compose run --rm openclaw-cli channels add --channel discord --token <BOT_TOKEN>
\`\`\`

See [Channel Docs](https://docs.openclaw.ai/channels) for more providers.
`);
	}

	// ── Proxy Configuration ─────────────────────────────────────────────────

	if (proxy && proxy !== "none") {
		const proxyName = proxy === "caddy" ? "Caddy" : "Traefik";
		sections.push(`## Reverse Proxy

This stack uses **${proxyName}** as a reverse proxy.${domain ? ` All services are available under \`${domain}\`.` : ""}

${proxy === "caddy" ? "The Caddyfile is located at `config/Caddyfile`." : "Traefik configuration is handled via Docker labels."}
`);
	}

	// ── Scripts ──────────────────────────────────────────────────────────────

	sections.push(`## Management Scripts

\`\`\`bash
chmod +x scripts/*.sh     # Make scripts executable (first time only)
\`\`\`

| Script | Description |
|--------|-------------|
| \`./scripts/start.sh\` | Validates .env, auto-generates gateway token, creates dirs, starts all services with health checks |
| \`./scripts/stop.sh\` | Gracefully stops all services |
| \`./scripts/update.sh\` | Pulls latest Docker images and restarts services |
| \`./scripts/backup.sh\` | Backs up all named Docker volumes to timestamped archives |
| \`./scripts/status.sh\` | Shows current service status, resource usage, and disk |
`);

	// ── Data & Volumes ──────────────────────────────────────────────────────

	const volumeRows = resolved.services.flatMap(({ definition }) =>
		definition.volumes.map((v) => ({
			name: v.name,
			path: v.containerPath,
			description: v.description,
			serviceName: definition.name,
		})),
	);

	if (volumeRows.length > 0) {
		const rows = volumeRows
			.map((v) => `| \`${v.name}\` | ${v.serviceName} | ${v.description} |`)
			.join("\n");

		sections.push(`## Volumes

| Volume | Service | Description |
|--------|---------|-------------|
${rows}

> **Tip:** Use \`scripts/backup.sh\` to back up all volumes before updates.
`);
	}

	// ── Estimated Resources ─────────────────────────────────────────────────

	sections.push(`## Resource Estimates

- **Services:** ${resolved.services.length}
- **Estimated RAM:** ~${(resolved.estimatedMemoryMB / 1024).toFixed(1)}GB
- **Recommended minimum:** ${Math.ceil(resolved.estimatedMemoryMB / 1024) + 2}GB RAM
`);

	// ── Warnings ─────────────────────────────────────────────────────────────

	if (resolved.warnings.length > 0) {
		const warningList = resolved.warnings.map((w) => `- ⚠️ ${w.message}`).join("\n");

		sections.push(`## Warnings

${warningList}
`);
	}

	// ── Footer ──────────────────────────────────────────────────────────────

	sections.push(`---

Generated by [better-openclaw](https://better-openclaw.dev) • ${new Date().toISOString().split("T")[0]}
Deploy without managing servers: [Clawexa Cloud](https://clawexa.net)
`);

	return sections.join("\n");
}
