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
 *   vrfitness.dexo.app         -> "vrfitness"
 *   ramgym.localhost:4007      -> "ramgym"
 *   localhost:4007             -> DEV_TENANT env or "vrfitness"
 */

const RESERVED = new Set(['www', 'app', 'api', 'admin', 'localhost', 'dexo']);

function extractSlug(host: string): string | null {
  const hostname = (host || '').split(':')[0].toLowerCase();
  if (!hostname) return null;
  const parts = hostname.split('.');
  if (hostname.endsWith('.localhost') && parts.length >= 2 && !RESERVED.has(parts[0])) {
    return parts[0];
  }
  if (parts.length >= 3 && !RESERVED.has(parts[0])) {
    return parts[0];
  }
  return null;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const slug = extractSlug(host) || process.env.DEV_TENANT || 'vrfitness';

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', slug);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set('dexo_tenant', slug, { path: '/', sameSite: 'lax' });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
