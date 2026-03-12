/**
 * Cloud feature flag.
 *
 * Set `NEXT_PUBLIC_CLOUD_ENABLED=true` in your environment to enable
 * Clawexa Cloud links and deploy-to-cloud features.
 * When unset or any other value, all cloud entry-points show a "Coming Soon" modal.
 */
export const CLOUD_ENABLED = process.env.NEXT_PUBLIC_CLOUD_ENABLED === "true";
