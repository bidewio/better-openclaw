import type { ResolverOutput } from "../types.js";

/**
 * Generates a Caddyfile with reverse proxy entries for each exposed service.
 *
 * Each service with exposed ports gets a subdomain route under the provided domain.
 * Services without exposed ports are skipped.
 *
 * @param resolved - The resolved service configuration
 * @param domain - The main domain for routing (e.g. "example.com")
 * @returns The Caddyfile content as a string
 */
export function generateCaddyfile(resolved: ResolverOutput, domain: string): string {
	const sections: string[] = [];

	// ── Global Options ──────────────────────────────────────────────────────

	sections.push(`# ═══════════════════════════════════════════════════════════════════════════════
# OpenClaw Caddyfile — Auto-generated reverse proxy configuration
# Domain: ${domain}
# ═══════════════════════════════════════════════════════════════════════════════

{
	# Global options
	email admin@${domain}
	acme_ca https://acme-v02.api.letsencrypt.org/directory
}
`);

	// ── Per-Service Reverse Proxy Blocks ─────────────────────────────────────

	for (const { definition } of resolved.services) {
		// Skip the proxy service itself
		if (definition.id === "caddy" || definition.id === "traefik") continue;

		const exposedPorts = definition.ports.filter((p) => p.exposed);
		if (exposedPorts.length === 0) continue;

		// Use the first exposed port as the primary route target
		const [primaryPort] = exposedPorts;
		if (!primaryPort) continue;
		const subdomain = `${definition.id}.${domain}`;

		const block = [
			`# ${definition.icon} ${definition.name}`,
			`# ${definition.description}`,
			`${subdomain} {`,
			`	reverse_proxy ${definition.id}:${primaryPort.container} {`,
			`		header_up Host {host}`,
			`		header_up X-Real-IP {remote_host}`,
			`		header_up X-Forwarded-For {remote_host}`,
			`		header_up X-Forwarded-Proto {scheme}`,
			`	}`,
		];

		// Add health check if service has one
		if (definition.healthcheck) {
			block.push("");
			block.push(`	# Health check`);
			block.push(`	handle /health {`);
			block.push(`		reverse_proxy ${definition.id}:${primaryPort.container}`);
			block.push(`	}`);
		}

		block.push(`}`);
		block.push("");

		// If there are additional exposed ports, add them as separate entries
		for (let i = 1; i < exposedPorts.length; i++) {
			const port = exposedPorts[i];
			if (!port) continue;
			const portSubdomain = `${definition.id}-${port.description
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/-+$/, "")}.${domain}`;

			block.push(`# ${definition.name} — ${port.description}`);
			block.push(`${portSubdomain} {`);
			block.push(`	reverse_proxy ${definition.id}:${port.container}`);
			block.push(`}`);
			block.push("");
		}

		sections.push(block.join("\n"));
	}

	// ── Fallback / Root Domain ──────────────────────────────────────────────

	sections.push(`# Root domain — serves the OpenClaw gateway
${domain} {
	reverse_proxy openclaw:18789 {
		header_up Host {host}
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
	}
}
`);

	return sections.join("\n");
}
