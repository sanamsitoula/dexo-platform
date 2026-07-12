'use client'

/**
 * Client-side tenant subdomain resolution for tenant-admin.
 *
 * Canonical host pattern (see docs/LOCAL-DEV-URLS.md, docs/azurevm.md):
 *   admin.<tenant>.onedexo.com     (prod)   -> "<tenant>"
 *   admin.<tenant>.localhost:4006  (dev)    -> "<tenant>"
 *   localhost:4006                 (dev, no tenant in host) -> DEV fallback
 *
 * NOTE: this is deliberately "admin" FIRST, tenant SECOND — the opposite of
 * middleware.ts's extractSlug(), which assumes a tenant-first pattern that
 * doesn't match how this app is actually hosted. middleware.ts is currently
 * unused by page components (see its own header comment), so that mismatch
 * is latent, not live — but this resolver must match the real hostname shape
 * since it gates which tenant a login is scoped to.
 */
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'localhost', 'dexo'])

export function resolveTenantAdminSubdomain(): string {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_DEV_TENANT || 'vrfitness'
  const hostname = window.location.hostname.toLowerCase()
  const parts = hostname.split('.')

  // admin.<tenant>.localhost -> ["admin", "<tenant>", "localhost"]
  if (hostname.endsWith('.localhost') && parts.length >= 3 && parts[0] === 'admin' && !RESERVED_SUBDOMAINS.has(parts[1])) {
    return parts[1]
  }
  // admin.<tenant>.<domain>.<tld> -> ["admin", "<tenant>", "<domain>", "<tld>"]
  if (parts.length >= 4 && parts[0] === 'admin' && !RESERVED_SUBDOMAINS.has(parts[1])) {
    return parts[1]
  }
  // <tenant>.localhost (no "admin." prefix, some local setups)
  if (hostname.endsWith('.localhost') && parts.length >= 2 && !RESERVED_SUBDOMAINS.has(parts[0])) {
    return parts[0]
  }

  return process.env.NEXT_PUBLIC_DEV_TENANT || 'vrfitness'
}
