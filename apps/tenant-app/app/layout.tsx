import './globals.css';
import { headers } from 'next/headers';
import { inter, grotesk, jbMono } from '@dexo/ui';
import BottomNav from './_components/BottomNav';
import TopNav from './_components/TopNav';
import AuthGate from './_components/AuthGate';

// DEXO brand type stack — Inter for UI, Space Grotesk for display numerals and
// titles, JetBrains Mono for codes/IDs (brand/Brand/04-typography.md).
// Self-hosted, see packages/ui/src/fonts.ts.

export const metadata = {
  title: 'Fitness App',
  description: 'Your gym in your pocket — workouts, diet, membership. Powered by Dexo.',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Tenant branding for the member portal — same source as the public website
 * (tenant settings.branding), so the customer sees one consistent brand across
 * website, web app and mobile app.
 */
async function getBrand(): Promise<{ primary: string; accent: string }> {
  try {
    const h = headers();
    const slug = h.get('x-tenant-slug');
    if (!slug) return { primary: '#EA580C', accent: '#F59E0B' };
    const res = await fetch(`${API_URL}/api/tenants/subdomain/${slug}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const t = await res.json();
      const b = ((t?.settings as any) || {}).branding || {};
      return { primary: b.colorPrimary || '#EA580C', accent: b.colorAccent || '#F59E0B' };
    }
  } catch { /* API unreachable — fall back to default brand */ }
  return { primary: '#EA580C', accent: '#F59E0B' };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBrand();
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${grotesk.variable} ${jbMono.variable} ${inter.className} bg-gray-50 pb-20 md:pb-0`}
        style={{ ['--brand-primary' as any]: brand.primary, ['--brand-accent' as any]: brand.accent }}
      >
        <div className="min-h-screen bg-white">
          <AuthGate>
            <TopNav />
            <div className="max-w-md md:max-w-4xl mx-auto md:px-6 md:py-6">
              {children}
            </div>
            <BottomNav />
          </AuthGate>
        </div>
      </body>
    </html>
  );
}
