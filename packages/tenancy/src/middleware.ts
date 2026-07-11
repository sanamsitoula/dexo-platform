import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'onedexo.com';
const RESERVED = new Set(['www', 'admin', 'api', 'cdn', 'docs', 'status', 'portal']);

export interface TenantMiddlewareOptions {
  devTenantEnv?: string;
}

export function tenantMiddleware(
  request: NextRequest,
  options: TenantMiddlewareOptions = {},
) {
  const host = request.headers.get('host') ?? '';
  const devTenantHeader = request.headers.get('x-dev-tenant');
  const devTenantEnv = options.devTenantEnv || process.env.DEV_TENANT || 'vrfitness';

  const subdomain = parseSubdomain(host);
  const slug = subdomain && !RESERVED.has(subdomain)
    ? subdomain
    : (devTenantHeader || devTenantEnv);

  const response = NextResponse.next();
  if (slug) {
    response.headers.set('x-tenant-slug', slug);
  }
  response.headers.set('x-host', host);
  return response;
}

function parseSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0].toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) return null;
  const parts = host.split('.');
  if (parts.length >= 3 && parts.slice(-2).join('.') === PLATFORM_DOMAIN) {
    return parts[0] || null;
  }
  return null;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
