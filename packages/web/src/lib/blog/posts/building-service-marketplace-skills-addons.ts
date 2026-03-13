import type { BlogPost } from "../types";

export const post: BlogPost = {
	slug: "building-service-marketplace-skills-addons",
	title: "Building a Self-Hosted Service Marketplace with AI Skills and Addon Stacks",
	description:
		"How to combine OpenClaw's addon stack generation with skill packs to build a marketplace where users install services that come pre-wired with AI capabilities — from RAG pipelines to automated workflows.",
	date: "2026-03-12",
	readTime: "12 min read",
	category: "AI Agents",
	tags: [
		"marketplace",
		"skill-packs",
		"addon-stack",
		"ai-agents",
		"openclaw",
		"self-hosted",
		"rag",
		"automation",
	],
	content: `
		<p>Imagine a marketplace where users don't just install Docker services — they install <strong>capabilities</strong>. Click "RAG Pipeline" and you get Qdrant, SearXNG, and an embedding model, pre-wired with MCP tool definitions so your AI agent can immediately perform semantic search. Click "Workflow Automation" and n8n appears with webhook triggers already configured. That's what happens when you combine OpenClaw's <strong>addon stack generation</strong> with <strong>skill packs</strong>.</p>

		<p>This post walks through the architecture of building such a marketplace, with real code examples using <code>@better-openclaw/core</code>.</p>

		<h2>Services vs. Skill Packs: Understanding the Difference</h2>

		<p>A <strong>service</strong> is a Docker container — Qdrant, n8n, Meilisearch, Grafana. It runs a specific piece of software with its own ports, volumes, and configuration.</p>

		<p>A <strong>skill pack</strong> is a higher-level concept. It's a curated bundle of services plus MCP tool definitions that give an AI agent a specific capability. For example:</p>

		<ul>
			<li><strong>Web Research</strong> skill pack: SearXNG (search) + Browserless (web scraping) + MCP tools for <code>search_web</code> and <code>scrape_url</code></li>
			<li><strong>Knowledge Base</strong> skill pack: Qdrant (vector DB) + Meilisearch (full-text search) + MCP tools for <code>store_document</code>, <code>semantic_search</code>, <code>keyword_search</code></li>
			<li><strong>Workflow Automation</strong> skill pack: n8n (workflows) + MCP tools for <code>trigger_workflow</code> and <code>list_workflows</code></li>
		</ul>

		<p>The addon stack API handles both. When you pass skill pack IDs alongside service IDs, the resolver automatically includes all required services and generates the MCP tool definitions.</p>

		<h2>Architecture: From Marketplace Click to Running Skills</h2>

		<p>Here's the complete flow from a user clicking "Install" in your marketplace to having a working AI skill:</p>

<pre><code>User clicks "Install RAG Pipeline" in marketplace UI
          │
          ▼
Your backend calls generateAddonStack({
  instanceId: "user-123",
  services: ["qdrant", "searxng"],
  skillPacks: ["knowledge-base"],
  generateSecrets: true,
  reservedPorts: [3000, 5432, 6379],
})
          │
          ▼
Core library:
  1. Resolves dependencies (adds required companion services)
  2. Generates Docker Compose overlay
  3. Generates environment with secrets
  4. Generates MCP skill definitions
  5. Generates proxy routes
          │
          ▼
Your backend:
  1. Writes compose overlay + env file to disk
  2. Writes skill files to config directory
  3. Patches openclaw.json with new skill entries
  4. Registers proxy routes in reverse proxy
  5. Runs "docker compose up -d"
          │
          ▼
AI agent can now use:
  - semantic_search(query) → searches Qdrant
  - web_search(query) → searches via SearXNG
  - store_document(text) → embeds and stores in Qdrant
</code></pre>

		<h2>Implementing the Marketplace Backend</h2>

		<p>Let's build the backend for a marketplace that offers both individual services and skill packs.</p>

<pre><code>import {
  generateAddonStack,
  updateAddonStack,
  getAllServices,
  getAllSkillPacks,
  getCompatibleSkillPacks,
  getServicesByCategory,
  SERVICE_CATEGORIES,
  type AddonStackResult,
  type ProxyRoute,
} from "@better-openclaw/core";

// ── Marketplace Catalog ─────────────────────────────────────────

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  type: "service" | "skill-pack";
  icon: string;
  memoryMB: number;
  services: string[];
}

function buildCatalog(): MarketplaceItem[] {
  const items: MarketplaceItem[] = [];

  // Add individual services
  for (const svc of getAllServices()) {
    // Skip infrastructure services — they're managed by the platform
    if (["redis", "postgresql", "caddy"].includes(svc.id)) continue;

    items.push({
      id: svc.id,
      name: svc.name,
      description: svc.description,
      type: "service",
      icon: SERVICE_CATEGORIES.find(c =&gt; c.id === svc.category)?.icon ?? "📦",
      memoryMB: svc.memoryMB,
      services: [svc.id],
    });
  }

  // Add skill packs as premium bundles
  for (const pack of getAllSkillPacks()) {
    const totalMemory = pack.requiredServices.reduce((sum, svcId) =&gt; {
      const svc = getAllServices().find(s =&gt; s.id === svcId);
      return sum + (svc?.memoryMB ?? 256);
    }, 0);

    items.push({
      id: \`pack-\${pack.id}\`,
      name: pack.name,
      description: pack.description,
      type: "skill-pack",
      icon: "🎯",
      memoryMB: totalMemory,
      services: pack.requiredServices,
    });
  }

  return items;
}
</code></pre>

		<h2>Smart Recommendations: Suggesting Skills Based on Installed Services</h2>

		<p>One of the most powerful features is recommending skill packs based on what the user already has installed:</p>

<pre><code>function getRecommendations(installedServices: string[]) {
  // Find skill packs the user could activate with their current services
  const compatible = getCompatibleSkillPacks(installedServices);

  // Find skill packs the user is one service away from
  const almostReady = getAllSkillPacks()
    .filter(pack =&gt; {
      const missing = pack.requiredServices
        .filter(s =&gt; !installedServices.includes(s));
      return missing.length === 1; // just one service away
    })
    .map(pack =&gt; ({
      pack,
      missingService: pack.requiredServices
        .find(s =&gt; !installedServices.includes(s))!,
    }));

  return { compatible, almostReady };
}

// Example usage:
const { compatible, almostReady } = getRecommendations(["n8n", "qdrant"]);

// compatible → skill packs that work with n8n + qdrant
// almostReady → [{ pack: "web-research", missingService: "searxng" }]
// UI: "Install SearXNG to unlock the Web Research skill pack!"
</code></pre>

		<h2>Secure Multi-Tenant Deployment</h2>

		<p>For a hosting platform serving multiple tenants, security is critical. Here's how to structure the deployment:</p>

<pre><code>import { AddonStackInputSchema } from "@better-openclaw/core";

async function installService(tenantId: string, rawInput: unknown) {
  // 1. ALWAYS validate untrusted input with Zod
  const input = AddonStackInputSchema.parse({
    ...rawInput,
    instanceId: \`tenant-\${tenantId}\`, // never trust client-supplied IDs
  });

  // 2. Check tenant quotas before generating
  const currentUsage = await getTenantMemoryUsage(tenantId);
  const estimatedNew = estimateMemoryForServices(input.services);
  const quota = await getTenantQuota(tenantId);

  if (currentUsage + estimatedNew &gt; quota.maxMemoryMB) {
    throw new Error(
      \`Memory quota exceeded. Current: \${currentUsage}MB, ` +
      \`Requested: \${estimatedNew}MB, Limit: \${quota.maxMemoryMB}MB\`
    );
  }

  // 3. Generate the addon stack with tenant-specific reserved ports
  const result = generateAddonStack({
    ...input,
    reservedPorts: [
      ...getInfrastructurePorts(),
      ...await getOtherTenantsActivePorts(tenantId),
    ],
  });

  // 4. Create tenant-isolated Docker network
  const networkName = \`openclaw-\${tenantId}\`;
  await ensureDockerNetwork(networkName);

  // 5. Deploy with tenant isolation
  await deployToTenantNamespace(tenantId, result);

  return {
    installed: result.metadata.resolvedServices,
    skipped: result.metadata.skippedServices,
    warnings: result.warnings,
  };
}
</code></pre>

		<h2>The Skill Files: What Gets Generated</h2>

		<p>When a service has skill bindings (like n8n's <code>n8n-trigger</code> skill), the addon stack generates skill definition files. These are JSON files that tell the OpenClaw gateway how to expose the service as an MCP tool:</p>

<pre><code>// Generated skill file: n8n-trigger.json
{
  "id": "n8n-trigger",
  "name": "N8N Workflow Trigger",
  "description": "Trigger n8n workflows via webhook",
  "service": "n8n",
  "tools": [
    {
      "name": "trigger_workflow",
      "description": "Trigger an n8n workflow by webhook URL",
      "inputSchema": {
        "type": "object",
        "properties": {
          "webhookPath": { "type": "string" },
          "payload": { "type": "object" }
        },
        "required": ["webhookPath"]
      }
    }
  ]
}

// The openclawConfigPatch merges into openclaw.json:
// result.openclawConfigPatch = {
//   skills: {
//     entries: {
//       "n8n-trigger": { enabled: true, config: {} }
//     }
//   }
// }
</code></pre>

		<h2>Building the Frontend: Service Cards with Status</h2>

		<p>Here's a pattern for building marketplace cards that show real-time status. The structured env vars from the addon stack result power the configuration UI:</p>

<pre><code>// Your React/Vue/Svelte component receives this data:
interface ServiceCardProps {
  serviceId: string;
  name: string;
  description: string;
  status: "running" | "stopped" | "installing" | "error";
  proxyRoute?: ProxyRoute;  // from result.proxyRoutes
  envVars: {                // from result.envVars
    key: string;
    value: string;
    description: string;
    secret: boolean;
    editable: boolean;
  }[];
  memoryMB: number;
  skills: string[];         // skill IDs this service enables
}

// The envVars give you everything needed for a settings UI:
// - Display descriptions to help users understand each variable
// - Mask secret values (show "••••••" with a reveal button)
// - Mark editable vs. system-managed variables
// - Group by service for organized configuration panels
</code></pre>

		<h2>Advanced: Custom Service Definitions</h2>

		<p>The addon stack API works with any service in the OpenClaw registry. But you can also extend it with custom services. The service definition schema is straightforward:</p>

<pre><code>import { ServiceDefinitionSchema } from "@better-openclaw/core";

// Define a custom service (e.g., your proprietary tool)
const myService = ServiceDefinitionSchema.parse({
  id: "my-custom-tool",
  name: "My Custom Tool",
  description: "A proprietary analytics dashboard",
  category: "analytics",
  image: "registry.example.com/my-tool:latest",
  ports: [{ container: 8080, host: 8080, protocol: "http" }],
  environment: [
    {
      key: "DATABASE_URL",
      description: "PostgreSQL connection string",
      required: true,
      secret: true,
      defaultValue: "postgresql://my_tool:\${MY_TOOL_DB_PASSWORD}@postgresql:5432/my_tool",
    },
  ],
  volumes: [
    { host: "./data/my-tool", container: "/app/data", description: "Persistent data" },
  ],
  memoryMB: 512,
  maturity: "stable",
  proxyPath: "/my-tool",
  capDropCompatible: true,
  healthCheck: {
    test: ["CMD-SHELL", "curl -sf http://localhost:8080/health || exit 1"],
    interval: "30s",
    timeout: "10s",
    retries: 3,
    startPeriod: "15s",
  },
});
</code></pre>

		<h2>Monitoring Your Marketplace</h2>

		<p>Use the metadata from addon stack generation to build operational dashboards:</p>

<pre><code>// After each generation, log the metadata for analytics:
const result = generateAddonStack(input);

analytics.track("addon_stack_generated", {
  instanceId: input.instanceId,
  requestedServices: input.services,
  resolvedServices: result.metadata.resolvedServices,
  skippedCount: result.metadata.skippedServices.length,
  skipReasons: result.metadata.skippedServices.map(s =&gt; s.reason),
  portConflicts: Object.keys(result.metadata.portAssignments).length,
  warningCount: result.warnings.length,
  serviceCount: result.metadata.serviceCount,
});

// Track which services are most popular
// Track which services are most often skipped (and why)
// Track port conflict frequency to optimize your reserved ports list
</code></pre>

		<h2>Putting It All Together</h2>

		<p>The combination of addon stacks and skill packs transforms a basic hosting platform into an intelligent service marketplace. Users get:</p>

		<ul>
			<li><strong>One-click service installation</strong> with automatic secret generation and port allocation</li>
			<li><strong>AI-ready capabilities</strong> through skill packs that wire services directly to MCP tools</li>
			<li><strong>Smart recommendations</strong> that suggest skill packs based on installed services</li>
			<li><strong>Safe incremental updates</strong> that preserve existing configuration when adding/removing services</li>
			<li><strong>Production-grade output</strong> with healthchecks, proper depends_on ordering, and database initialization</li>
		</ul>

		<p>And hosting providers get all of this from a single TypeScript package with zero native dependencies, validated by Zod schemas at every boundary.</p>

		<p>Ready to build your marketplace? Start with the <a href="/docs/api/addon-stack">Addon Stack API Reference</a> and the <a href="/docs/guides/hosting-integration">Hosting Provider Integration Guide</a>.</p>
	`,
};
