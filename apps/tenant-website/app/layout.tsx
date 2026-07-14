// Fixed layout.tsx to prevent potential errors
import './globals.css';
import { headers } from 'next/headers';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';
import ShoppingAssistantWidget from '@/components/ShoppingAssistantWidget';
import ChatwootWidget from '@/components/ChatwootWidget';
import { getSiteTheme, themeVars } from '@/lib/site-theme';
import { isEcommerceDomainCode } from '@/lib/domainType';

export const metadata = {
  title: 'Tenant Website',
  description: 'Public-facing tenant website',
};

// Safe async function to get tenant context with fallback
async function getTenantContext() {
  try {
    const h = headers();
    const slug = h.get('x-tenant-slug') || '';
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Resolve the domain type dynamically from the tenant record so ANY business
    // (any gym, any restaurant) renders correctly — no per-slug hardcoding.
    const domainType = await resolveDomainType(slug, API_URL);
    if (!domainType) throw new Error('Could not resolve tenant domain type');

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

// Resolve a tenant's business/domain type. tenant.service.ts's
// findBySubdomain() deliberately flattens the TenantDomain relation into a
// plain `tenant.domainCode` string and strips `domains` from the response
// entirely — reading tenant.domains[0].domain.code (the old assumption)
// always silently evaluated to undefined, so this fell through to the
// hardcoded FITNESS_CENTER fallback below regardless of the tenant's real
// business type.
async function resolveDomainType(slug: string, apiUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${apiUrl}/api/tenants/subdomain/${slug}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const tenant = await res.json();
      return tenant?.domainCode || null;
    }
  } catch {
    // ignore — fall through to null
  }
  return null;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve active tenant subdomain for layout-wide features (FloatingWhatsApp, etc.)
  const h = headers();
  const slug = h.get('x-tenant-slug') || '';

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

  // Template-aware theme (settings.branding.templateId) exposed to every page
  // — server and client — through CSS variables.
  const theme = await getSiteTheme(slug, ctx.colorPrimary, ctx.colorAccent);

  // Ecommerce-only widget: gate on domain type so gyms/salons/etc. don't get
  // a shopping assistant bubble they have no products for.
  const domainType = await resolveDomainType(slug, process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
  const showShoppingAssistant = isEcommerceDomainCode(domainType);

  return (
    <html lang="en">
      <body
        style={{
          ...(themeVars(theme) as React.CSSProperties),
          backgroundColor: theme.bg,
          color: theme.text,
        }}
      >
        {children}
        <FloatingWhatsApp subdomain={slug} />
        {showShoppingAssistant && <ShoppingAssistantWidget />}
        <ChatwootWidget subdomain={slug} />
      </body>
    </html>
  );
}