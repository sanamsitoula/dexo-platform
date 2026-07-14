'use client'

/**
 * Client-side tenant subdomain resolution — same logic as app/register/page.tsx
 * (reads the `dexo_tenant` cookie stamped by middleware.ts, falls back to
 * parsing window.location.hostname). Shared here so new ecommerce client
 * components don't each re-implement it.
 */
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'localhost', 'dexo'])

export function resolveClientSubdomain(): string {
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)dexo_tenant=([^;]+)/)
    if (m) return decodeURIComponent(m[1])
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase()
    const parts = hostname.split('.')
    if (hostname.endsWith('.localhost') && parts.length >= 2 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return parts[0]
    }
    if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return parts[0]
    }
  }
  return process.env.NEXT_PUBLIC_DEV_TENANT || ''
}
