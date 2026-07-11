import Link from 'next/link';
import { headers } from 'next/headers';
import { getFitnessInfo, type FitnessInfo } from '@/lib/api';
import { getSiteTheme } from '@/lib/site-theme';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import LoginRedirect from './redirect';

function resolveSubdomain(): string {
  const h = headers();
  return h.get('x-tenant-slug') || process.env.DEV_TENANT || 'vrfitness';
}

const FALLBACK: FitnessInfo = {
  id: '', name: 'Fitness Center', subdomain: null,
  tagline: 'Transform your body. Transform your life.',
  description: 'Modern gym & fitness management — workouts, diet tracking, classes and more.',
  logoUrl: null, colorPrimary: '#E85D24', colorAccent: '#F2A623', branchCount: 0, contact: null,
};

export default async function LoginPage() {
  const subdomain = resolveSubdomain();
  const [info, theme] = await Promise.all([getFitnessInfo(subdomain), getSiteTheme(subdomain)]);
  const t = info || FALLBACK;
  // Customer app (member portal) URL — {slug} placeholder supports prod domains.
  const memberAppUrl = (process.env.NEXT_PUBLIC_TENANT_APP_URL || 'http://{slug}.localhost:4007')
    .replace('{slug}', subdomain);
  const loginUrl = `${memberAppUrl}/login`;

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={t.name} />

      {/* Redirect card */}
      <section className="px-4 py-24 max-w-md mx-auto text-center">
        <div
          className="p-8"
          style={{ backgroundColor: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
        >
          <div className="text-4xl">🔐</div>
          <h1 className="mt-4 text-3xl font-extrabold">Member Login</h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--site-sub)' }}>
            Members sign in through the {t.name} member portal, where you can book classes,
            track workouts, manage payments and check in with your QR code.
          </p>
          <LoginRedirect loginUrl={loginUrl} accent={theme.primary} />
          <p className="mt-6 text-sm" style={{ color: 'var(--site-sub)' }}>
            Not a member yet?{' '}
            <Link href="/register" className="underline hover:opacity-80" style={{ color: 'var(--site-primary)' }}>Join now</Link>
          </p>
        </div>
      </section>

      <SiteFooter theme={theme} name={t.name} contact={t.contact} />
    </div>
  );
}
