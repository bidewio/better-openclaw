import type { ResolverOutput } from "../types.js";

/**
 * Database requirement descriptor for a service.
 */
interface DbRequirement {
	serviceId: string;
	serviceName: string;
	dbName: string;
	dbUser: string;
	passwordEnvVar: string;
}

/**
 * Known database requirements for services that need their own PostgreSQL database.
 * Maps service ID to the DB name, user, and password env var they expect.
 */
const DB_REQUIREMENTS: Record<string, Omit<DbRequirement, "serviceId" | "serviceName">> = {
	n8n: { dbName: "n8n", dbUser: "n8n", passwordEnvVar: "N8N_DB_PASSWORD" },
	postiz: { dbName: "postiz", dbUser: "postiz", passwordEnvVar: "POSTIZ_DB_PASSWORD" },
	outline: { dbName: "outline", dbUser: "outline", passwordEnvVar: "OUTLINE_DB_PASSWORD" },
	dify: { dbName: "dify", dbUser: "dify", passwordEnvVar: "DIFY_DB_PASSWORD" },
	temporal: { dbName: "temporal", dbUser: "temporal", passwordEnvVar: "TEMPORAL_DB_PASSWORD" },
	mattermost: {
		dbName: "mattermost",
		dbUser: "mattermost",
		passwordEnvVar: "MATTERMOST_DB_PASSWORD",
	},
	"matrix-synapse": { dbName: "synapse", dbUser: "synapse", passwordEnvVar: "SYNAPSE_DB_PASSWORD" },
	"paperless-ngx": {
		dbName: "paperless",
		dbUser: "paperless",
		passwordEnvVar: "PAPERLESS_DB_PASSWORD",
	},
	umami: { dbName: "umami", dbUser: "umami", passwordEnvVar: "UMAMI_DB_PASSWORD" },
	matomo: { dbName: "matomo", dbUser: "matomo", passwordEnvVar: "MATOMO_DB_PASSWORD" },
	mixpost: { dbName: "mixpost", dbUser: "mixpost", passwordEnvVar: "MIXPOST_DB_PASSWORD" },
	"cal-com": { dbName: "calcom", dbUser: "calcom", passwordEnvVar: "CALCOM_DB_PASSWORD" },
	immich: { dbName: "immich", dbUser: "immich", passwordEnvVar: "IMMICH_DB_PASSWORD" },
	authentik: { dbName: "authentik", dbUser: "authentik", passwordEnvVar: "AUTHENTIK_DB_PASSWORD" },
	chatwoot: { dbName: "chatwoot", dbUser: "chatwoot", passwordEnvVar: "CHATWOOT_DB_PASSWORD" },
	firecrawl: { dbName: "firecrawl", dbUser: "firecrawl", passwordEnvVar: "FIRECRAWL_DB_PASSWORD" },
	flagsmith: { dbName: "flagsmith", dbUser: "flagsmith", passwordEnvVar: "FLAGSMITH_DB_PASSWORD" },
	infisical: { dbName: "infisical", dbUser: "infisical", passwordEnvVar: "INFISICAL_DB_PASSWORD" },
	keycloak: { dbName: "keycloak", dbUser: "keycloak", passwordEnvVar: "KEYCLOAK_DB_PASSWORD" },
	listmonk: { dbName: "listmonk", dbUser: "listmonk", passwordEnvVar: "LISTMONK_DB_PASSWORD" },
	"lasuite-meet-backend": {
		dbName: "meet",
		dbUser: "meet",
		passwordEnvVar: "LASUITE_MEET_DB_PASSWORD",
	},
	openpanel: { dbName: "openpanel", dbUser: "openpanel", passwordEnvVar: "OPENPANEL_DB_PASSWORD" },
	usesend: { dbName: "usesend", dbUser: "usesend", passwordEnvVar: "USESEND_DB_PASSWORD" },
	nextcloud: { dbName: "nextcloud", dbUser: "nextcloud", passwordEnvVar: "NEXTCLOUD_DB_PASSWORD" },
	// ── CRM ────────────────────────────────────────────────────────────────
	twenty: { dbName: "twenty", dbUser: "twenty", passwordEnvVar: "TWENTY_DB_PASSWORD" },
	relaticle: {
		dbName: "relaticle",
		dbUser: "relaticle",
		passwordEnvVar: "RELATICLE_DB_PASSWORD",
	},
	// ── Agent Memory ────────────────────────────────────────────────────────
	hindsight: { dbName: "hindsight", dbUser: "hindsight", passwordEnvVar: "HINDSIGHT_DB_PASSWORD" },
	// ── SaaS Boilerplates ────────────────────────────────────────────────────
	"open-saas": { dbName: "opensaas", dbUser: "opensaas", passwordEnvVar: "OPENSAAS_DB_PASSWORD" },
	"apptension-saas": {
		dbName: "apptensionsaas",
		dbUser: "apptensionsaas",
		passwordEnvVar: "APPTENSION_SAAS_DB_PASSWORD",
	},
	"boxyhq-saas": {
		dbName: "boxyhqsaas",
		dbUser: "boxyhqsaas",
		passwordEnvVar: "BOXYHQ_SAAS_DB_PASSWORD",
	},
	"ixartz-saas": {
		dbName: "ixartzsaas",
		dbUser: "ixartzsaas",
		passwordEnvVar: "IXARTZ_SAAS_DB_PASSWORD",
	},
};

