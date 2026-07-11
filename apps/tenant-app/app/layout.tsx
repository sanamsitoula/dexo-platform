import './globals.css';
import { headers } from 'next/headers';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import BottomNav from './_components/BottomNav';
import AuthGate from './_components/AuthGate';

// DEXO brand type stack — Inter for UI, Space Grotesk for display numerals and
// titles, JetBrains Mono for codes/IDs (brand/Brand/04-typography.md).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-grotesk', display: 'swap' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-jbmono', display: 'swap' });

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
    const slug = h.get('x-tenant-slug') || process.env.DEV_TENANT || 'vrfitness';
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
        className={`${inter.variable} ${grotesk.variable} ${jbMono.variable} ${inter.className} bg-gray-50 pb-20`}
        style={{ ['--brand-primary' as any]: brand.primary, ['--brand-accent' as any]: brand.accent }}
      >
        <div className="max-w-md mx-auto min-h-screen bg-white">
          <AuthGate>
            {children}
            <BottomNav />
          </AuthGate>
        </div>
      </body>
    </html>
  );
}
