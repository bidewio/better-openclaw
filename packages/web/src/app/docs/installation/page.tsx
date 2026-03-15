import Link from "next/link";

export const metadata = {
	title: "Installation — better-openclaw Docs",
	description:
		"Detailed installation guide for better-openclaw CLI. Global installs, npx usage, system requirements, and troubleshooting.",
};

export default function InstallationPage() {
	return (
		<>
			<h1>Installation</h1>
			<p>
				This guide covers all the ways to install and run better-openclaw, including global
				installation, one-off usage with npx, and system requirements.
			</p>

			<h2>System Requirements</h2>
			<table>
				<thead>
					<tr>
						<th>Component</th>
						<th>Requirement</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>OS</td>
						<td>macOS, Linux, Windows (WSL2)</td>
						<td>Native Windows works but WSL2 is recommended</td>
					</tr>
					<tr>
						<td>Node.js</td>
						<td>20.0 or later</td>
						<td>LTS version recommended</td>
					</tr>
					<tr>
						<td>Docker Engine</td>
						<td>24.0 or later</td>
						<td>Docker Desktop or standalone engine</td>
					</tr>
					<tr>
						<td>Docker Compose</td>
						<td>v2.20 or later</td>
						<td>
							<code>docker-compose-plugin</code> on Linux
						</td>
					</tr>
					<tr>
						<td>RAM</td>
						<td>4 GB minimum</td>
						<td>8 GB+ recommended for AI services (Ollama, Whisper)</td>
					</tr>
					<tr>
						<td>Disk</td>
						<td>10 GB free</td>
						<td>More if pulling large AI models</td>
					</tr>
				</tbody>
			</table>

			<h2>Option 1: Run with npx (No Install)</h2>
			<p>
				The easiest way to use better-openclaw. No global install needed — npx downloads and runs
				the latest version automatically:
			</p>
			<pre>
				<code>{`npx create-better-openclaw@latest my-stack`}</code>
			</pre>
			<p>
				This always fetches the latest published version. Use this if you only generate stacks
				occasionally.
			</p>

			<h3>With pnpm</h3>
			<pre>
				<code>{`pnpm create better-openclaw@latest my-stack`}</code>
			</pre>

			<h3>With bun</h3>
			<pre>
				<code>{`bun create better-openclaw@latest my-stack`}</code>
			</pre>

			<h2>Option 2: Global Install</h2>
			<p>
				Install globally if you generate stacks frequently. This avoids the download on every run:
			</p>
			<pre>
				<code>{`# With npm
npm install -g create-better-openclaw

# With pnpm
pnpm add -g create-better-openclaw

# With bun
bun add -g create-better-openclaw`}</code>
			</pre>
			<p>Then run directly:</p>
			<pre>
				<code>{`create-better-openclaw my-stack`}</code>
			</pre>

			<h3>Updating a Global Install</h3>
			<pre>
				<code>{`# Check current version
create-better-openclaw --version

# Update to latest
npm update -g create-better-openclaw

# Or reinstall
npm install -g create-better-openclaw@latest`}</code>
			</pre>

			<h2 id="direct-install">Option 3: Direct Install (OpenClaw on Host)</h2>
			<blockquote>
				<p>
					<strong>Note:</strong> Direct install is currently specific to the OpenClaw framework.
					Other frameworks (CoPaw, NanoClaw, ZeroClaw, etc.) use Docker-only deployment.
				</p>
			</blockquote>
			<p>
				Instead of running OpenClaw inside Docker, you can install it directly on your host machine.
				This is useful if you want more control over the OpenClaw process, need access to local GPU
				drivers, or prefer a lighter Docker footprint (companion services only).
			</p>
			<p>
				During the CLI wizard, select <strong>&quot;Direct install (host)&quot;</strong> when asked
				&quot;How would you like to install OpenClaw itself?&quot;. Or use the
				<code>--openclaw-install direct</code> flag:
			</p>
			<pre>
				<code>{`npx create-better-openclaw my-stack --openclaw-install direct --yes`}</code>
			</pre>
			<p>This generates a stack where:</p>
			<ul>
				<li>
					<code>docker-compose.yml</code> contains only companion services (no{" "}
					<code>openclaw-gateway</code> or <code>openclaw-cli</code>)
				</li>
				<li>
					<code>scripts/install-openclaw.sh</code> runs the official installer:{" "}
					<code>curl -fsSL https://openclaw.ai/install.sh | bash</code>
				</li>
				<li>
					<code>scripts/install-openclaw.ps1</code> handles Windows (via WSL)
				</li>
			</ul>
			<h3>Usage</h3>
			<pre>
				<code>{`cd my-stack
cp .env.example .env

# Install OpenClaw on the host
chmod +x scripts/install-openclaw.sh
./scripts/install-openclaw.sh

# Start companion services in Docker
docker compose up -d

# Run onboarding
openclaw onboard`}</code>
			</pre>

			<h2>Verify Installation</h2>
			<p>Run the following commands to verify everything is set up correctly:</p>
			<pre>
				<code>{`# Check Node.js version (must be 20+)
node --version

# Check Docker is running
docker info

# Check Docker Compose version
docker compose version

# Test the CLI
npx create-better-openclaw --help`}</code>
			</pre>
			<p>
				Expected output from <code>--help</code>:
			</p>
			<pre>
				<code>{`create-better-openclaw <project-name>

Generate a production-ready OpenClaw stack with Docker Compose

Options:
  --preset <name>     Use a preset configuration
  --services <list>   Comma-separated services to include
  --skills <list>     Comma-separated skill packs
  --proxy <type>      Reverse proxy: caddy | traefik | nginx | none
  --domain <name>     Domain name for reverse proxy
  --gpu               Enable GPU passthrough for AI services
  --yes               Skip all prompts (use defaults + flags)
  --output <dir>      Output directory (default: ./<project-name>)
  --dry-run           Show what would be generated without writing
  --version           Show version number
  --help              Show this help message`}</code>
			</pre>

			<h2>Troubleshooting</h2>

			<h3>Node.js Version Too Old</h3>
			<p>If you see errors about unsupported syntax or missing APIs, update Node.js:</p>
			<pre>
				<code>{`# Using nvm (recommended)
nvm install 20
nvm use 20

# Using volta
volta install node@20

# Or download from https://nodejs.org`}</code>
			</pre>

			<h3>Docker Not Running</h3>
			<pre>
				<code>{`# macOS / Windows — start Docker Desktop

# Linux — start the Docker daemon
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to the docker group (avoids sudo)
sudo usermod -aG docker $USER
# Log out and back in for the group change to take effect`}</code>
			</pre>

			<h3>Permission Errors on Linux</h3>
			<p>
				If you get <code>EACCES</code> errors when installing globally:
			</p>
			<pre>
				<code>{`# Fix npm global directory permissions
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Then install again
npm install -g create-better-openclaw`}</code>
			</pre>

			<h3>WSL2 Docker Integration</h3>
			<p>On Windows with WSL2:</p>
			<ol>
				<li>Install Docker Desktop for Windows</li>
				<li>Enable &quot;Use the WSL 2 based engine&quot; in Docker Desktop settings</li>
				<li>Enable your WSL distro under Settings → Resources → WSL Integration</li>
				<li>
					Run <code>docker info</code> inside WSL to verify the connection
				</li>
			</ol>

			<h2>Next Steps</h2>
			<ul>
				<li>
					<Link href="/docs">Quick Start guide</Link> — create your first stack
				</li>
				<li>
					<Link href="/docs/cli">CLI reference</Link> — all flags and options
				</li>
				<li>
					<Link href="/docs/mcp">MCP Server</Link> — let AI agents generate stacks
				</li>
			</ul>
		</>
	);
}
