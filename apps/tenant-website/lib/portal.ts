/**
 * Canonical member-portal (tenant-app) URL builder.
 *
 * Production: https://<tenant>.onedexo.com/portal   (nginx /portal path route)
 * Dev:        http://<tenant>.localhost:4007/portal (browsers resolve *.localhost)
 *
 * Override with NEXT_PUBLIC_TENANT_APP_URL (must contain the {slug} placeholder),
 * e.g. NEXT_PUBLIC_TENANT_APP_URL=https://{slug}.onedexo.com/portal
 */
export function memberPortalUrl(slug: string): string {
  const template = process.env.NEXT_PUBLIC_TENANT_APP_URL || 'http://{slug}.localhost:4007/portal';
  return template.replace('{slug}', slug);
}
