import { post as post42 } from "./posts/addon-stack-generation-hosting-guide";
import { post as post24 } from "./posts/ai-agent-memory-redis-persistent-context";
import { post as post41 } from "./posts/ai-powerhouse-self-hosted-manus-alternative";
import { post as post5 } from "./posts/ai-skill-packs-explained";
import { post as post33 } from "./posts/authentik-vs-keycloak-identity-management";
import { post as post15 } from "./posts/backing-up-docker-volumes-guide";
import { post as post23 } from "./posts/browser-automation-playwright-browserless";
import { post as post32 } from "./posts/building-ai-coding-assistant-continue-dev";
import { post as post43 } from "./posts/building-service-marketplace-skills-addons";
import { post as post12 } from "./posts/building-personal-ai-assistant-2026";
import { post as post16 } from "./posts/caddy-vs-traefik-homelab-reverse-proxy";
import { post as post20 } from "./posts/cicd-docker-compose-automated-deployments";
import { post as post35 } from "./posts/cloudflare-tunnels-vs-wireguard-remote-access";
import { post as post22 } from "./posts/deploy-better-openclaw-vps-production";
import { post as post9 } from "./posts/docker-compose-best-practices-multi-service";
import { post as post31 } from "./posts/docker-swarm-vs-kubernetes-homelab";
import { post as post25 } from "./posts/future-self-hosted-ai-trends-2026";
import { post as post30 } from "./posts/grafana-vs-signoz-monitoring";
import { post as post40 } from "./posts/home-assistant-open-source-iot-automation";
import { post as post3 } from "./posts/homelab-ai-stacks-2026-guide";
import { post as post39 } from "./posts/jellyfin-vs-plex-media-server-homelab";
import { post as post19 } from "./posts/knowledge-base-outline-meilisearch";
import { post as post21 } from "./posts/librechat-open-webui-self-hosted-chatgpt";
import { post as post34 } from "./posts/minio-s3-compatible-storage-self-hosted";
import { post as post10 } from "./posts/monitoring-ai-stack-grafana-prometheus";
import { post as post6 } from "./posts/n8n-ai-workflow-automation";
import { post as post27 } from "./posts/n8n-vs-temporal-workflow-automation";
import { post as post38 } from "./posts/nextcloud-vs-owncloud-data-sovereignty";
import { post as post29 } from "./posts/ollama-vs-litellm-local-ai-inference";
import { post as post37 } from "./posts/open-source-erp-erpnext-odoo-comparison";
import { post as post13 } from "./posts/open-source-llm-models-comparison";
import { post as post2 } from "./posts/openclaw-vs-manual-docker-setup";
import { post as post26 } from "./posts/postgresql-vs-supabase-self-hosted";
import { post as post8 } from "./posts/private-rag-pipeline-qdrant-searxng";
import { post as post11 } from "./posts/proxmox-vs-truenas-homelab-os";
import { post as post28 } from "./posts/redis-vs-valkey-caching-comparison";
import { post as post4 } from "./posts/running-ollama-locally-guide";
import { post as post18 } from "./posts/secure-self-hosted-ai-infrastructure";
import { post as post1 } from "./posts/self-host-ai-agents-docker-compose";
import { post as post36 } from "./posts/self-hosting-email-mailcow-postfix";
import { post as post7 } from "./posts/self-hosting-vs-cloud-ai-costs";
import { post as post14 } from "./posts/setting-up-tailscale-homelab-vpn";
import { post as post17 } from "./posts/vector-databases-qdrant-milvus-chromadb";
import type { BlogCategory, BlogPost } from "./types";

export const blogPosts: BlogPost[] = [
	post1,
	post2,
	post3,
	post4,
	post5,
	post6,
	post7,
	post8,
	post9,
	post10,
	post11,
	post12,
	post13,
	post14,
	post15,
	post16,
	post17,
	post18,
	post19,
	post20,
	post21,
	post22,
	post23,
	post24,
	post25,
	post26,
	post27,
	post28,
	post29,
	post30,
	post31,
	post32,
	post33,
	post34,
	post35,
	post36,
	post37,
	post38,
	post39,
	post40,
	post41,
	post42,
	post43,
];

// Helper functions for accessing posts
export function getPostBySlug(slug: string): BlogPost | undefined {
	return blogPosts.find((post) => post.slug === slug);
}

export function getPostsByCategory(category: BlogCategory): BlogPost[] {
	return blogPosts.filter((post) => post.category === category);
}

export function getAllTags(): string[] {
	const tags = new Set<string>();
	for (const post of blogPosts) {
		for (const tag of post.tags) {
			tags.add(tag);
		}
	}
	return Array.from(tags).sort();
}

export function getPostsByTag(tag: string): BlogPost[] {
	return blogPosts.filter((post) => post.tags.includes(tag));
}
