import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware for Multi-Tenant Subdomain Routing
 *
 * Extracts subdomain from the Host header and resolves the tenant.
 * Sets tenant context in headers for downstream use.
 *
 * Examples:
 * - fitness.onedexo.com → subdomain: "fitness"
 * - gym.example.com → domain: "gym.example.com"
 * - localhost:3000 → no tenant (platform admin)
 */

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'onedexo.com'
const ADMIN_SUBDOMAIN = 'admin'

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): { subdomain: string | null; isCustomDomain: boolean } {
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0]

  // Handle localhost development
  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    return { subdomain: null, isCustomDomain: false }
  }

  // Check if it's a custom domain (not matching platform domain)
  if (!hostWithoutPort.endsWith(PLATFORM_DOMAIN)) {
    return { subdomain: null, isCustomDomain: true }
  }

  // Extract subdomain from platform domain
  const parts = hostWithoutPort.split('.')
  if (parts.length >= 3) {
    const subdomain = parts[0]
    // Exclude common subdomains
    if (subdomain && subdomain !== 'www' && subdomain !== ADMIN_SUBDOMAIN) {
      return { subdomain, isCustomDomain: false }
    }
  }

  return { subdomain: null, isCustomDomain: false }
}

/**
 * Middleware handler
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  const { subdomain, isCustomDomain } = extractSubdomain(hostname)

  // Handle admin subdomain - redirect to admin app
  if (subdomain === ADMIN_SUBDOMAIN) {
    const adminUrl = new URL(url.pathname, `http://localhost:3001`)
    adminUrl.searchParams.set('from', hostname)
    return NextResponse.rewrite(adminUrl)
  }

  // Handle tenant subdomain
  if (subdomain || isCustomDomain) {
    // Create response with tenant context headers
    const response = NextResponse.next()

    // Set tenant identifier for downstream consumption
    if (subdomain) {
      response.headers.set('x-tenant-subdomain', subdomain)
    }
    if (isCustomDomain) {
      response.headers.set('x-tenant-custom-domain', hostname)
    }
    response.headers.set('x-tenant-identifier', subdomain || hostname)

    // Cache tenant lookup by subdomain/domain
    // This will be used by the tenant context provider
    return response
  }

  // No tenant context - serve platform landing
  return NextResponse.next()
}

/**
 * Configure middleware matching paths
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
