import Link from "next/link";

export const metadata = {
	title: "Addon Stack API — better-openclaw Docs",
	description:
		"API reference for generateAddonStack() and updateAddonStack(). Generate Docker Compose addon stacks for hosting providers without post-processing hacks.",
};

export default function AddonStackApiPage() {
	return (
		<>
			<h1>Addon Stack API</h1>
			<p>
				The Addon Stack API lets hosting providers generate Docker Compose overlay files that add
				services to an <strong>existing</strong> OpenClaw infrastructure. Unlike the full-stack{" "}
				<code>generate()</code> pipeline, these functions produce only the addon layer &mdash; no
				gateway, no Redis, no PostgreSQL, no reverse proxy.
			</p>
			<p>
				This is the recommended integration point for platforms like Clawexa that already provision
				core infrastructure via cloud-init or similar tooling.
			</p>

			<h2>Installation</h2>
			<pre>
				<code>{`npm install @better-openclaw/core
# or
pnpm add @better-openclaw/core`}</code>
			</pre>

			<h2>Quick Example</h2>
			<pre>
				<code>{`import { generateAddonStack } from "@better-openclaw/core";

const result = generateAddonStack({
  instanceId: "user-abc-123",
  services: ["n8n", "qdrant", "meilisearch"],
  generateSecrets: true,
  reservedPorts: [3000, 5432, 6379], // ports used by your infra
});

// result.composeOverride  → Docker Compose YAML string
// result.envFile          → .env file contents
// result.proxyRoutes      → routes to register in your reverse proxy
// result.openclawConfigPatch → openclaw.json skill entries
// result.metadata         → resolved services, port assignments, etc.`}</code>
			</pre>

			<hr />

			<h2 id="generate-addon-stack">
				<code>generateAddonStack(input)</code>
			</h2>
			<p>
				Generates a complete addon stack from a list of service IDs. Returns Docker Compose YAML,
				environment variables, proxy routes, and skill configuration &mdash; ready to write to disk
				and <code>docker compose up</code>.
			</p>

			<h3>Parameters</h3>
			<table>
				<thead>
					<tr>
						<th>Field</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>instanceId</code>
						</td>
						<td>string</td>
						<td>Yes</td>
						<td>Unique identifier for this deployment (used as Docker project name)</td>
					</tr>
					<tr>
						<td>
							<code>services</code>
						</td>
						<td>string[]</td>
						<td>Yes</td>
						<td>
							Service IDs to install (e.g. <code>["n8n", "qdrant"]</code>). Infrastructure IDs like{" "}
							<code>redis</code> or <code>postgresql</code> are automatically filtered out with a
							warning.
						</td>
					</tr>
					<tr>
						<td>
							<code>skillPacks</code>
						</td>
						<td>string[]</td>
						<td>No</td>
						<td>Optional skill pack IDs to include</td>
					</tr>
					<tr>
						<td>
							<code>reservedPorts</code>
						</td>
						<td>number[]</td>
						<td>No</td>
						<td>
							Host ports already in use by your infrastructure. Conflicts are auto-reassigned to
							port+1000.
						</td>
					</tr>
					<tr>
						<td>
							<code>generateSecrets</code>
						</td>
						<td>boolean</td>
						<td>No</td>
						<td>
							Generate random secrets for all service passwords/keys (default: <code>true</code>)
						</td>
					</tr>
					<tr>
						<td>
							<code>credentials</code>
						</td>
						<td>Record&lt;string, Record&lt;string, string&gt;&gt;</td>
						<td>No</td>
						<td>
							User-provided credentials keyed by service ID, then env var name. Example:{" "}
							<code>{`{ "openai": { "OPENAI_API_KEY": "sk-..." } }`}</code>
						</td>
					</tr>
					<tr>
						<td>
							<code>prebuiltImages</code>
						</td>
						<td>Record&lt;string, string&gt;</td>
						<td>No</td>
						<td>
							Override Docker images for services that normally require <code>docker build</code>
						</td>
					</tr>
					<tr>
						<td>
							<code>platform</code>
						</td>
						<td>string</td>
						<td>No</td>
						<td>
							Target platform (default: <code>&quot;linux/amd64&quot;</code>)
						</td>
					</tr>
					<tr>
						<td>
							<code>gpu</code>
						</td>
						<td>boolean</td>
						<td>No</td>
						<td>Whether the host has GPU support</td>
					</tr>
				</tbody>
			</table>

			<h3>
				Return Value: <code>AddonStackResult</code>
			</h3>
			<table>
				<thead>
					<tr>
						<th>Field</th>
						<th>Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>composeOverride</code>
						</td>
						<td>string</td>
						<td>
							Complete <code>docker-compose.override.yml</code> YAML. Includes only addon services
							plus <code>openclaw-network</code> as external.
						</td>
					</tr>
					<tr>
						<td>
							<code>envFile</code>
						</td>
						<td>string</td>
						<td>
							Environment variable file contents. Excludes infrastructure-managed keys (REDIS_*,
							POSTGRES_*, OPENCLAW_*).
						</td>
					</tr>
					<tr>
						<td>
							<code>envVars</code>
						</td>
						<td>EnvVarGroup[]</td>
						<td>Structured env vars grouped by service, suitable for UI rendering</td>
					</tr>
					<tr>
						<td>
							<code>proxyRoutes</code>
						</td>
						<td>ProxyRoute[]</td>
						<td>Reverse proxy routes to register (path, port, protocol, stripPrefix flag)</td>
					</tr>
					<tr>
						<td>
							<code>skillFiles</code>
						</td>
						<td>Record&lt;string, string&gt;</td>
						<td>Skill definition files to write to the config directory</td>
					</tr>
					<tr>
						<td>
							<code>openclawConfigPatch</code>
						</td>
						<td>object</td>
						<td>
							JSON patch for <code>openclaw.json</code> &mdash; contains skill entries to merge
						</td>
					</tr>
					<tr>
						<td>
							<code>warnings</code>
						</td>
						<td>string[]</td>
						<td>Non-fatal warnings (filtered infra services, dependency notes, etc.)</td>
					</tr>
					<tr>
						<td>
							<code>metadata</code>
						</td>
						<td>object</td>
						<td>
							Includes <code>serviceCount</code>, <code>resolvedServices</code>,{" "}
							<code>skippedServices</code>, <code>portAssignments</code>, and{" "}
							<code>addedDependencies</code>
						</td>
					</tr>
				</tbody>
			</table>

			<h3>Skipped Services</h3>
			<p>
				Services may be skipped (excluded from output) without throwing an error. Each skipped
				service includes a reason:
			</p>
			<table>
				<thead>
					<tr>
						<th>Reason</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>missing_credentials</code>
						</td>
						<td>
							Service requires API keys that weren&apos;t provided and can&apos;t be auto-generated
						</td>
					</tr>
					<tr>
						<td>
							<code>no_image</code>
						</td>
						<td>
							Service requires <code>docker build</code> and no <code>prebuiltImage</code> is
							available
						</td>
					</tr>
					<tr>
						<td>
							<code>gpu_required</code>
						</td>
						<td>Service needs GPU but host doesn&apos;t have GPU support</td>
					</tr>
					<tr>
						<td>
							<code>unknown_service</code>
						</td>
						<td>Service ID doesn&apos;t match any known service definition</td>
					</tr>
				</tbody>
			</table>

			<hr />

			<h2 id="update-addon-stack">
				<code>updateAddonStack(input)</code>
			</h2>
			<p>
				Incrementally adds or removes services from an existing addon stack. Preserves user-modified
				environment values and computes diffs for orchestration.
			</p>

			<h3>Parameters</h3>
			<table>
				<thead>
					<tr>
						<th>Field</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>instanceId</code>
						</td>
						<td>string</td>
						<td>Yes</td>
						<td>Same instance ID used in the original generation</td>
					</tr>
					<tr>
						<td>
							<code>currentCompose</code>
						</td>
						<td>string</td>
						<td>Yes</td>
						<td>Current compose override YAML (as returned by generateAddonStack)</td>
					</tr>
					<tr>
						<td>
							<code>currentEnv</code>
						</td>
						<td>string</td>
						<td>Yes</td>
						<td>Current .env file contents</td>
					</tr>
					<tr>
						<td>
							<code>addServices</code>
						</td>
						<td>string[]</td>
						<td>No</td>
						<td>Service IDs to add</td>
					</tr>
					<tr>
						<td>
							<code>removeServices</code>
						</td>
						<td>string[]</td>
						<td>No</td>
						<td>Service IDs to remove</td>
					</tr>
					<tr>
						<td>
							<code>generateSecrets</code>
						</td>
						<td>boolean</td>
						<td>No</td>
						<td>Generate secrets for newly added services</td>
					</tr>
				</tbody>
			</table>

			<h3>
				Return Value: <code>AddonStackUpdateResult</code>
			</h3>
			<table>
				<thead>
					<tr>
						<th>Field</th>
						<th>Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>composeOverride</code>
						</td>
						<td>string</td>
						<td>Updated Docker Compose YAML</td>
					</tr>
					<tr>
						<td>
							<code>envFile</code>
						</td>
						<td>string</td>
						<td>Merged environment file &mdash; existing values are preserved, new vars added</td>
					</tr>
					<tr>
						<td>
							<code>proxyRoutes</code>
						</td>
						<td>ProxyRoute[]</td>
						<td>Full set of proxy routes for the updated stack</td>
					</tr>
					<tr>
						<td>
							<code>imagesToPull</code>
						</td>
						<td>string[]</td>
						<td>Docker images that need to be pulled for added services</td>
					</tr>
					<tr>
						<td>
							<code>metadata</code>
						</td>
						<td>object</td>
						<td>
							Includes <code>added</code>, <code>removed</code>, and <code>unchanged</code> service
							arrays
						</td>
					</tr>
				</tbody>
			</table>

			<hr />

			<h2 id="infrastructure-filtering">Infrastructure Filtering</h2>
			<p>
				The addon stack API automatically filters out infrastructure services that are expected to
				be managed by the hosting platform:
			</p>
			<pre>
				<code>{`// These service IDs are always excluded from addon output:
openclaw-gateway, openclaw-cli, redis, postgresql,
open-webui, caddy, traefik, postgres-setup,
convex, convex-dashboard, mission-control`}</code>
			</pre>
			<p>
				If a user requests an infrastructure service, it&apos;s silently removed and a warning is
				added to the result. Services that <em>depend</em> on infrastructure (like n8n needing
				PostgreSQL) automatically get a <code>postgres-setup</code> init container that connects to
				the existing database.
			</p>

			<h2 id="port-conflicts">Port Conflict Resolution</h2>
			<p>
				Pass your infrastructure&apos;s occupied ports via <code>reservedPorts</code>. When an addon
				service&apos;s default port conflicts, it&apos;s automatically reassigned to{" "}
				<code>port + 1000</code>. The actual assignments are reported in{" "}
				<code>metadata.portAssignments</code>.
			</p>
			<pre>
				<code>{`const result = generateAddonStack({
  instanceId: "prod-01",
  services: ["n8n"],
  reservedPorts: [5678], // n8n's default port is taken
});

// n8n will be assigned port 6678 instead
console.log(result.metadata.portAssignments);
// { "n8n:5678": 6678 }`}</code>
			</pre>

			<h2 id="proxy-routes">Proxy Routes</h2>
			<p>
				Each service with a <code>proxyPath</code> definition generates a proxy route. Use these to
				configure your reverse proxy (Caddy, Traefik, nginx):
			</p>
			<pre>
				<code>{`for (const route of result.proxyRoutes) {
  console.log(route);
  // { serviceId: "n8n", path: "/n8n", port: 5678, protocol: "http", stripPrefix: true }
}

// Caddy example:
// handle_path /n8n/* {
//   reverse_proxy n8n:5678
// }`}</code>
			</pre>

			<h2 id="env-quirks">Environment Quirks</h2>
			<p>
				Some services have known environment variable issues. The addon stack API handles these
				automatically via the <code>envQuirks</code> system:
			</p>
			<ul>
				<li>
					<strong>empty_string_crashes</strong> &mdash; setting an env var to an empty string causes
					the service to crash. The API sets a safe default value.
				</li>
				<li>
					<strong>min_length</strong> &mdash; the value must be at least N bytes. The API generates
					appropriately-sized secrets.
				</li>
				<li>
					<strong>must_sync</strong> &mdash; two env vars must have the same value. The API syncs
					them automatically.
				</li>
			</ul>

			<h2 id="schemas">Zod Schemas</h2>
			<p>
				All input/output types are defined as Zod schemas and exported from{" "}
				<code>@better-openclaw/core</code>:
			</p>
			<pre>
				<code>{`import {
  AddonStackInputSchema,
  AddonStackResultSchema,
  AddonStackUpdateInputSchema,
  AddonStackUpdateResultSchema,
  ProxyRouteSchema,
  SkippedServiceSchema,
} from "@better-openclaw/core";

// Validate external input before passing to generateAddonStack:
const parsed = AddonStackInputSchema.parse(untrustedInput);
const result = generateAddonStack(parsed);`}</code>
			</pre>

			<p>
				See also: <Link href="/docs/api/endpoints">REST API Endpoints</Link> |{" "}
				<Link href="/docs/guides/hosting-integration">Hosting Provider Integration Guide</Link>
			</p>
		</>
	);
}
