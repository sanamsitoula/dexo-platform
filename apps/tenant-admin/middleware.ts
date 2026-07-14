import { NextRequest, NextResponse } from 'next/server';

/**
 * Host-based tenant resolution for the tenant-admin app.
 *
 * Path-based routing: this app is always reached at
 * <tenant>.onedexo.com/admin — nginx dispatches by the `/admin` path
 * prefix, not by an `admin.<tenant>.` subdomain, so tenant resolution here
 * is host-only, identical to apps/tenant-website/middleware.ts. Exposes the
 * tenant via the `x-tenant-slug` request header (server components) and the
 * non-httpOnly `dexo_tenant` cookie (client components).
 *
 * Supported host shapes:
 *   <tenant>.onedexo.com        (prod)   -> "<tenant>"
 *   <tenant>.localhost:4006     (dev)    -> "<tenant>"
 *   localhost:4006              (dev)    -> DEV_TENANT env, else unresolved
 */

// Subdomains that are never a tenant slug.
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'portal', 'localhost', 'dexo', 'chatwoot']);

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
  // ?tenant=<slug> pins a tenant for the session (sticky via cookie).
  const queryTenant = req.nextUrl.searchParams.get('tenant')?.toLowerCase() || null;
  const cookieTenant = req.cookies.get('dexo_tenant')?.value || null;
  const slug =
    queryTenant ||
    extractSlug(host) ||
    (isTunnelHost((host || '').split(':')[0].toLowerCase()) ? cookieTenant : null) ||
    null;

  // No silent default — an unresolvable host gets a real error page instead
  // of pretending to be some other business (was silently 'vrfitness').
  if (!slug) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-attempted-host', host);
    // req.nextUrl.clone() (not `new URL(path, req.url)`) so basePath
    // ('/admin') is correctly re-applied when the rewritten URL is serialized.
    const notFoundUrl = req.nextUrl.clone();
    notFoundUrl.pathname = '/tenant-not-found';
    return NextResponse.rewrite(notFoundUrl, { request: { headers: requestHeaders } });
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', slug);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  // Non-httpOnly so client components can read the resolved tenant.
  res.cookies.set('dexo_tenant', slug, { path: '/', sameSite: 'lax' });
  return res;
}

export const config = {
  // Run on all routes except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
