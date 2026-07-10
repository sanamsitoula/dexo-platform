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
 *   vrfitness.dexo.app          (prod)   -> "vrfitness"
 *   ramgym.dexo.app             (prod)   -> "ramgym"
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

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  // ?tenant=<slug> pins a tenant for the session (sticky via cookie) — lets a
  // single ngrok URL demo any tenant: https://<id>.ngrok-free.app/?tenant=bishnufit
  const queryTenant = req.nextUrl.searchParams.get('tenant')?.toLowerCase() || null;
  const cookieTenant = req.cookies.get('dexo_tenant')?.value || null;
  const slug =
    queryTenant ||
    extractSlug(host) ||
    (isTunnelHost((host || '').split(':')[0].toLowerCase()) ? cookieTenant : null) ||
    process.env.DEV_TENANT ||
    'vrfitness';

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', slug);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  // Non-httpOnly so client components (e.g. /register) can read the resolved tenant.
  res.cookies.set('dexo_tenant', slug, { path: '/', sameSite: 'lax' });
  return res;
}

export const config = {
  // Run on all routes except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
