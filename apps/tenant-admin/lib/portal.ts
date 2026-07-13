/**
 * Canonical member-portal (tenant-app) URL builder — mirrors
 * apps/tenant-website/lib/portal.ts so both apps hand off to the same place.
 *
 * Production: https://portal.<tenant>.onedexo.com
 * Dev:        http://portal.<tenant>.localhost:4007
 *
 * Override with NEXT_PUBLIC_TENANT_APP_URL (must contain the {slug} placeholder).
 */
export function memberPortalUrl(slug: string): string {
  const template = process.env.NEXT_PUBLIC_TENANT_APP_URL || 'http://portal.{slug}.localhost:4007';
  return template.replace('{slug}', slug);
}

/**
 * Canonical tenant public-website (tenant-website) URL builder — same
 * {slug}-template pattern as memberPortalUrl above.
 *
 * Production: https://<tenant>.onedexo.com
 * Dev:        http://<tenant>.localhost:4005
 *
 * Override with NEXT_PUBLIC_TENANT_WEBSITE_URL (must contain the {slug} placeholder).
 */
export function tenantWebsiteUrl(slug: string): string {
  const template = process.env.NEXT_PUBLIC_TENANT_WEBSITE_URL || 'http://{slug}.localhost:4005';
  return template.replace('{slug}', slug);
}
