import { NextRequest, NextResponse } from 'next/server';

/**
 * Host-based tenant resolution for the customer app.
 *
 * The tenant-app is largely client-rendered, so besides the `x-tenant-slug`
 * request header we also stamp a non-httpOnly `dexo_tenant` cookie that client
 * code (lib/api.ts `resolveSubdomain`) can read reliably — this removes any
 * ambiguity from parsing `window.location.hostname` on odd dev hosts.
 *
 * Host shapes (see tenant-website/middleware.ts for the full rationale):
 *   vrfitness.onedexo.com         -> "vrfitness"
 *   ramgym.localhost:4007      -> "ramgym"
 *   localhost:4007             -> DEV_TENANT env or "vrfitness"
 */

const RESERVED = new Set(['www', 'app', 'api', 'admin', 'portal', 'localhost', 'dexo', 'onedexo', 'chatwoot']);

// Tunnel hosts (ngrok, cloudflared, localtunnel) have random first labels that
// must NOT be treated as tenant subdomains. On these hosts the tenant comes
// from ?tenant=<slug>, the dexo_tenant cookie, or DEV_TENANT.
const TUNNEL_SUFFIXES = ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io', '.ngrok.dev', '.trycloudflare.com', '.loca.lt'];
const isTunnelHost = (hostname: string) => TUNNEL_SUFFIXES.some((s) => hostname.endsWith(s));

function extractSlug(host: string): string | null {
  const hostname = (host || '').split(':')[0].toLowerCase();
  if (!hostname || isTunnelHost(hostname)) return null;
  const parts = hostname.split('.');
  // Canonical member-portal host: portal.<tenant>.onedexo.com / portal.<tenant>.localhost
  if ((parts[0] === 'portal' || parts[0] === 'admin') && parts.length >= 3 && !RESERVED.has(parts[1])) {
    return parts[1];
  }
  if (hostname.endsWith('.localhost') && parts.length >= 2 && !RESERVED.has(parts[0])) {
    return parts[0];
  }
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
  // ?tenant=<slug> pins a tenant for the session (sticky via cookie) — this is
  // how a single ngrok URL demos any tenant: open https://<id>.ngrok-free.app/?tenant=bishnufit
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
    null;

  // No silent default — a request that genuinely can't be tied to a tenant
  // (e.g. bare `localhost:4007` with no ?tenant= and no dexo_tenant cookie)
  // gets a real error page instead of pretending to be some other business.
  if (!slug) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-attempted-host', host);
    return NextResponse.rewrite(new URL('/tenant-not-found', req.url), { request: { headers: requestHeaders } });
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', slug);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set('dexo_tenant', slug, { path: '/', sameSite: 'lax' });
  // Cache the custom-domain → slug mapping so we don't re-resolve every request.
  if (customSlug) {
    res.cookies.set('dexo_host_map', `${hostname}~${customSlug}`, { path: '/', sameSite: 'lax', maxAge: 3600 });
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
