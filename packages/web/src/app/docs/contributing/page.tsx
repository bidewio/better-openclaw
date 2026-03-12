import Link from "next/link";

export const metadata = {
	title: "Contributing — better-openclaw Docs",
	description:
		"How to contribute to better-openclaw. Development setup, code structure, PR guidelines, and adding services or skill packs.",
};

export default function ContributingPage() {
	return (
		<>
			<h1>Contributing</h1>
			<p>
				better-openclaw is open source and welcomes contributions. Whether you&apos;re fixing a bug,
				adding a service, improving docs, or building a new feature — here&apos;s how to get
				started.
			</p>

			<h2>Quick Start for Contributors</h2>
			<pre>
				<code>{`# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/better-openclaw.git
cd better-openclaw

# 3. Install dependencies
pnpm install

# 4. Build all packages
pnpm build

# 5. Run the development server (web)
pnpm --filter web dev

# 6. Run the CLI in dev mode
pnpm --filter cli dev -- test-stack --preset minimal --dry-run`}</code>
			</pre>

			<h2>Project Structure</h2>
			<pre>
				<code>{`better-openclaw/
├── packages/
│   ├── core/              # Shared logic: services, skills, validation
│   │   ├── src/
│   │   │   ├── services/  # Service definitions
│   │   │   ├── skills/    # Skill pack definitions
│   │   │   ├── presets/   # Preset configurations
│   │   │   ├── generator/ # Stack generation engine
│   │   │   └── validator/ # Configuration validation
│   │   └── package.json
│   ├── cli/               # CLI tool (create-better-openclaw)
│   │   ├── src/
│   │   │   ├── wizard/    # Interactive prompts
│   │   │   ├── commands/  # Command handlers
│   │   │   └── index.ts   # Entry point
│   │   └── package.json
│   └── web/               # Next.js website + API
│       ├── src/
│       │   ├── app/       # Next.js App Router pages
│       │   ├── components/# React components
│       │   └── lib/       # Utilities
│       └── package.json
├── pnpm-workspace.yaml
├── package.json
└── turbo.json`}</code>
			</pre>

			<h2>Development Setup</h2>

			<h3>Prerequisites</h3>
			<ul>
				<li>Node.js 22+</li>
				<li>
					pnpm 10+ (<code>corepack enable</code>)
				</li>
				<li>Docker (for testing generated stacks)</li>
			</ul>

			<h3>Running Locally</h3>
			<pre>
				<code>{`# Install all dependencies
pnpm install

# Build the core package (required by CLI and web)
pnpm --filter @better-openclaw/core build

# Start the web dev server
pnpm --filter web dev
# → http://localhost:3000

# Run the CLI
pnpm --filter cli dev -- my-stack --preset researcher --dry-run

# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @better-openclaw/core test

# Lint
pnpm lint

# Type check
pnpm typecheck`}</code>
			</pre>

			<h3>Watch Mode</h3>
			<p>For rapid iteration, run the core package in watch mode while developing:</p>
			<pre>
				<code>{`# Terminal 1: Watch core for changes
pnpm --filter @better-openclaw/core dev

# Terminal 2: Run web dev server (auto-reloads with core changes)
pnpm --filter web dev`}</code>
			</pre>

			<h2>Contribution Types</h2>

			<h3>Adding a New Service</h3>
			<p>
				See the <Link href="/docs/services/adding">Adding Services guide</Link> for the full
				walkthrough. In summary:
			</p>
			<ol>
				<li>
					Create a new file in <code>packages/core/src/services/[category]/</code>
				</li>
				<li>
					Implement the <code>ServiceDefinition</code> interface
				</li>
				<li>Register it in the category index and main service registry</li>
				<li>
					Test with <code>--dry-run</code> and then with <code>docker compose up</code>
				</li>
				<li>Submit a PR</li>
			</ol>

			<h3>Adding a Skill Pack</h3>
			<ol>
				<li>
					Create skill YAML files in <code>packages/core/src/skills/[pack-name]/</code>
				</li>
				<li>
					Create the pack definition in <code>packages/core/src/skills/[pack-name]/index.ts</code>
				</li>
				<li>Register in the skill pack index</li>
				<li>Add required service mappings</li>
				<li>Test with the CLI</li>
			</ol>

			<h3>Bug Fixes</h3>
			<ol>
				<li>
					Check{" "}
					<a
						href="https://github.com/bidewio/better-openclaw/issues"
						target="_blank"
						rel="noopener noreferrer"
					>
						existing issues
					</a>{" "}
					first
				</li>
				<li>Create an issue if one doesn&apos;t exist</li>
				<li>Reference the issue number in your PR</li>
				<li>Add a test case that reproduces the bug</li>
			</ol>

			<h3>Documentation</h3>
			<ul>
				<li>
					Docs pages live in <code>packages/web/src/app/docs/</code>
				</li>
				<li>Each page is a Next.js page component</li>
				<li>Follow the existing patterns (metadata export, semantic HTML, prose classes)</li>
			</ul>

			<h2>Pull Request Guidelines</h2>

			<h3>Before Submitting</h3>
			<ul>
				<li>
					<strong>Run the full test suite:</strong> <code>pnpm test</code>
				</li>
				<li>
					<strong>Check types:</strong> <code>pnpm typecheck</code>
				</li>
				<li>
					<strong>Lint your code:</strong> <code>pnpm lint</code>
				</li>
				<li>
					<strong>Build everything:</strong> <code>pnpm build</code>
				</li>
				<li>
					<strong>Test manually</strong> if you changed generation logic
				</li>
			</ul>

			<h3>PR Format</h3>
			<pre>
				<code>{`## What

Brief description of the change.

## Why

Why this change is needed.

## How

Implementation approach / key decisions.

## Testing

- [ ] Unit tests pass
- [ ] Manual testing done
- [ ] Dry-run output verified
- [ ] Docker compose up works (if applicable)

## Related Issues

Closes #123`}</code>
			</pre>

			<h3>Commit Messages</h3>
			<p>
				Follow{" "}
				<a href="https://www.conventionalcommits.org/" target="_blank" rel="noopener noreferrer">
					Conventional Commits
				</a>
				:
			</p>
			<pre>
				<code>{`feat(core): add Meilisearch service definition
fix(cli): handle missing Docker on wizard start
docs(web): add skill packs reference page
chore: update dependencies`}</code>
			</pre>

			<h3>Code Style</h3>
			<ul>
				<li>TypeScript with strict mode</li>
				<li>Prettier for formatting (runs automatically on commit via lint-staged)</li>
				<li>ESLint for linting</li>
				<li>
					Prefer <code>const</code> over <code>let</code>
				</li>
				<li>Prefer named exports</li>
				<li>Add JSDoc comments for public APIs</li>
			</ul>

			<h2>Development Tips</h2>

			<h3>Testing Service Definitions</h3>
			<pre>
				<code>{`# Quick test: dry-run a stack with your new service
pnpm --filter cli dev -- test-stack \\
  --services your-new-service,redis \\
  --dry-run

# Full test: actually generate and run
pnpm --filter cli dev -- test-stack \\
  --services your-new-service,redis \\
  --yes

cd test-stack
docker compose up -d
docker compose ps
docker compose logs your-new-service`}</code>
			</pre>

			<h3>Debugging the Web App</h3>
			<pre>
				<code>{`# Run in dev mode with verbose logging
DEBUG=* pnpm --filter web dev

# Check the API endpoint locally
curl http://localhost:3000/api/v1/services | jq`}</code>
			</pre>

			<h2>Getting Help</h2>
			<ul>
				<li>
					<a
						href="https://github.com/bidewio/better-openclaw/issues"
						target="_blank"
						rel="noopener noreferrer"
					>
						Open an issue
					</a>{" "}
					for bugs or feature requests
				</li>
				<li>
					<a href="https://discord.gg/better-openclaw" target="_blank" rel="noopener noreferrer">
						Join the Discord
					</a>{" "}
					for discussions and help
				</li>
				<li>
					Check{" "}
					<a
						href="https://github.com/bidewio/better-openclaw/pulls"
						target="_blank"
						rel="noopener noreferrer"
					>
						existing PRs
					</a>{" "}
					for inspiration and patterns
				</li>
			</ul>

			<h2>License</h2>
			<p>
				better-openclaw is MIT licensed. By contributing, you agree that your contributions will be
				licensed under the same MIT License.
			</p>
		</>
	);
}