/**
 * Get the list of database requirements for all resolved services.
 * Exported so other generators (env, composer) can access the same data.
 */
export function getDbRequirements(resolved: ResolverOutput): DbRequirement[] {
	const reqs: DbRequirement[] = [];
	for (const { definition } of resolved.services) {
		const req = DB_REQUIREMENTS[definition.id];
		if (req) {
			reqs.push({
				serviceId: definition.id,
				serviceName: definition.name,
				...req,
			});
		}
	}
	return reqs;
}

/**
 * Generates a PostgreSQL initialization script that creates databases and users
 * for all companion services that need their own DB.
 *
 * Returns null if PostgreSQL is not in the resolved stack or no services need extra DBs.
 * The script is designed to be mounted at /docker-entrypoint-initdb.d/init-databases.sh
 * and runs automatically during PostgreSQL's first initialization.
 */
export function generatePostgresInit(resolved: ResolverOutput): string | null {
	const hasPostgres = resolved.services.some((s) => s.definition.id === "postgresql");
	if (!hasPostgres) return null;

	const reqs = getDbRequirements(resolved);
	if (reqs.length === 0) return null;

	const createCalls = reqs
		.map(
			(r) =>
				`create_db_and_user "${r.dbName}" "${r.dbUser}" "\${${r.passwordEnvVar}:-$POSTGRES_PASSWORD}"`,
		)
		.join("\n");

	return `#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════════════════════
# PostgreSQL Initialization Script
# Generated by better-openclaw
#
# This script runs automatically during PostgreSQL's first initialization.
# It creates databases and users for all companion services in your stack.
# ═══════════════════════════════════════════════════════════════════════════════

create_db_and_user() {
  local db="$1"
  local user="$2"
  local password="$3"

  echo ">>> Creating database '$db' with user '$user'..."

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create user if not exists
    DO \\$\\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$user') THEN
        CREATE ROLE "$user" WITH LOGIN PASSWORD '$password';
        RAISE NOTICE 'Created user: $user';
      ELSE
        -- Update password in case it changed
        ALTER ROLE "$user" WITH PASSWORD '$password';
        RAISE NOTICE 'User already exists, updated password: $user';
      END IF;
    END
    \\$\\$;

    -- Create database if not exists
    SELECT 'CREATE DATABASE "$db" OWNER "$user"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\\gexec

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE "$db" TO "$user";
EOSQL

  echo ">>> Done: database '$db' with user '$user'"
}

echo "═══════════════════════════════════════════════════════════"
echo " Initializing databases for companion services..."
echo "═══════════════════════════════════════════════════════════"

${createCalls}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " All databases initialized successfully!"
echo " Services: ${reqs.map((r) => r.serviceName).join(", ")}"
echo "═══════════════════════════════════════════════════════════"
`;
}
