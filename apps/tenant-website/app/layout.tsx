// Fixed layout.tsx to prevent potential errors
import './globals.css';
import { headers } from 'next/headers';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';

export const metadata = {
  title: 'Tenant Website',
  description: 'Public-facing tenant website',
};

// Safe async function to get tenant context with fallback
async function getTenantContext() {
  try {
    const h = headers();
    const slug = h.get('x-tenant-slug') || process.env.DEV_TENANT || 'vrfitness';
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Resolve the domain type dynamically from the tenant record so ANY business
    // (any gym, any restaurant) renders correctly — no per-slug hardcoding.
    const domainType = await resolveDomainType(slug, API_URL);

    // Try to fetch from API, but don't fail if unavailable
    const res = await fetch(`${API_URL}/api/business-templates/${domainType}`, {
      cache: 'no-store',
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (error: any) {
    // Log but don't fail - we'll use fallback values
    console.warn('Could not fetch tenant config, using fallback:', error.message);
  }

  // Return fallback template data
  return {
    name: 'Fitness Center',
    tagline: 'Welcome to your fitness center',
    description: 'Complete gym management solution',
    colorPrimary: '#3b82f6',
    colorAccent: '#10b981',
    colorBg: '#ffffff',
    fontHeading: 'Inter',
    fontBody: 'Inter'
  };
}

// Resolve a tenant's business/domain type from its record (settings.theme or
// settings.domainCode), so new tenants work without code changes. Falls back to
// FITNESS_CENTER only when the tenant can't be resolved.
async function resolveDomainType(slug: string, apiUrl: string): Promise<string> {
  try {
    const res = await fetch(`${apiUrl}/api/tenants/subdomain/${slug}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const tenant = await res.json();
      const s = (tenant?.settings as Record<string, any>) || {};
      const code = s.domainCode || s.theme || tenant?.domainCode;
      if (code && typeof code === 'string') return code;
    }
  } catch {
    // ignore — fall through to default
  }
  return 'FITNESS_CENTER';
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve active tenant subdomain for layout-wide features (FloatingWhatsApp, etc.)
  const h = headers();
  const slug = h.get('x-tenant-slug') || process.env.DEV_TENANT || 'vrfitness';

  // Safely get template context with error handling
  let ctx: any = null;
  try {
    ctx = await getTenantContext();
  } catch (error) {
    console.error('Failed to get tenant context:', error);
    ctx = {
      name: 'Default Tenant',
      tagline: 'Welcome',
      description: 'Your business platform',
      colorPrimary: '#3b82f6',
      colorAccent: '#10b981',
      colorBg: '#ffffff',
      fontHeading: 'Inter',
      fontBody: 'Inter'
    };
  }

  // Ensure we have a valid object
  if (!ctx) {
    ctx = {
      name: 'Default Tenant',
      tagline: 'Welcome',
      description: 'Your business platform',
      colorPrimary: '#3b82f6',
      colorAccent: '#10b981',
      colorBg: '#ffffff',
      fontHeading: 'Inter',
      fontBody: 'Inter'
    };
  }

  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: ctx.colorBg || '#ffffff',
          color: ctx.colorPrimary || '#3b82f6'
        }}
      >
        {children}
        <FloatingWhatsApp subdomain={slug} />
      </body>
    </html>
  );
}