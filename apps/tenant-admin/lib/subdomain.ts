'use client'

/**
 * Client-side tenant subdomain resolution for tenant-admin.
 *
 * Path-based routing (see docs/LOCAL-DEV-URLS.md): this app is always
 * reached at <tenant>.onedexo.com/admin (basePath '/admin'), never at an
 * admin.<tenant>. subdomain, so the tenant is just the host's first label —
 * identical shape to tenant-website/tenant-app's resolvers.
 *
 *   <tenant>.onedexo.com     (prod)   -> "<tenant>"
 *   <tenant>.localhost:4006  (dev)    -> "<tenant>"
 *   localhost:4006           (dev, no tenant in host) -> DEV fallback
 */
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'portal', 'localhost', 'dexo'])

export function resolveTenantAdminSubdomain(): string {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_DEV_TENANT || ''
  const hostname = window.location.hostname.toLowerCase()
  const parts = hostname.split('.')

  // <tenant>.localhost -> ["<tenant>", "localhost"]
  if (hostname.endsWith('.localhost') && parts.length >= 2 && !RESERVED_SUBDOMAINS.has(parts[0])) {
    return parts[0]
  }
  // <tenant>.<domain>.<tld> -> ["<tenant>", "<domain>", "<tld>"]
  if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) {
    return parts[0]
  }

  return process.env.NEXT_PUBLIC_DEV_TENANT || ''
}
