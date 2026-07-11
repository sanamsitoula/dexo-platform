/**
 * Canonical member-portal (tenant-app) URL builder.
 *
 * Production: https://portal.<tenant>.onedexo.com   (nginx portal.* wildcard)
 * Dev:        http://portal.<tenant>.localhost:4007 (browsers resolve *.localhost)
 *
 * Override with NEXT_PUBLIC_TENANT_APP_URL (must contain the {slug} placeholder),
 * e.g. NEXT_PUBLIC_TENANT_APP_URL=https://portal.{slug}.onedexo.com
 */
export function memberPortalUrl(slug: string): string {
  const template = process.env.NEXT_PUBLIC_TENANT_APP_URL || 'http://portal.{slug}.localhost:4007';
  return template.replace('{slug}', slug);
}
