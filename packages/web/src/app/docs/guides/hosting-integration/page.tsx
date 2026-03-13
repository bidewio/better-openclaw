import Link from "next/link";

export const metadata = {
	title: "Hosting Provider Integration Guide — better-openclaw Docs",
	description:
		"Step-by-step guide for hosting providers to integrate OpenClaw addon stack generation. Offer a marketplace of 180+ services with zero post-processing hacks.",
};

export default function HostingIntegrationPage() {
	return (
		<>
			<h1>Hosting Provider Integration Guide</h1>
			<p>
				This guide walks you through integrating <code>@better-openclaw/core</code> into your
				hosting platform to offer users a marketplace of 180+ self-hosted services. The addon
				stack API handles Docker Compose generation, secret management, port allocation, and
				skill configuration &mdash; your platform just needs to orchestrate the output.
			</p>

			<h2>Architecture Overview</h2>
			<p>
				The integration follows a clean separation of concerns:
			</p>
			<ul>
				<li>
					<strong>Your platform</strong> manages infrastructure: servers, PostgreSQL, Redis,
					reverse proxy, and the OpenClaw gateway.
				</li>
				<li>
					<strong>@better-openclaw/core</strong> generates addon layers: Docker Compose
					overlays, environment files, proxy routes, and skill definitions.
				</li>
			</ul>
			<pre>
				<code>{`┌─────────────────────────────────────────────┐
│              Your Hosting Platform           │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Dashboard │  │ API/CLI  │  │ Provision  │  │
│  │   (UI)   │→ │ Backend  │→ │  Engine    │  │
│  └──────────┘  └────┬─────┘  └─────┬─────┘  │
│                     │              │         │
│              ┌──────┴──────┐       │         │
│              │ @better-    │       │         │
│              │ openclaw/   │       │         │
│              │ core        │       │         │
│              └──────┬──────┘       │         │
│                     │              │         │
│              ┌──────┴──────────────┴──┐      │
│              │     Docker Host        │      │
│              │  ┌─────┐ ┌──────────┐  │      │
│              │  │Infra│ │ Addons   │  │      │
│              │  │Stack│ │ Overlay  │  │      │
│              │  └─────┘ └──────────┘  │      │
│              └────────────────────────┘      │
└─────────────────────────────────────────────┘`}</code>
			</pre>

			<hr />

			<h2>Step 1: Install the Core Package</h2>
			<pre>
				<code>{`npm install @better-openclaw/core`}</code>
			</pre>
			<p>
				The package is a pure TypeScript library with no native dependencies. It works in
				Node.js, Deno, Bun, and edge runtimes.
			</p>

			<h2>Step 2: Generate the Initial Stack</h2>
			<p>
				When a user selects services from your marketplace, call{" "}
				<code>generateAddonStack()</code>:
			</p>
			<pre>
				<code>{`import { generateAddonStack } from "@better-openclaw/core";

async function provisionAddons(userId: string, services: string[]) {
  // Your infrastructure's occupied ports
  const reservedPorts = [80, 443, 3000, 3456, 5432, 6379, 8080];

  const result = generateAddonStack({
    instanceId: \`user-\${userId}\`,
    services,
    reservedPorts,
    generateSecrets: true,
    platform: "linux/amd64",
  });

  // Handle skipped services (missing credentials, no GPU, etc.)
  for (const skipped of result.metadata.skippedServices) {
    if (skipped.reason === "missing_credentials") {
      // Prompt user for API keys
      await requestCredentials(userId, skipped.serviceId, skipped.requiredCredentials);
      return;
    }
    if (skipped.reason === "gpu_required") {
      // Show upgrade prompt
      await suggestGpuPlan(userId, skipped.serviceId);
    }
  }

  // Write files to the instance directory
  await writeFile(\`/instances/\${userId}/docker-compose.override.yml\`, result.composeOverride);
  await writeFile(\`/instances/\${userId}/.env.addons\`, result.envFile);

  // Write skill files
  for (const [path, content] of Object.entries(result.skillFiles)) {
    await writeFile(\`/instances/\${userId}/skills/\${path}\`, content);
  }

  // Register proxy routes with your reverse proxy
  await registerProxyRoutes(userId, result.proxyRoutes);

  // Merge openclaw.json config
  await patchOpenclawConfig(userId, result.openclawConfigPatch);

  // Start the addon containers
  await exec(\`docker compose -f docker-compose.override.yml up -d\`, {
    cwd: \`/instances/\${userId}\`,
  });

  return {
    services: result.metadata.resolvedServices,
    ports: result.metadata.portAssignments,
    warnings: result.warnings,
  };
}`}</code>
			</pre>

			<h2>Step 3: Handle Service Updates</h2>
			<p>
				When users add or remove services from their running instance, use{" "}
				<code>updateAddonStack()</code> instead of regenerating from scratch:
			</p>
			<pre>
				<code>{`import { updateAddonStack } from "@better-openclaw/core";

async function updateUserAddons(
  userId: string,
  addServices: string[],
  removeServices: string[],
) {
  // Read current state
  const currentCompose = await readFile(\`/instances/\${userId}/docker-compose.override.yml\`);
  const currentEnv = await readFile(\`/instances/\${userId}/.env.addons\`);

  const result = updateAddonStack({
    instanceId: \`user-\${userId}\`,
    currentCompose,
    currentEnv,
    addServices,
    removeServices,
    generateSecrets: true,
  });

  // Pull new images before stopping old services
  for (const image of result.imagesToPull) {
    await exec(\`docker pull \${image}\`);
  }

  // Write updated files (env values for existing services are preserved)
  await writeFile(\`/instances/\${userId}/docker-compose.override.yml\`, result.composeOverride);
  await writeFile(\`/instances/\${userId}/.env.addons\`, result.envFile);

  // Update proxy routes
  await registerProxyRoutes(userId, result.proxyRoutes);

  // Recreate only changed services
  await exec(\`docker compose up -d --remove-orphans\`, {
    cwd: \`/instances/\${userId}\`,
  });

  return {
    added: result.metadata.added,
    removed: result.metadata.removed,
    unchanged: result.metadata.unchanged,
  };
}`}</code>
			</pre>

			<h2>Step 4: Integrate Proxy Routes</h2>
			<p>
				Each addon service that exposes a web UI gets a proxy route. Integrate these with your
				reverse proxy:
			</p>
			<pre>
				<code>{`// Caddy integration example
function generateCaddySnippet(routes: ProxyRoute[]): string {
  return routes.map(route => {
    const upstream = \`\${route.serviceId}:\${route.port}\`;
    if (route.stripPrefix) {
      return \`handle_path \${route.path}/* {
  reverse_proxy \${upstream}
}\`;
    }
    return \`handle \${route.path}/* {
  reverse_proxy \${upstream}
}\`;
  }).join("\\n\\n");
}

// Traefik integration example
function generateTraefikLabels(route: ProxyRoute): Record<string, string> {
  const name = route.serviceId.replace(/-/g, "");
  return {
    [\`traefik.http.routers.\${name}.rule\`]:
      \`PathPrefix(\\\`\${route.path}\\\`)\`,
    [\`traefik.http.services.\${name}.loadbalancer.server.port\`]:
      String(route.port),
  };
}`}</code>
			</pre>

			<h2>Step 5: Present the Service Catalog</h2>
			<p>
				Use the service registry to build your marketplace UI:
			</p>
			<pre>
				<code>{`import {
  getAllServices,
  getServicesByCategory,
  SERVICE_CATEGORIES,
} from "@better-openclaw/core";

// Get all 180+ services with metadata
const services = getAllServices();

// Group by category for UI tabs
for (const cat of SERVICE_CATEGORIES) {
  const categoryServices = getServicesByCategory(cat.id);
  console.log(\`\${cat.icon} \${cat.name}: \${categoryServices.length} services\`);
}

// Each service definition includes:
// - id, name, description, category
// - image (Docker image), ports, volumes
// - environment variables with descriptions
// - memoryMB (estimated RAM usage)
// - maturity ("stable" | "beta" | "experimental")
// - proxyPath (reverse proxy path)
// - capDropCompatible (security hardening support)`}</code>
			</pre>

			<h2>Step 6: Offer Skill Packs</h2>
			<p>
				Skill packs bundle multiple services into task-focused capabilities:
			</p>
			<pre>
				<code>{`import {
  getAllSkillPacks,
  getCompatibleSkillPacks,
} from "@better-openclaw/core";

// Get skill packs compatible with user's current services
const packs = getCompatibleSkillPacks(["n8n", "qdrant"]);

// Each pack includes:
// - id, name, description
// - requiredServices: string[]
// - optionalServices: string[]
// - skills: SkillBinding[] (MCP tool definitions)`}</code>
			</pre>

			<hr />

			<h2>Security Best Practices</h2>
			<ul>
				<li>
					<strong>Always validate input</strong> with <code>AddonStackInputSchema.parse()</code>{" "}
					before passing user data to <code>generateAddonStack()</code>.
				</li>
				<li>
					<strong>Never expose secrets</strong> &mdash; the <code>envFile</code> contains
					generated passwords. Store it securely and never return it to the frontend.
				</li>
				<li>
					<strong>Use reserved ports</strong> to prevent addon services from claiming ports your
					infrastructure needs.
				</li>
				<li>
					<strong>Review skipped services</strong> &mdash; a <code>missing_credentials</code>{" "}
					skip means the service needs user-provided API keys. Don&apos;t deploy it without them.
				</li>
				<li>
					<strong>Network isolation</strong> &mdash; the generated compose uses{" "}
					<code>openclaw-network</code> as an external network. Ensure your Docker network
					configuration restricts inter-service communication appropriately.
				</li>
			</ul>

			<h2>Database Integration</h2>
			<p>
				Services that need PostgreSQL (like n8n, Grafana, Gitea) automatically get a{" "}
				<code>postgres-setup</code> init container that:
			</p>
			<ol>
				<li>Connects to your existing PostgreSQL instance</li>
				<li>Creates a dedicated database and user for each service</li>
				<li>Uses idempotent SQL (&quot;IF NOT EXISTS&quot;) for safe re-runs</li>
				<li>Generates unique passwords per service</li>
			</ol>
			<p>
				Your PostgreSQL must be reachable at the hostname <code>postgresql</code> on the Docker
				network. The init container uses the <code>POSTGRES_USER</code> and{" "}
				<code>POSTGRES_PASSWORD</code> from the infrastructure&apos;s environment.
			</p>

			<h2>Monitoring Integration</h2>
			<p>
				Each service definition includes a <code>healthCheck</code> configuration. Use it to
				set up monitoring:
			</p>
			<pre>
				<code>{`import { getServiceById } from "@better-openclaw/core";

const n8n = getServiceById("n8n");
console.log(n8n?.healthCheck);
// {
//   test: ["CMD-SHELL", "wget -qO- http://localhost:5678/healthz || exit 1"],
//   interval: "30s",
//   timeout: "10s",
//   retries: 3,
//   startPeriod: "30s"
// }`}</code>
			</pre>

			<p>
				See the{" "}
				<Link href="/docs/api/addon-stack">Addon Stack API Reference</Link> for complete
				parameter and return type documentation.
			</p>
		</>
	);
}
