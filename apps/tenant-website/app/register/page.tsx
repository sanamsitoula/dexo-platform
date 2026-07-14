import { headers } from 'next/headers';
import { getFitnessInfo, getGenericTenantInfo, type FitnessInfo } from '@/lib/api';
import { getSiteTheme } from '@/lib/site-theme';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import AuthPanel from '@/components/AuthPanel';

function resolveSubdomain(): string {
  const h = headers();
  return h.get('x-tenant-slug') || '';
}

const FALLBACK: FitnessInfo = {
  id: '', name: 'Fitness Center', subdomain: null,
  tagline: 'Transform your body. Transform your life.',
  description: 'Modern gym & fitness management — workouts, diet tracking, classes and more.',
  logoUrl: null, colorPrimary: '#E85D24', colorAccent: '#F2A623', branchCount: 0, contact: null,
};

export default async function RegisterPage() {
  const subdomain = resolveSubdomain();
  const [info, theme] = await Promise.all([getFitnessInfo(subdomain), getSiteTheme(subdomain)]);
  const t = info || (await getGenericTenantInfo(subdomain)) || FALLBACK;

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={t.name} />
      <section className="px-4 py-16 flex justify-center">
        <AuthPanel subdomain={subdomain} tenantId={t.id} tenantName={t.name} logoUrl={t.logoUrl} initialTab="register" />
      </section>
      <SiteFooter theme={theme} name={t.name} contact={t.contact} />
    </div>
  );
}
