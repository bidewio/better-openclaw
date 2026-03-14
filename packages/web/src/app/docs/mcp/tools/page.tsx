import Link from "next/link";

export const metadata = {
	title: "MCP Tools Reference — better-openclaw Docs",
	description:
		"Complete reference for all 10 MCP tools in better-openclaw: generate-stack, list-services, suggest-services, validate-stack, and more.",
};

export default function McpToolsPage() {
	return (
		<>
			<h1>MCP Tools Reference</h1>
			<p>
				Detailed reference for every tool exposed by the <code>@better-openclaw/mcp</code> server.
				Each tool can be called by any MCP-compatible AI client (Claude, Cursor, Windsurf, etc.).
			</p>

			<h2>
				<code>generate-stack</code>
			</h2>
			<p>
				The primary tool — generates a complete, deployable Docker Compose stack from a list of
				service IDs. Returns all generated files as a JSON map.
			</p>
			<h4>Parameters</h4>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>projectName</code>
						</td>
						<td>string</td>
						<td>✓</td>
						<td>
							Lowercase alphanumeric with hyphens (e.g. <code>my-stack</code>)
						</td>
					</tr>
					<tr>
						<td>
							<code>services</code>
						</td>
						<td>string[]</td>
						<td>✓</td>
						<td>
							Service IDs (e.g.{" "}
							<code>[&quot;postgresql&quot;, &quot;redis&quot;, &quot;n8n&quot;]</code>)
						</td>
					</tr>
					<tr>
						<td>
							<code>skillPacks</code>
						</td>
						<td>string[]</td>
						<td></td>
						<td>Skill pack IDs to include</td>
					</tr>
					<tr>
						<td>
							<code>proxy</code>
						</td>
						<td>enum</td>
						<td></td>
						<td>
							<code>none</code> | <code>caddy</code> | <code>traefik</code>
						</td>
					</tr>
					<tr>
						<td>
							<code>domain</code>
						</td>
						<td>string</td>
						<td></td>
						<td>Domain for reverse proxy routing</td>
					</tr>
					<tr>
						<td>
							<code>gpu</code>
						</td>
						<td>boolean</td>
						<td></td>
						<td>Enable GPU passthrough</td>
					</tr>
					<tr>
						<td>
							<code>platform</code>
						</td>
						<td>enum</td>
						<td></td>
						<td>
							<code>linux/amd64</code> | <code>linux/arm64</code> | <code>windows/amd64</code> |{" "}
							<code>macos/amd64</code> | <code>macos/arm64</code>
						</td>
					</tr>
					<tr>
						<td>
							<code>monitoring</code>
						</td>
						<td>boolean</td>
						<td></td>
						<td>Include Grafana + Prometheus</td>
					</tr>
					<tr>
						<td>
							<code>generateSecrets</code>
						</td>
						<td>boolean</td>
						<td></td>
						<td>Auto-generate passwords and keys</td>
					</tr>
					<tr>
						<td>
							<code>primaryFramework</code>
						</td>
						<td>enum</td>
						<td></td>
						<td>
							Primary agent framework: <code>openclaw</code> | <code>copaw</code> |{" "}
							<code>nanoclaw</code> | <code>nanobot</code> | <code>zeroclaw</code> |{" "}
							<code>memu</code> | <code>claude-code</code> | <code>codex</code>
						</td>
					</tr>
					<tr>
						<td>
							<code>companionFrameworks</code>
						</td>
						<td>string[]</td>
						<td></td>
						<td>Companion agent frameworks to run alongside the primary</td>
					</tr>
				</tbody>
			</table>
			<h4>Returns</h4>
			<p>
				JSON with <code>files</code> (filename → content map), <code>metadata</code> (service count,
				skill count, memory estimate), and <code>fileList</code>.
			</p>

			<hr />

			<h2>
				<code>list-services</code>
			</h2>
			<p>
				Returns every service in the catalog. Useful for showing the user what&apos;s available or
				building picker UIs.
			</p>
			<h4>Parameters</h4>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>category</code>
						</td>
						<td>string</td>
						<td></td>
						<td>
							Filter by category (e.g. <code>database</code>, <code>ai</code>,{" "}
							<code>monitoring</code>)
						</td>
					</tr>
				</tbody>
			</table>

			<hr />

			<h2>
				<code>get-service</code>
			</h2>
			<p>
				Get full details for a single service by its ID. Includes ports, volumes, health checks,
				environment variables, and dependencies.
			</p>
			<h4>Parameters</h4>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>id</code>
						</td>
						<td>string</td>
						<td>✓</td>
						<td>
							Service ID (e.g. <code>postgresql</code>)
						</td>
					</tr>
				</tbody>
			</table>

			<hr />

			<h2>
				<code>search-services</code>
			</h2>
			<p>
				Full-text search across service names, descriptions, tags, and categories. Returns matching
				services ranked by relevance.
			</p>
			<h4>Parameters</h4>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>query</code>
						</td>
						<td>string</td>
						<td>✓</td>
						<td>
							Search query (e.g. <code>vector database</code>)
						</td>
					</tr>
				</tbody>
			</table>

			<hr />

			<h2>
				<code>suggest-services</code>
			</h2>
			<p>
				Suggest services based on a natural language description. Uses keyword matching and scoring
				— no LLM round-trip needed. Ideal for translating user goals into concrete service lists.
			</p>
			<h4>Parameters</h4>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>description</code>
						</td>
						<td>string</td>
						<td>✓</td>
						<td>
							Natural language description (e.g. <code>AI chatbot with monitoring</code>)
						</td>
					</tr>
					<tr>
						<td>
							<code>limit</code>
						</td>
						<td>number</td>
						<td></td>
						<td>Max results (1–30, default 10)</td>
					</tr>
				</tbody>
			</table>

			<hr />

			<h2>
				<code>list-presets</code>
			</h2>
			<p>
				Returns all curated presets (minimal, researcher, devops, local-ai, full) with their service
				lists and descriptions.
			</p>
			<h4>Parameters</h4>
			<p>None.</p>

			<hr />

			<h2>
				<code>get-preset</code>
			</h2>
			<p>Get full details for a specific preset including all service IDs and skill packs.</p>
			<h4>Parameters</h4>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>id</code>
						</td>
						<td>string</td>
						<td>✓</td>
						<td>
							Preset ID (e.g. <code>researcher</code>)
						</td>
					</tr>
				</tbody>
			</table>

			<hr />

			<h2>
				<code>list-skill-packs</code>
			</h2>
			<p>Lists all available skill packs with their skill bindings and compatible services.</p>
			<h4>Parameters</h4>
			<p>None.</p>

			<hr />

			<h2>
				<code>resolve-deps</code>
			</h2>
			<p>
				Given a list of service IDs, resolves the full dependency graph. Shows which services get
				auto-added (e.g. selecting <code>n8n</code> auto-adds <code>postgresql</code>).
			</p>
			<h4>Parameters</h4>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>services</code>
						</td>
						<td>string[]</td>
						<td>✓</td>
						<td>Service IDs to resolve</td>
					</tr>
				</tbody>
			</table>

			<hr />

			<h2>
				<code>validate-stack</code>
			</h2>
			<p>
				Validates a proposed stack before generation. Checks for port conflicts, missing
				dependencies, and returns resource estimates. Use this before calling{" "}
				<code>generate-stack</code>.
			</p>
			<h4>Parameters</h4>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Required</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>services</code>
						</td>
						<td>string[]</td>
						<td>✓</td>
						<td>Service IDs to validate</td>
					</tr>
				</tbody>
			</table>

			<h2>Next Steps</h2>
			<ul>
				<li>
					<Link href="/docs/mcp">MCP Overview</Link> — setup, configuration, and examples
				</li>
				<li>
					<Link href="/docs/services">Service Catalog</Link> — browse all available services
				</li>
			</ul>
		</>
	);
}
