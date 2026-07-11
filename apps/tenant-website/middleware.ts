import { NextRequest, NextResponse } from 'next/server';

/**
 * Host-based tenant resolution.
 *
 * Maps the request Host header to a tenant subdomain and exposes it to every
 * server component via the `x-tenant-slug` request header. This is what makes a
 * SINGLE running instance serve unlimited tenants (multi-tenant SaaS) instead of
 * being pinned to one business.
 *
 * Supported host shapes:
 *   vrfitness.onedexo.com          (prod)   -> "vrfitness"
 *   ramgym.onedexo.com             (prod)   -> "ramgym"
 *   vrfitness.localhost:4005    (dev)    -> "vrfitness"
 *   localhost:4005              (dev)    -> DEV_TENANT env or "vrfitness"
 *
 * To test multiple tenants locally, no /etc/hosts edits are needed — modern
 * browsers resolve any `*.localhost` to 127.0.0.1 automatically. Just open
 * http://vrfitness.localhost:4005 or http://spicegarden.localhost:4005.
 */

// Subdomains that are never a tenant slug.
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'localhost', 'dexo']);

// Tunnel hosts (ngrok, cloudflared, localtunnel) have random first labels that
// must NOT be treated as tenant subdomains. On these hosts the tenant comes
// from ?tenant=<slug>, the dexo_tenant cookie, or DEV_TENANT.
const TUNNEL_SUFFIXES = ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io', '.ngrok.dev', '.trycloudflare.com', '.loca.lt'];
const isTunnelHost = (hostname: string) => TUNNEL_SUFFIXES.some((s) => hostname.endsWith(s));

function extractSlug(host: string): string | null {
  const hostname = (host || '').split(':')[0].toLowerCase();
  if (!hostname || isTunnelHost(hostname)) return null;
  const parts = hostname.split('.');

  // sub.localhost -> ["sub", "localhost"]
  if (hostname.endsWith('.localhost') && parts.length >= 2 && !RESERVED.has(parts[0])) {
    return parts[0];
  }
  // sub.domain.tld -> ["sub", "domain", "tld"]
  if (parts.length >= 3 && !RESERVED.has(parts[0])) {
    return parts[0];
  }
  return null;
}

// Hosts on our own platform suffixes are handled by extractSlug; anything else
// with a dot (fitness.com) is treated as a tenant's custom domain and resolved
// via the API, cached per-host in a cookie so we only hit the API once.
const PLATFORM_SUFFIXES = ['.onedexo.com', '.localhost'];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function isCustomDomain(hostname: string): boolean {
  return Boolean(
    hostname &&
    hostname.includes('.') &&
    hostname !== 'localhost' &&
    !isTunnelHost(hostname) &&
    !PLATFORM_SUFFIXES.some((s) => hostname.endsWith(s)),
  );
}

async function resolveCustomDomain(req: NextRequest, hostname: string): Promise<string | null> {
  const cached = req.cookies.get('dexo_host_map')?.value || '';
  const [cachedHost, cachedSlug] = cached.split('~');
  if (cachedHost === hostname && cachedSlug) return cachedSlug;
  try {
    const r = await fetch(`${API_URL}/api/tenants/resolve?host=${encodeURIComponent(hostname)}`);
    if (!r.ok) return null;
    const t = await r.json();
    return t?.subdomain || null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const hostname = (host || '').split(':')[0].toLowerCase();
  // ?tenant=<slug> pins a tenant for the session (sticky via cookie) — lets a
  // single ngrok URL demo any tenant: https://<id>.ngrok-free.app/?tenant=bishnufit
  const queryTenant = req.nextUrl.searchParams.get('tenant')?.toLowerCase() || null;
  const cookieTenant = req.cookies.get('dexo_tenant')?.value || null;
  // In production nginx already resolved the tenant (X-Tenant-Slug header).
  const headerSlug = req.headers.get('x-tenant-slug')?.toLowerCase() || null;
  const customSlug =
    !queryTenant && !headerSlug && isCustomDomain(hostname) ? await resolveCustomDomain(req, hostname) : null;
  const slug =
    queryTenant ||
    headerSlug ||
    customSlug ||
    extractSlug(host) ||
    (isTunnelHost(hostname) ? cookieTenant : null) ||
    process.env.DEV_TENANT ||
    'vrfitness';

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', slug);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  // Non-httpOnly so client components (e.g. /register) can read the resolved tenant.
  res.cookies.set('dexo_tenant', slug, { path: '/', sameSite: 'lax' });
  // Cache the custom-domain → slug mapping so we don't re-resolve every request.
  if (customSlug) {
    res.cookies.set('dexo_host_map', `${hostname}~${customSlug}`, { path: '/', sameSite: 'lax', maxAge: 3600 });
  }
  return res;
}

export const config = {
  // Run on all routes except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
