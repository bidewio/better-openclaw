import type { BlogPost } from "../types";

export const post: BlogPost = {
	slug: "addon-stack-generation-hosting-guide",
	title: "How Hosting Providers Can Offer 180+ Self-Hosted Services with One API Call",
	description:
		"A practical guide to integrating @better-openclaw/core's addon stack generation into your hosting platform. Generate Docker Compose overlays, manage secrets, resolve port conflicts, and offer a full service marketplace — all without post-processing hacks.",
	date: "2026-03-12",
	readTime: "14 min read",
	category: "Tutorials",
	tags: [
		"addon-stack",
		"hosting",
		"docker-compose",
		"integration",
		"openclaw",
		"api",
		"marketplace",
	],
	content: `
		<p>If you run a hosting platform and want to offer your users the ability to install self-hosted services like n8n, Qdrant, Meilisearch, Grafana, or any of the 180+ services in the OpenClaw catalog — this guide is for you. The new <strong>Addon Stack API</strong> in <code>@better-openclaw/core</code> lets you generate production-ready Docker Compose overlays with a single function call.</p>

		<p>No more post-processing YAML. No more manually filtering infrastructure services. No more hand-rolling secret generation. The addon stack API does it all.</p>

		<h2>The Problem: Full-Stack Generation Doesn't Fit Hosting Providers</h2>

		<p>OpenClaw's existing <code>generate()</code> function creates <strong>complete standalone stacks</strong> — it includes everything from the reverse proxy (Caddy/Traefik) to Redis, PostgreSQL, and the OpenClaw gateway. That's perfect for someone setting up a fresh server, but hosting providers like Clawexa already have that infrastructure provisioned via cloud-init.</p>

		<p>Until now, integrators had to call <code>generate()</code> and then apply a series of fragile post-processing steps:</p>

		<ul>
			<li>Strip out infrastructure services (redis, postgresql, caddy, etc.)</li>
			<li>Remove <code>profiles:</code> from individual services</li>
			<li>Remove <code>cap_drop</code> and <code>security_opt</code></li>
			<li>Replace <code>depends_on</code> references to removed services</li>
			<li>Filter environment variables that clash with existing infrastructure</li>
			<li>Generate secrets separately</li>
			<li>Resolve port conflicts with existing services</li>
		</ul>

		<p>That's 18+ hacks in production code. Each one is a maintenance burden and a source of bugs when the core library updates.</p>

		<h2>The Solution: First-Class Addon Stack Generation</h2>

		<p>The new <code>generateAddonStack()</code> function produces <strong>only the addon layer</strong> — the services your users actually requested, with all infrastructure concerns handled internally.</p>

<pre><code>import { generateAddonStack } from "@better-openclaw/core";

const result = generateAddonStack({
  instanceId: "user-abc-123",
  services: ["n8n", "qdrant", "meilisearch"],
  generateSecrets: true,
  reservedPorts: [3000, 5432, 6379, 8080],
});

// result.composeOverride  → ready-to-write docker-compose.override.yml
// result.envFile          → .env with generated secrets
// result.proxyRoutes      → [{serviceId:"n8n", path:"/n8n", port:5678, ...}]
// result.skillFiles       → skill definitions for the OpenClaw gateway
// result.warnings         → any non-fatal issues
</code></pre>

		<p>That's it. One function call, zero post-processing.</p>

		<h2>What Happens Under the Hood</h2>

		<p>When you call <code>generateAddonStack()</code>, the function runs a carefully-ordered pipeline:</p>

		<ol>
			<li><strong>Input validation</strong> — the input is parsed against <code>AddonStackInputSchema</code> (a Zod schema). Invalid input fails fast with clear error messages.</li>
			<li><strong>Infrastructure filtering</strong> — service IDs like <code>redis</code>, <code>postgresql</code>, <code>caddy</code>, and <code>openclaw-gateway</code> are automatically removed. A warning is added so you can inform the user.</li>
			<li><strong>Dependency resolution</strong> — the resolver expands dependencies (e.g., n8n needs PostgreSQL setup) and performs topological sorting to ensure correct startup order.</li>
			<li><strong>Credential checking</strong> — services requiring external API keys (like OpenAI or Anthropic) are flagged as "skipped" with the reason <code>missing_credentials</code> if the user hasn't provided them.</li>
			<li><strong>Compose generation</strong> — each service gets a Docker Compose entry with image, volumes, environment, healthcheck, and network configuration. No <code>profiles:</code>, no <code>cap_drop:</code> — clean output.</li>
			<li><strong>Port conflict resolution</strong> — if a service's default port conflicts with your <code>reservedPorts</code>, it's automatically reassigned to port+1000.</li>
			<li><strong>Secret generation</strong> — random 48-character hex secrets for all passwords and API keys. Services with special requirements (like Convex needing 64-character secrets) are handled via the <code>envQuirks</code> system.</li>
			<li><strong>Proxy route extraction</strong> — services with a <code>proxyPath</code> (like <code>/n8n</code>) generate structured proxy routes you can feed to Caddy, Traefik, or nginx.</li>
		</ol>

		<h2>Handling Service Updates Without Downtime</h2>

		<p>Users don't just install services once — they add and remove them over time. The <code>updateAddonStack()</code> function handles incremental changes:</p>

<pre><code>import { updateAddonStack } from "@better-openclaw/core";

const result = updateAddonStack({
  instanceId: "user-abc-123",
  currentCompose: existingYaml,
  currentEnv: existingEnvFile,
  addServices: ["grafana"],
  removeServices: ["meilisearch"],
  generateSecrets: true,
});

// result.metadata.added     → ["grafana"]
// result.metadata.removed   → ["meilisearch"]
// result.metadata.unchanged → ["n8n", "qdrant"]
// result.imagesToPull       → ["grafana/grafana:latest"]
// result.envFile            → existing values PRESERVED, new ones added
</code></pre>

		<p>The key feature here is <strong>env preservation</strong>. If a user has customized their Qdrant API key or n8n webhook URL, those values are kept intact. Only new services get fresh secrets.</p>

		<h2>Real-World Integration: A Complete Provisioning Flow</h2>

		<p>Here's how a hosting platform's provisioning engine would use both functions together:</p>

<pre><code>// 1. User selects services from your marketplace UI
const selectedServices = ["n8n", "qdrant", "meilisearch"];

// 2. Generate the initial addon stack
const stack = generateAddonStack({
  instanceId: \`tenant-\${tenantId}\`,
  services: selectedServices,
  reservedPorts: getInfrastructurePorts(),
  generateSecrets: true,
});

// 3. Handle skipped services
for (const skipped of stack.metadata.skippedServices) {
  switch (skipped.reason) {
    case "missing_credentials":
      // Show credential input form in your UI
      await showCredentialPrompt(skipped);
      break;
    case "gpu_required":
      // Suggest GPU plan upgrade
      await showUpgradePrompt(skipped.serviceId);
      break;
  }
}

// 4. Write compose overlay and env file to the instance
await fs.writeFile(
  \`/instances/\${tenantId}/docker-compose.override.yml\`,
  stack.composeOverride
);
await fs.writeFile(
  \`/instances/\${tenantId}/.env.addons\`,
  stack.envFile
);

// 5. Write skill definitions
for (const [filename, content] of Object.entries(stack.skillFiles)) {
  await fs.writeFile(
    \`/instances/\${tenantId}/config/skills/\${filename}\`,
    content
  );
}

// 6. Register proxy routes with Caddy/Traefik
for (const route of stack.proxyRoutes) {
  await reverseProxy.addRoute({
    path: route.path,
    upstream: \`\${route.serviceId}:\${route.port}\`,
    stripPrefix: route.stripPrefix,
  });
}

// 7. Start the containers
await docker.composeUp(\`/instances/\${tenantId}\`);
</code></pre>

		<h2>The Service Catalog: Building Your Marketplace</h2>

		<p>The <code>@better-openclaw/core</code> package exports the full service registry. Use it to build your marketplace UI:</p>

<pre><code>import {
  getAllServices,
  getServicesByCategory,
  SERVICE_CATEGORIES,
} from "@better-openclaw/core";

// 180+ services across 30+ categories
const allServices = getAllServices();

// Categories include:
// AI Platforms, Automation, Vector DBs, Monitoring,
// Search, Knowledge Management, Browser Automation, etc.

for (const category of SERVICE_CATEGORIES) {
  const services = getServicesByCategory(category.id);
  console.log(\`\${category.icon} \${category.name} (\${services.length})\`);
  for (const svc of services) {
    console.log(\`  - \${svc.name}: \${svc.description}\`);
    console.log(\`    RAM: ~\${svc.memoryMB}MB | Maturity: \${svc.maturity}\`);
  }
}
</code></pre>

		<p>Each service definition includes everything your marketplace needs: name, description, icon, category, estimated memory usage, maturity level, required environment variables (with descriptions), and exposed ports.</p>

		<h2>Security Considerations</h2>

		<p>When integrating the addon stack API into a multi-tenant hosting platform, keep these security practices in mind:</p>

		<ul>
			<li><strong>Validate all input</strong> with <code>AddonStackInputSchema.parse()</code> before passing to the generator. Never trust user-provided service IDs without validation.</li>
			<li><strong>Store secrets securely</strong> — the generated <code>envFile</code> contains passwords and API keys. Encrypt at rest and restrict access.</li>
			<li><strong>Use reserved ports aggressively</strong> — pass every port your infrastructure uses. This prevents addon services from binding to ports needed by your control plane.</li>
			<li><strong>Review skipped services</strong> — never deploy a service that was skipped due to <code>missing_credentials</code>. The service would start in a broken state.</li>
			<li><strong>Network segmentation</strong> — the generated compose uses <code>openclaw-network</code> as an external network. In multi-tenant environments, create per-tenant networks for isolation.</li>
		</ul>

		<h2>What's Next</h2>

		<p>The addon stack API is the foundation for a new generation of OpenClaw hosting integrations. Coming soon:</p>

		<ul>
			<li><strong>Managed upgrades</strong> — automated service version bumps with rollback support</li>
			<li><strong>Resource quotas</strong> — per-tenant memory and CPU limits integrated into the compose output</li>
			<li><strong>Backup integration</strong> — automated volume backup schedules generated alongside the stack</li>
		</ul>

		<p>Ready to integrate? Check out the <a href="/docs/api/addon-stack">Addon Stack API Reference</a> and the <a href="/docs/guides/hosting-integration">Hosting Provider Integration Guide</a> for complete documentation.</p>
	`,
};
