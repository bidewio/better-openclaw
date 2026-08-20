import type { SkillPack } from "../types.js";

const skillPacks: SkillPack[] = [
	{
		id: "ai-memory",
		name: "AI Memory",
		description:
			"Long-term AI agent memory with automatic extraction, storage, and retrieval across conversations backed by vector embeddings and knowledge graphs",
		requiredServices: ["mem0", "postgresql", "neo4j"],
		skills: ["mem0-memory"],
		icon: "🧠",
		tags: ["memory", "ai", "knowledge-graph", "embeddings", "long-term-memory"],
	},
	{
		id: "video-creator",
		name: "Video Creator",
		description:
			"Create and process videos programmatically with FFmpeg, Remotion, and MinIO storage",
		requiredServices: ["ffmpeg", "remotion", "minio"],
		skills: ["ffmpeg-process", "remotion-render", "minio-storage"],
		icon: "🎬",
		tags: ["video", "media", "rendering"],
	},
	{
		id: "research-agent",
		name: "Research Agent",
		description: "Research the web, store findings in vector memory, and scrape full pages",
		requiredServices: ["qdrant", "searxng", "browserless"],
		skills: ["qdrant-memory", "searxng-search", "browserless-browse"],
		icon: "🔬",
		tags: ["research", "rag", "web-scraping"],
	},
	{
		id: "social-media",
		name: "Social Media",
		description:
			"Process and manage social media content with video tools, caching, and asset storage",
		requiredServices: ["ffmpeg", "redis", "minio"],
		skills: ["ffmpeg-process", "redis-cache", "minio-storage"],
		icon: "📱",
		tags: ["social", "content", "scheduling"],
	},
	{
		id: "dev-ops",
		name: "DevOps",
		description: "Monitor services, automate workflows, and manage infrastructure alerts",
		requiredServices: ["n8n", "redis", "uptime-kuma", "grafana", "prometheus"],
		skills: [
			"n8n-trigger",
			"redis-cache",
			"grafana-dashboard",
			"prometheus-query",
			"uptime-kuma-monitor",
		],
		icon: "⚙️",
		tags: ["devops", "monitoring", "automation"],
	},
	{
		id: "knowledge-base",
		name: "Knowledge Base",
		description:
			"Index documents with vector search and full-text search for comprehensive retrieval",
		requiredServices: ["qdrant", "postgresql", "meilisearch"],
		skills: ["qdrant-memory", "postgresql-query", "meilisearch-index"],
		icon: "📚",
		tags: ["knowledge", "search", "indexing"],
	},
	{
		id: "local-ai",
		name: "Local AI",
		description: "Run local LLM inference and speech-to-text transcription without external APIs",
		requiredServices: ["ollama", "whisper"],
		skills: ["ollama-local-llm", "whisper-transcribe"],
		icon: "🤖",
		tags: ["local-llm", "transcription", "offline"],
	},
	{
		id: "content-creator",
		name: "Content Creator",
		description:
			"Full social media content pipeline with scheduling, media processing, analytics, and storage",
		requiredServices: ["postiz", "ffmpeg", "minio", "redis", "postgresql"],
		skills: ["ffmpeg-process", "minio-storage", "redis-cache", "postiz-schedule"],
		icon: "📱",
		tags: ["social-media", "content", "scheduling", "analytics"],
	},
	{
		id: "ai-playground",
		name: "AI Playground",
		description:
			"Full AI experimentation stack with chat UIs, LLM gateway, local models, and document chat",
		requiredServices: ["ollama", "open-webui", "litellm"],
		skills: ["ollama-local-llm", "open-webui-chat", "litellm-gateway"],
		icon: "🧪",
		tags: ["ai", "llm", "playground", "experimentation"],
	},
	{
		id: "coding-team",
		name: "Coding Team",
		description:
			"AI-powered development environment with coding agents, Git hosting, and browser IDE",
		requiredServices: ["claude-code", "gitea", "code-server"],
		skills: ["claude-code-assist", "gitea-repo", "code-server-develop"],
		icon: "💻",
		tags: ["coding", "development", "ide", "git"],
	},
	{
		id: "knowledge-hub",
		name: "Knowledge Hub",
		description:
			"Enterprise knowledge management with wiki, document processing, analytics, and vector search",
		requiredServices: ["outline", "paperless-ngx", "qdrant", "postgresql", "redis"],
		skills: [
			"qdrant-memory",
			"outline-wiki",
			"paperless-archive",
			"postgresql-query",
			"redis-cache",
		],
		icon: "📚",
		tags: ["knowledge", "wiki", "documents", "search"],
	},
	// ── New Skill Packs ───────────────────────────────────────────────
	{
		id: "data-engineer",
		name: "Data Engineer",
		description:
			"Process and transform data with PostgreSQL, CSV/JSON/XML transforms, and PDF extraction",
		requiredServices: ["postgresql"],
		skills: [
			"postgresql-query",
			"csv-transform",
			"json-transform",
			"xml-parse",
			"pdf-extract",
			"excel-process",
			"markdown-convert",
		],
		icon: "🔧",
		tags: ["data", "etl", "transform", "processing"],
	},
	{
		id: "nlp-pipeline",
		name: "NLP Pipeline",
		description:
			"Natural language processing with summarization, translation, classification, and embeddings via Ollama",
		requiredServices: ["ollama"],
		skills: ["text-summarize", "text-translate", "text-classify", "text-embed", "ollama-local-llm"],
		icon: "🧠",
		tags: ["nlp", "text", "embeddings", "translation"],
	},
	{
		id: "image-processor",
		name: "Image Processor",
		description: "Resize, convert, and OCR images with ImageMagick and Tesseract",
		requiredServices: ["ffmpeg"],
		skills: ["image-resize", "image-convert", "image-ocr", "ffmpeg-process"],
		icon: "🖼️",
		tags: ["image", "ocr", "media", "conversion"],
	},
	{
		id: "api-integrator",
		name: "API Integrator",
		description: "HTTP requests, webhooks, and GraphQL queries for external API integration",
		requiredServices: [],
		skills: ["http-request", "api-webhook", "graphql-query"],
		icon: "🌐",
		tags: ["api", "http", "webhook", "graphql"],
	},
	{
		id: "security-ops",
		name: "Security Ops",
		description: "JWT validation, hashing, SSL checks, port scanning, and network diagnostics",
		requiredServices: [],
		skills: ["jwt-manage", "hash-generate", "ssl-check", "dns-lookup", "port-scan", "ping-check"],
		icon: "🛡️",
		tags: ["security", "networking", "diagnostics"],
	},
	{
		id: "communication-hub",
		name: "Communication Hub",
		description:
			"Multi-channel messaging with Matrix, Mattermost, Rocket.Chat, email, and push notifications",
		requiredServices: ["matrix-synapse", "gotify"],
		skills: [
			"matrix-message",
			"mattermost-post",
			"rocketchat-send",
			"gotify-notify",
			"ntfy-publish",
			"email-send",
		],
		icon: "📨",
		tags: ["messaging", "notifications", "email", "chat"],
	},
	{
		id: "analytics-suite",
		name: "Analytics Suite",
		description: "Web and product analytics with Matomo, Umami, OpenPanel, Grafana, and Prometheus",
		requiredServices: ["grafana", "prometheus"],
		skills: [
			"matomo-track",
			"umami-analytics",
			"openpanel-analyze",
			"grafana-dashboard",
			"prometheus-query",
		],
		icon: "📊",
		tags: ["analytics", "monitoring", "metrics", "dashboards"],
	},
	{
		id: "full-devops",
		name: "Full DevOps",
		description:
			"Complete DevOps toolkit with Git hosting, container management, deployments, monitoring, and log viewing",
		requiredServices: ["gitea", "portainer", "coolify", "grafana", "prometheus"],
		skills: [
			"gitea-repo",
			"portainer-manage",
			"coolify-deploy",
			"dokploy-deploy",
			"watchtower-update",
			"dozzle-logs",
			"grafana-dashboard",
			"prometheus-query",
			"uptime-kuma-monitor",
			"beszel-monitor",
		],
		icon: "🏗️",
		tags: ["devops", "ci-cd", "containers", "deployment"],
	},
	{
		id: "document-manager",
		name: "Document Manager",
		description: "Document processing pipeline with wiki, archival, OCR, Q&A, and PDF extraction",
		requiredServices: ["outline", "paperless-ngx"],
		skills: ["outline-wiki", "paperless-archive", "docsgpt-ask", "pdf-extract", "image-ocr"],
		icon: "📑",
		tags: ["documents", "wiki", "ocr", "archive"],
	},
	{
		id: "ai-coding-team",
		name: "AI Coding Team",
		description:
			"Multi-agent AI coding ensemble with Claude Code, Codex, Gemini CLI, OpenCode, and browser IDE",
		requiredServices: ["code-server", "gitea"],
		skills: [
			"claude-code-assist",
			"codex-generate",
			"gemini-cli-query",
			"opencode-develop",
			"code-server-develop",
			"gitea-repo",
		],
		icon: "🤖",
		tags: ["ai-coding", "agents", "development", "ide"],
	},
	{
		id: "hermes-research",
		name: "Hermes Research Agent",
		description:
			"Self-improving AI research agent with Hermes, vector search, web crawling, and browser automation",
		requiredServices: ["qdrant", "searxng", "browserless"],
		skills: ["hermes-agent", "qdrant-memory", "searxng-search", "browserless-browse"],
		icon: "☤",
		tags: ["hermes", "research", "agent", "self-improving", "rag"],
	},
	// ── Internet-Verified Skill Packs ────────────────────────────────
	{
		id: "rag-pipeline",
		name: "RAG Pipeline",
		description:
			"Build retrieval-augmented generation systems with LangChain, LlamaIndex, Haystack, and vector databases",
		requiredServices: ["milvus"],
		skills: [
			"langchain-agent",
			"llamaindex-query",
			"haystack-rag",
			"ragflow-pipeline",
			"milvus-vectors",
			"firecrawl-scrape",
		],
		icon: "🧠",
		tags: ["rag", "ai", "embeddings", "search", "llm"],
	},
	{
		id: "self-hosted-cloud",
		name: "Self-Hosted Cloud",
		description:
			"Complete self-hosted infrastructure with cloud storage, photos, media streaming, and password management",
		requiredServices: ["nextcloud", "immich", "jellyfin", "vaultwarden"],
		skills: ["nextcloud-files", "immich-photos", "jellyfin-media", "vaultwarden-manage"],
		icon: "☁️",
		tags: ["self-hosted", "cloud", "storage", "media", "security"],
	},
	{
		id: "ai-agent-orchestra",
		name: "AI Agent Orchestra",
		description:
			"Multi-agent AI orchestration with CrewAI, AutoGPT, LangChain, Langflow, and Open Interpreter",
		requiredServices: [],
		skills: [
			"crewai-orchestrate",
			"autogpt-autonomous",
			"langchain-agent",
			"langflow-build",
			"open-interpreter-run",
		],
		icon: "🎭",
		tags: ["ai", "agents", "multi-agent", "orchestration", "autonomous"],
	},
	{
		id: "cicd-pipeline",
		name: "CI/CD Pipeline",
		description: "Full CI/CD pipeline with Jenkins, ArgoCD, Woodpecker, and infrastructure as code",
		requiredServices: ["jenkins"],
		skills: [
			"jenkins-pipeline",
			"argocd-deploy",
			"woodpecker-ci",
			"terraform-provision",
			"ansible-configure",
		],
		icon: "🔄",
		tags: ["ci-cd", "devops", "gitops", "infrastructure"],
	},
	{
		id: "zero-trust-security",
		name: "Zero-Trust Security",
		description:
			"Enterprise security with SSO, secrets management, VPN, intrusion detection, and feature flags",
		requiredServices: ["authentik", "crowdsec"],
		skills: [
			"authentik-auth",
			"keycloak-auth",
			"vault-secrets",
			"infisical-secrets",
			"netbird-vpn",
			"teleport-access",
			"crowdsec-protect",
		],
		icon: "🔒",
		tags: ["security", "zero-trust", "sso", "secrets", "vpn"],
	},
	{
		id: "content-platform",
		name: "Content Platform",
		description:
			"Publishing and CMS platform with Ghost, Strapi, Directus, and newsletter management",
		requiredServices: ["ghost"],
		skills: [
			"ghost-publish",
			"strapi-cms",
			"directus-cms",
			"listmonk-email",
			"plausible-analytics",
		],
		icon: "📝",
		tags: ["cms", "publishing", "blog", "newsletter", "analytics"],
	},
	{
		id: "backend-platform",
		name: "Backend Platform",
		description: "Backend-as-a-service with Supabase, Appwrite, PocketBase, and API gateway",
		requiredServices: ["supabase"],
		skills: [
			"supabase-query",
			"appwrite-backend",
			"pocketbase-backend",
			"kong-gateway",
			"rabbitmq-queue",
		],
		icon: "⚡",
		tags: ["backend", "baas", "api", "database", "messaging"],
	},
	{
		id: "appwrite-platform",
		name: "Appwrite Platform",
		description: "BaaS with Appwrite for auth, databases, storage, functions, and realtime APIs",
		requiredServices: ["appwrite"],
		skills: ["appwrite-backend", "rabbitmq-queue"],
		icon: "🧱",
		tags: ["backend", "baas", "auth", "storage", "functions"],
	},
	{
		id: "authelia-security",
		name: "Authelia Security",
		description:
			"SSO, MFA, and access control for protecting self-hosted apps behind reverse proxy",
		requiredServices: ["authelia"],
		skills: ["authelia-auth"],
		icon: "🔒",
		tags: ["auth", "sso", "mfa", "access-control", "security"],
	},
	{
		id: "ragflow-platform",
		name: "RAGFlow Platform",
		description:
			"End-to-end RAG platform for knowledge ingestion, indexing, and grounded AI assistants",
		requiredServices: ["ragflow"],
		skills: ["ragflow-pipeline", "firecrawl-scrape"],
		icon: "🧠",
		tags: ["rag", "knowledge", "retrieval", "ai-platform"],
	},
	{
		id: "cms-stack",
		name: "CMS Stack",
		description: "Headless CMS and publishing with Directus, Strapi, Listmonk, and Stirling PDF",
		requiredServices: ["directus"],
		skills: ["strapi-cms", "directus-cms", "listmonk-email", "stirling-pdf-tools"],
		icon: "📝",
		tags: ["cms", "publishing", "newsletter", "documents"],
	},
	{
		id: "observability-stack",
		name: "Observability Stack",
		description:
			"Full observability with Loki logs, SigNoz APM, Sentry errors, Gatus health, and Elasticsearch",
		requiredServices: ["loki", "signoz"],
		skills: [
			"loki-logs",
			"signoz-observe",
			"sentry-errors",
			"gatus-health",
			"elasticsearch-search",
		],
		icon: "📡",
		tags: ["observability", "logs", "apm", "errors", "health"],
	},
	{
		id: "document-hub",
		name: "Document Hub",
		description:
			"Document management with Paperless-ngx, BookStack wiki, Stirling PDF tools, and Excalidraw",
		requiredServices: ["paperless-ngx"],
		skills: ["paperless-ngx-docs", "bookstack-wiki", "stirling-pdf-tools", "excalidraw-draw"],
		icon: "📑",
		tags: ["documents", "wiki", "pdf", "collaboration"],
	},
	{
		id: "smart-home",
		name: "Smart Home",
		description:
			"Home automation and event-driven workflows with Home Assistant, Huginn, and Activepieces",
		requiredServices: ["homeassistant"],
		skills: ["home-assistant-automate", "huginn-automate", "activepieces-flow"],
		icon: "🏠",
		tags: ["iot", "automation", "smart-home", "workflows"],
	},
	// ── Aura Build Frontend Design Skills ────────────────────────────
	{
		id: "frontend-design",
		name: "Frontend Design",
		description:
			"Front-end design skills for UI systems, web animations, responsive layouts, copywriting, and asset management — sourced from Aura Build",
		requiredServices: [],
		skills: [
			"ui-prompting",
			"pricing-page-design",
			"landing-page-design",
			"gsap-animate",
			"threejs-scene",
			"matterjs-physics",
			"globe-gl-visualize",
			"tailwindcss-style",
			"css-border-gradient",
			"progressive-blur",
			"animation-on-scroll",
			"css-alpha-masking",
			"vantajs-background",
			"cobejs-globe",
			"unicorn-studio-embed",
			"ui-design-system",
			"tailwind-design-system-v4",
			"interaction-design",
			"responsive-design",
			"web-interface-guidelines",
			"threejs-animation",
			"copywriting",
			"frontend-distinctive-design",
			"canvas-design",
			"web-design-reviewer",
			"animejs-animate",
			"aura-asset-images",
		],
		icon: "🎨",
		tags: ["frontend", "design", "animation", "css", "ui", "web-design"],
	},
	// ── New Skill Packs (from feature analysis) ──────────────────────
	{
		id: "customer-support",
		name: "Customer Support",
		description:
			"AI-powered helpdesk with live chat, LLM observability, and ticket management across channels",
		requiredServices: ["chatwoot", "langfuse", "postgresql", "redis"],
		skills: ["chatwoot-support", "langfuse-trace", "postgresql-query", "redis-cache"],
		icon: "💬",
		tags: ["support", "chat", "helpdesk", "tickets", "customer-service"],
	},
	{
		id: "sales-pipeline",
		name: "Sales Pipeline",
		description:
			"CRM-driven sales pipeline with email marketing, newsletter management, and lead nurturing",
		requiredServices: ["twenty", "mautic", "listmonk", "postgresql"],
		skills: ["twenty-crm", "mautic-campaign", "listmonk-email", "postgresql-query"],
		icon: "📈",
		tags: ["sales", "crm", "email", "leads", "marketing"],
	},
	{
		id: "data-pipeline",
		name: "Data Pipeline",
		description:
			"End-to-end data pipeline with DAG orchestration, 300+ source connectors, and monitoring dashboards",
		requiredServices: ["airflow", "airbyte", "postgresql", "grafana"],
		skills: ["airflow-dag", "airbyte-sync", "postgresql-query", "grafana-dashboard"],
		icon: "🔄",
		tags: ["data", "etl", "pipeline", "orchestration", "connectors"],
	},
	{
		id: "voice-agent",
		name: "Voice Agent",
		description:
			"AI-powered voice agent with programmable telephony, speech-to-text transcription, and real-time communication",
		requiredServices: ["fonoster", "whisper", "livekit", "redis"],
		skills: ["fonoster-voice", "whisper-transcribe", "livekit-stream", "redis-cache"],
		icon: "📞",
		tags: ["voice", "telephony", "transcription", "speech", "phone"],
	},
	{
		id: "ecommerce-ops",
		name: "E-Commerce Ops",
		description:
			"AI-managed online store with headless commerce, product management, and object storage for media",
		requiredServices: ["medusa", "minio", "postgresql", "redis"],
		skills: ["medusa-commerce", "minio-storage", "postgresql-query", "redis-cache"],
		icon: "🛒",
		tags: ["ecommerce", "store", "products", "orders", "commerce"],
	},
	{
		id: "infra-security",
		name: "Infra Security",
		description:
			"Infrastructure security with intrusion detection, encrypted secret management, and uptime monitoring",
		requiredServices: ["crowdsec", "infisical", "uptime-kuma"],
		skills: ["crowdsec-protect", "infisical-secrets", "uptime-kuma-monitor"],
		icon: "🛡️",
		tags: ["security", "secrets", "monitoring", "intrusion-detection"],
	},
	{
		id: "fine-tuning-lab",
		name: "Fine-Tuning Lab",
		description:
			"Custom LLM fine-tuning pipeline with LoRA/QLoRA support, local model inference, and dataset storage",
		requiredServices: ["axolotl", "ollama", "minio", "postgresql"],
		skills: ["axolotl-finetune", "ollama-local-llm", "minio-storage", "postgresql-query"],
		icon: "🎯",
		tags: ["fine-tuning", "llm", "training", "lora", "models"],
	},
	{
		id: "marketing-suite",
		name: "Marketing Suite",
		description:
			"Full marketing stack with blogging, email automation, newsletter management, and web analytics",
		requiredServices: ["ghost", "mautic", "listmonk", "umami"],
		skills: ["ghost-publish", "mautic-campaign", "listmonk-email", "umami-analytics"],
		icon: "📣",
		tags: ["marketing", "blog", "email", "analytics", "content"],
	},
];

const packMap = new Map<string, SkillPack>();
for (const pack of skillPacks) {
	if (packMap.has(pack.id)) {
		throw new Error(`Duplicate skill pack ID: "${pack.id}"`);
	}
	packMap.set(pack.id, pack);
}

export const skillPackRegistry: ReadonlyMap<string, SkillPack> = packMap;

export function getSkillPackById(id: string): SkillPack | undefined {
	return packMap.get(id);
}

export function getAllSkillPacks(): SkillPack[] {
	return [...skillPacks];
}

/** Get skill packs whose required services are all present in the given service list */
export function getCompatibleSkillPacks(availableServiceIds: string[]): SkillPack[] {
	return skillPacks.filter((pack) =>
		pack.requiredServices.every((req) => availableServiceIds.includes(req)),
	);
}
