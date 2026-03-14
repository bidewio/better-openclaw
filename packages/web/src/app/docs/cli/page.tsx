import Link from "next/link";

export const metadata = {
	title: "CLI Reference — better-openclaw Docs",
	description:
		"Complete CLI reference for better-openclaw. All commands, flags, non-interactive mode, and usage examples.",
};

export default function CliReferencePage() {
	return (
		<>
			<h1>CLI Reference</h1>
			<p>
				The <code>create-better-openclaw</code> CLI is the primary way to generate AI agent stacks.
				Choose from 8 agent frameworks, use an <Link href="/docs/cli/wizard">interactive wizard</Link>, or
				run fully non-interactive for CI/CD pipelines.
			</p>

			<h2>Basic Usage</h2>
			<pre>
				<code>{`create-better-openclaw <project-name> [options]`}</code>
			</pre>
			<p>
				If no options are provided, the CLI launches the interactive wizard. If <code>--yes</code>{" "}
				is passed, it uses defaults combined with any explicit flags.
			</p>

			<h2>Flag Cheat Sheet</h2>
			<table>
				<thead>
					<tr>
						<th>Flag</th>
						<th>Type</th>
						<th>Default</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>--preset &lt;name&gt;</code>
						</td>
						<td>string</td>
						<td>—</td>
						<td>Use a named preset (minimal, researcher, devops, local-ai, full)</td>
					</tr>
					<tr>
						<td>
							<code>--services &lt;list&gt;</code>
						</td>
						<td>string</td>
						<td>—</td>
						<td>
							Comma-separated service IDs (e.g. <code>qdrant,redis,n8n</code>)
						</td>
					</tr>
					<tr>
						<td>
							<code>--skills &lt;list&gt;</code>
						</td>
						<td>string</td>
						<td>—</td>
						<td>Comma-separated skill pack IDs</td>
					</tr>
					<tr>
						<td>
							<code>--proxy &lt;type&gt;</code>
						</td>
						<td>string</td>
						<td>
							<code>none</code>
						</td>
						<td>
							Reverse proxy: <code>caddy</code>, <code>traefik</code>, <code>nginx</code>, or{" "}
							<code>none</code>
						</td>
					</tr>
					<tr>
						<td>
							<code>--domain &lt;name&gt;</code>
						</td>
						<td>string</td>
						<td>—</td>
						<td>
							Domain name for reverse proxy (requires <code>--proxy</code>)
						</td>
					</tr>
					<tr>
						<td>
							<code>--primary-framework &lt;id&gt;</code>
						</td>
						<td>string</td>
						<td>
							<code>openclaw</code>
						</td>
						<td>
							Primary agent framework: <code>openclaw</code>, <code>copaw</code>,{" "}
							<code>nanoclaw</code>, <code>nanobot</code>, <code>zeroclaw</code>,{" "}
							<code>memu</code>, <code>claude-code</code>, <code>codex</code>
						</td>
					</tr>
					<tr>
						<td>
							<code>--companion-frameworks &lt;list&gt;</code>
						</td>
						<td>string</td>
						<td>—</td>
						<td>Comma-separated companion frameworks to run alongside the primary</td>
					</tr>
					<tr>
						<td>
							<code>--gpu</code>
						</td>
						<td>boolean</td>
						<td>
							<code>false</code>
						</td>
						<td>Enable GPU passthrough for Ollama, Whisper, etc.</td>
					</tr>
					<tr>
						<td>
							<code>--platform &lt;arch&gt;</code>
						</td>
						<td>string</td>
						<td>auto</td>
						<td>
							Target platform (e.g. <code>linux/arm64</code>)
						</td>
					</tr>
					<tr>
						<td>
							<code>--deployment-type &lt;type&gt;</code>
						</td>
						<td>string</td>
						<td>
							<code>docker</code>
						</td>
						<td>
							<strong>docker</strong>: all services in containers. <strong>bare-metal</strong>:
							native + Docker hybrid — services with a native recipe (e.g. Redis on Linux) get
							install scripts in <code>native/</code>; top-level <code>install.sh</code> /{" "}
							<code>install.ps1</code> runs native first, then <code>docker compose up</code>. See{" "}
							<Link href="/docs/deployment#bare-metal">Bare-metal deployment</Link>.
						</td>
					</tr>
					<tr>
						<td>
							<code>--generateSecrets</code>
						</td>
						<td>boolean</td>
						<td>
							<code>true</code>
						</td>
						<td>Auto-generate random passwords and API keys</td>
					</tr>
					<tr>
						<td>
							<code>--yes</code>
						</td>
						<td>boolean</td>
						<td>
							<code>false</code>
						</td>
						<td>Skip all prompts, use defaults + flags</td>
					</tr>
					<tr>
						<td>
							<code>--output &lt;dir&gt;</code>
						</td>
						<td>string</td>
						<td>
							<code>./{`<project>`}</code>
						</td>
						<td>Custom output directory</td>
					</tr>
					<tr>
						<td>
							<code>--dry-run</code>
						</td>
						<td>boolean</td>
						<td>
							<code>false</code>
						</td>
						<td>Show what would be generated without writing files</td>
					</tr>
					<tr>
						<td>
							<code>--version</code>
						</td>
						<td>—</td>
						<td>—</td>
						<td>Print version number</td>
					</tr>
					<tr>
						<td>
							<code>--help</code>
						</td>
						<td>—</td>
						<td>—</td>
						<td>Show help message</td>
					</tr>
				</tbody>
			</table>

			<h2>Non-Interactive Mode</h2>
			<p>
				Pass <code>--yes</code> to skip all interactive prompts. Combine with other flags to fully
				automate stack generation — perfect for CI/CD, scripts, or infrastructure-as-code workflows.
			</p>
			<pre>
				<code>{`# Minimal stack with no prompts
npx create-better-openclaw my-stack --preset minimal --yes

# Custom service selection
npx create-better-openclaw my-stack \\
  --services qdrant,redis,n8n,searxng \\
  --skills researcher,automation \\
  --proxy caddy \\
  --domain ai.example.com \\
  --yes

# Dry run to preview
npx create-better-openclaw my-stack \\
  --preset full \\
  --dry-run`}</code>
			</pre>

			<h2>Examples</h2>

			<h3>Research Assistant Stack</h3>
			<pre>
				<code>{`npx create-better-openclaw research-stack \\
  --preset researcher \\
  --proxy caddy \\
  --domain research.example.com \\
  --yes`}</code>
			</pre>

			<h3>Local-Only AI (No Cloud APIs)</h3>
			<pre>
				<code>{`npx create-better-openclaw local-ai \\
  --services ollama,whisper,redis,qdrant \\
  --skills local-ai,memory \\
  --gpu \\
  --yes`}</code>
			</pre>

			<h3>Production VPS Deployment</h3>
			<pre>
				<code>{`npx create-better-openclaw prod-stack \\
  --preset devops \\
  --proxy caddy \\
  --domain openclaw.mycompany.com \\
  --generateSecrets \\
  --yes`}</code>
			</pre>

			<h3>Different Agent Framework</h3>
			<pre>
				<code>{`npx create-better-openclaw my-stack \\
  --services postgresql,redis,n8n \\
  --primary-framework zeroclaw \\
  --companion-frameworks copaw \\
  --yes`}</code>
			</pre>

			<h3>ARM64 Homelab (Raspberry Pi / Apple Silicon)</h3>
			<pre>
				<code>{`npx create-better-openclaw homelab-stack \\
  --preset minimal \\
  --platform linux/arm64 \\
  --yes`}</code>
			</pre>

			<h3>Custom Output Directory</h3>
			<pre>
				<code>{`npx create-better-openclaw my-stack \\
  --preset researcher \\
  --output ~/projects/ai-stacks/my-stack \\
  --yes`}</code>
			</pre>

			<h3>Bare-metal (native + Docker)</h3>
			<pre>
				<code>{`npx create-better-openclaw my-stack \\
  --preset minimal \\
  --deployment-type bare-metal \\
  --platform linux/amd64 \\
  --yes`}</code>
			</pre>
			<p>
				Generates <code>native/install-linux.sh</code> (or Windows/macOS), <code>install.sh</code>/
				<code>install.ps1</code>, and a Docker Compose file for the remaining services. See{" "}
				<Link href="/docs/deployment#bare-metal">Deployment → Bare-metal</Link> for details.
			</p>

			<h2>Exit Codes</h2>
			<table>
				<thead>
					<tr>
						<th>Code</th>
						<th>Meaning</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>0</code>
						</td>
						<td>Success</td>
					</tr>
					<tr>
						<td>
							<code>1</code>
						</td>
						<td>General error (invalid flags, missing dependencies)</td>
					</tr>
					<tr>
						<td>
							<code>2</code>
						</td>
						<td>Validation error (conflicting services, invalid preset)</td>
					</tr>
					<tr>
						<td>
							<code>130</code>
						</td>
						<td>User cancelled (Ctrl+C)</td>
					</tr>
				</tbody>
			</table>

			<h2>Environment Variables</h2>
			<p>The CLI respects the following environment variables:</p>
			<table>
				<thead>
					<tr>
						<th>Variable</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>OPENCLAW_DEFAULT_PRESET</code>
						</td>
						<td>
							Default preset when no <code>--preset</code> is provided
						</td>
					</tr>
					<tr>
						<td>
							<code>OPENCLAW_PROXY</code>
						</td>
						<td>Default reverse proxy type</td>
					</tr>
					<tr>
						<td>
							<code>NO_COLOR</code>
						</td>
						<td>Disable colored output (standard convention)</td>
					</tr>
				</tbody>
			</table>

			<h2>Next Steps</h2>
			<ul>
				<li>
					<Link href="/docs/cli/wizard">Interactive Wizard</Link> — step-by-step walkthrough of each
					prompt
				</li>
				<li>
					<Link href="/docs/api">API Reference</Link> — programmatic stack generation via REST
				</li>
				<li>
					<Link href="/docs/services">Service Catalog</Link> — all available services
				</li>
			</ul>
		</>
	);
}
