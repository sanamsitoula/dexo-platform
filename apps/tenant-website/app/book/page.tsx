import { headers } from 'next/headers';
import { getFitnessInfo, getFitnessPlans, getGenericTenantInfo, getSiteNav, type FitnessInfo } from '@/lib/api';
import { getSiteTheme } from '@/lib/site-theme';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import BookingForm from './BookingForm';

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

// Bookable services shown to the public. The class schedule / bookings API is
// members-only (JWT), so public booking requests go to the tenant's CRM inbox
// (POST /api/contact, channel WEBSITE) where staff confirm the slot.
const BASE_SERVICES = [
  'Free Intro Session',
  'Gym Floor Session',
  'Group Class (Yoga / Zumba / HIIT)',
  'Personal Training Session',
  'Fitness Assessment',
  'Diet & Nutrition Consultation',
];

export default async function BookPage({ searchParams }: { searchParams?: { service?: string } }) {
  const subdomain = resolveSubdomain();
  const [info, plans, theme, navItems] = await Promise.all([
    getFitnessInfo(subdomain),
    getFitnessPlans(subdomain),
    getSiteTheme(subdomain),
    getSiteNav(subdomain),
  ]);
  const t = info || (await getGenericTenantInfo(subdomain)) || FALLBACK;

  // Same data source as /services: base catalogue + a trial option per plan
  // that includes classes (live from the public plans endpoint).
  const planServices = plans.filter((p) => p.includesClasses).map((p) => `Class Trial — ${p.name} plan`);
  const preselected = searchParams?.service || '';
  const services = Array.from(new Set([
    ...(preselected ? [preselected] : []),
    ...BASE_SERVICES,
    ...planServices,
  ]));

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={t.name} active="/book" navItems={navItems} />

      {/* Hero */}
      <section className="text-center px-4 py-14 max-w-2xl mx-auto">
        <p className="text-sm uppercase tracking-widest" style={{ color: 'var(--site-sub)' }}>Booking</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight">Book a session at {t.name}</h1>
        <p className="mt-3" style={{ color: 'var(--site-sub)' }}>
          Pick a class or service and a preferred time — our team will confirm your booking
          by phone or email, usually within a few hours.
        </p>
      </section>

      {/* Booking form */}
      <section className="px-4 pb-20 max-w-xl mx-auto">
        <BookingForm
          subdomain={subdomain}
          tenantName={t.name}
          accent={theme.primary}
          services={services}
          preselected={preselected}
        />
      </section>

      <SiteFooter theme={theme} name={t.name} contact={t.contact} />
    </div>
  );
}
