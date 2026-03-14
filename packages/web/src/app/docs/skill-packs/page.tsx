import Link from "next/link";

export const metadata = {
	title: "Skill Packs — better-openclaw Docs",
	description:
		"Complete reference for all 10 better-openclaw skill packs. Each pack's description, required services, and included skills.",
};

const skillPacks = [
	{
		id: "researcher",
		name: "Researcher",
		description:
			"Web search, content extraction, and citation skills for knowledge gathering and RAG pipelines.",
		requiredServices: ["searxng", "browserless"],
		optionalServices: ["qdrant"],
		skills: [
			{ name: "web-search", desc: "Query SearXNG for web search results" },
			{ name: "content-extract", desc: "Extract clean text from web pages via Browserless" },
			{ name: "citation-builder", desc: "Generate formatted citations from URLs" },
			{ name: "fact-check", desc: "Cross-reference claims against multiple sources" },
		],
	},
	{
		id: "memory",
		name: "Memory",
		description:
			"Long-term memory with vector storage for conversation persistence and knowledge retrieval.",
		requiredServices: ["qdrant"],
		optionalServices: ["redis"],
		skills: [
			{ name: "memory-store", desc: "Store conversation context as vector embeddings" },
			{ name: "memory-recall", desc: "Retrieve relevant memories by semantic similarity" },
			{ name: "memory-summarize", desc: "Compress old memories into summaries" },
		],
	},
	{
		id: "automation",
		name: "Automation",
		description: "Workflow automation with n8n, scheduled tasks, and webhook-triggered actions.",
		requiredServices: ["n8n"],
		optionalServices: ["redis", "postgres"],
		skills: [
			{ name: "workflow-trigger", desc: "Trigger n8n workflows from OpenClaw" },
			{ name: "schedule-task", desc: "Schedule recurring tasks via cron" },
			{ name: "webhook-handler", desc: "Register and handle incoming webhooks" },
			{ name: "email-send", desc: "Send emails via n8n email node" },
		],
	},
	{
		id: "local-ai",
		name: "Local AI",
		description: "Run LLMs locally with Ollama. Fully air-gapped, no cloud APIs required.",
		requiredServices: ["ollama"],
		optionalServices: ["redis"],
		skills: [
			{ name: "local-chat", desc: "Chat with locally-running LLMs via Ollama" },
			{ name: "local-embed", desc: "Generate embeddings with local models" },
			{ name: "model-manage", desc: "Pull, list, and manage Ollama models" },
		],
	},
	{
		id: "code",
		name: "Code Execution",
		description: "Sandboxed code execution for Python, JavaScript, and shell scripts.",
		requiredServices: ["code-sandbox"],
		optionalServices: [],
		skills: [
			{ name: "code-run", desc: "Execute code in an isolated sandbox" },
			{ name: "code-install", desc: "Install packages in the sandbox" },
			{ name: "code-file", desc: "Read/write files in the sandbox filesystem" },
		],
	},
	{
		id: "monitoring",
		name: "Monitoring",
		description: "System monitoring with Prometheus, Grafana dashboards, and alerting.",
		requiredServices: ["prometheus", "grafana"],
		optionalServices: ["alertmanager"],
		skills: [
			{ name: "metrics-query", desc: "Query Prometheus metrics via PromQL" },
			{ name: "dashboard-create", desc: "Generate Grafana dashboards" },
			{ name: "alert-config", desc: "Configure alerting rules" },
		],
	},
	{
		id: "voice",
		name: "Voice",
		description:
			"Speech-to-text and text-to-speech using Whisper and other audio processing services.",
		requiredServices: ["whisper"],
		optionalServices: ["piper-tts"],
		skills: [
			{ name: "transcribe", desc: "Transcribe audio files to text with Whisper" },
			{ name: "voice-synth", desc: "Generate speech from text (if Piper TTS enabled)" },
			{ name: "audio-process", desc: "Process audio files (trim, convert, split)" },
		],
	},
	{
		id: "data",
		name: "Data Pipeline",
		description: "Data ingestion, transformation, and loading from various sources.",
		requiredServices: ["postgres"],
		optionalServices: ["redis", "minio"],
		skills: [
			{ name: "csv-import", desc: "Import CSV files into Postgres" },
			{ name: "api-ingest", desc: "Ingest data from external REST APIs" },
			{ name: "data-transform", desc: "SQL-based data transformations" },
			{ name: "export", desc: "Export query results to CSV/JSON" },
		],
	},
	{
		id: "security",
		name: "Security",
		description: "Secret management, vulnerability scanning, and access control.",
		requiredServices: ["vault"],
		optionalServices: ["keycloak"],
		skills: [
			{ name: "secret-read", desc: "Read secrets from HashiCorp Vault" },
			{ name: "secret-write", desc: "Store secrets in Vault" },
			{ name: "cert-manage", desc: "Manage TLS certificates" },
		],
	},
	{
		id: "communication",
		name: "Communication",
		description: "Chat, notifications, and messaging integrations for team communication.",
		requiredServices: ["ntfy"],
		optionalServices: ["gotify", "apprise"],
		skills: [
			{ name: "notify-push", desc: "Send push notifications via ntfy" },
			{ name: "notify-email", desc: "Send email notifications" },
			{ name: "notify-webhook", desc: "Send webhook notifications to Slack/Discord/Teams" },
		],
	},
];

