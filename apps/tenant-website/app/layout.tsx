// Fixed layout.tsx to prevent potential errors
import './globals.css';
import { tenantMiddleware } from '@dexo/tenancy';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';

export const middleware = (req: NextRequest) => tenantMiddleware(req);

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

    // Try to fetch from API, but don't fail if unavailable
    const res = await fetch(`${API_URL}/api/business-templates/${slugToDomainType(slug)}`, {
      cache: 'no-store',
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
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

function slugToDomainType(slug: string): string {
  if (slug === 'vrfitness') return 'FITNESS_CENTER';
  if (slug === 'spicegarden') return 'RESTAURANT_AND_CAFE';
  return 'FITNESS_CENTER'; // default fallback
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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
      </body>
    </html>
  );
}