export default function SkillPacksPage() {
	return (
		<>
			<h1>Skill Packs</h1>
			<p>
				Skill packs are curated bundles of agent skills that work together with specific
				companion services. Each pack provides a coherent set of capabilities for a particular use
				case. There are currently <strong>10 skill packs</strong> available. Skill packs work across
				all 8 supported agent frameworks.
			</p>

			<h2>How Skill Packs Work</h2>
			<p>When you select a skill pack during stack generation, the CLI:</p>
			<ol>
				<li>Ensures all required services are included in your stack</li>
				<li>
					Copies the skill YAML files into <code>configs/openclaw/skills/</code>
				</li>
				<li>Configures environment variables to connect skills to services</li>
				<li>Adds the skills to the OpenClaw gateway configuration</li>
			</ol>

			<h2>Using Skill Packs</h2>
			<pre>
				<code>{`# Via CLI flags
npx create-better-openclaw my-stack --skills researcher,memory --yes

# Via the interactive wizard — select during step 4
npx create-better-openclaw my-stack

# Via the API
curl -X POST https://better-openclaw.dev/api/v1/generate \\
  -H "Authorization: Bearer $OPENCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-stack", "skills": ["researcher", "memory"]}'`}</code>
			</pre>

			<hr />

			{skillPacks.map((pack) => (
				<div key={pack.id}>
					<h2 id={pack.id}>
						{pack.name} <code>{pack.id}</code>
					</h2>
					<p>{pack.description}</p>

					<h3>Required Services</h3>
					<ul>
						{pack.requiredServices.map((svc) => (
							<li key={svc}>
								<code>{svc}</code>
							</li>
						))}
					</ul>

					{pack.optionalServices.length > 0 && (
						<>
							<h3>Optional Services</h3>
							<ul>
								{pack.optionalServices.map((svc) => (
									<li key={svc}>
										<code>{svc}</code>
									</li>
								))}
							</ul>
						</>
					)}

					<h3>Included Skills</h3>
					<table>
						<thead>
							<tr>
								<th>Skill</th>
								<th>Description</th>
							</tr>
						</thead>
						<tbody>
							{pack.skills.map((skill) => (
								<tr key={skill.name}>
									<td>
										<code>{skill.name}</code>
									</td>
									<td>{skill.desc}</td>
								</tr>
							))}
						</tbody>
					</table>

					<hr />
				</div>
			))}

			<h2>Combining Skill Packs</h2>
			<p>
				You can select multiple skill packs. The CLI automatically deduplicates shared services:
			</p>
			<pre>
				<code>{`# Researcher + Memory + Automation
npx create-better-openclaw my-stack \\
  --skills researcher,memory,automation \\
  --yes

# This resolves to services:
# searxng, browserless, qdrant, redis, n8n`}</code>
			</pre>

			<h2>Next Steps</h2>
			<ul>
				<li>
					<Link href="/docs/services">Service Catalog</Link> — browse all available services
				</li>
				<li>
					<Link href="/docs/services/adding">Adding Services</Link> — create custom service
					definitions
				</li>
				<li>
					<Link href="/docs/cli">CLI Reference</Link> — use <code>--skills</code> flag
				</li>
			</ul>
		</>
	);
}
