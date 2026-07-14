import Link from 'next/link';
import { headers } from 'next/headers';
import { getFitnessInfo, getFitnessPlans, getGenericTenantInfo, getPublicPage, type FitnessInfo, type FitnessPlan } from '@/lib/api';
import { getSiteTheme } from '@/lib/site-theme';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import PageSectionRenderer from '@/components/PageSectionRenderer';

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

// Marketing copy for services/classes. The API's class schedule is a
// members-only endpoint (JWT-guarded), so the public site shows the standard
// service catalogue and drives visitors to /book (CRM booking request).
const SERVICES = [
  { icon: '🏋️', title: 'Gym Floor Access', desc: 'Full access to free weights, machines and cardio equipment during your plan hours.' },
  { icon: '🧘', title: 'Group Classes', desc: 'Yoga, Zumba, HIIT, spinning and more — led by certified instructors.' },
  { icon: '🤸', title: 'Personal Training', desc: 'One-on-one sessions with a dedicated trainer and a personalized program.' },
  { icon: '🥗', title: 'Diet & Nutrition', desc: 'Custom diet plans with calorie and macro tracking, including local Nepali foods.' },
  { icon: '📊', title: 'Fitness Assessments', desc: 'Body measurements, progress tracking and milestone reviews at regular intervals.' },
  { icon: '🔑', title: 'Lockers & Amenities', desc: 'Secure lockers, changing rooms and member amenities on selected plans.' },
];

function planPeriod(type: string, days: number): string {
  const map: Record<string, string> = { DAILY: 'day', MONTHLY: 'month', QUARTERLY: 'quarter', HALF_YEARLY: '6 months', YEARLY: 'year' };
  return map[type] || `${days} days`;
}

const card = {
  backgroundColor: 'var(--site-surface)',
  border: '1px solid var(--site-border)',
  borderRadius: 'var(--site-radius)',
} as const;

export default async function ServicesPage() {
  const subdomain = resolveSubdomain();
  const [info, plans, theme, realPage] = await Promise.all([
    getFitnessInfo(subdomain),
    getFitnessPlans(subdomain),
    getSiteTheme(subdomain),
    getPublicPage(subdomain, 'services'),
  ]);
  // See apps/tenant-website/app/about/page.tsx — getFitnessInfo() is
  // fitness-only and 404s for every other business type.
  const t = info || (await getGenericTenantInfo(subdomain)) || FALLBACK;

  if (realPage && realPage.sections.length > 0) {
    return (
      <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
        <SiteNav theme={theme} name={t.name} active="/services" />
        {realPage.sections.map((section) => (
          <PageSectionRenderer key={section.id} section={section} colorPrimary="var(--site-primary)" subdomain={subdomain} />
        ))}
        <SiteFooter theme={theme} name={t.name} contact={t.contact} />
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={t.name} active="/services" />

      {/* Hero */}
      <section className="text-center px-4 py-20 max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-widest" style={{ color: 'var(--site-sub)' }}>Services</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight">Everything {t.name} offers</h1>
        <p className="mt-4" style={{ color: 'var(--site-sub)' }}>{t.description}</p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href="/book"
            className="px-7 py-3 font-semibold"
            style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
          >
            Book a Session
          </Link>
          <a
            href="#plans"
            className="px-7 py-3 font-semibold border hover:opacity-80"
            style={{ borderColor: 'var(--site-border)', borderRadius: 'var(--site-radius)' }}
          >
            View Plans
          </a>
        </div>
      </section>

      {/* Services grid */}
      <section className="px-4 py-14 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center">Classes & services</h2>
        <p className="text-center mt-2" style={{ color: 'var(--site-sub)' }}>
          Ask at the front desk or book online for the current class schedule.
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((s) => (
            <div key={s.title} className="p-6 flex flex-col" style={card}>
              <div className="text-3xl">{s.icon}</div>
              <h3 className="mt-3 font-semibold text-lg">{s.title}</h3>
              <p className="mt-1 text-sm flex-1" style={{ color: 'var(--site-sub)' }}>{s.desc}</p>
              <Link
                href={`/book?service=${encodeURIComponent(s.title)}`}
                className="mt-4 text-sm font-semibold hover:underline"
                style={{ color: 'var(--site-primary)' }}
              >
                Book this →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Membership plans (live from public API) */}
      <section id="plans" className="px-4 py-14 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center">Membership Plans</h2>
        <p className="text-center mt-2" style={{ color: 'var(--site-sub)' }}>Prices in NPR, inclusive of VAT.</p>
        {plans.length === 0 ? (
          <p className="text-center mt-10" style={{ color: 'var(--site-sub)' }}>
            Plans will be available shortly. <Link href="/contact" className="underline">Contact us</Link> to get started today.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p: FitnessPlan, i: number) => (
              <div key={p.id} className="p-6 flex flex-col"
                style={{ ...card, ...(i === 1 ? { borderColor: 'var(--site-primary)', boxShadow: '0 0 0 1px var(--site-primary)' } : {}) }}>
                <h3 className="font-bold text-xl">{p.name}</h3>
                {p.description && <p className="text-sm mt-1" style={{ color: 'var(--site-sub)' }}>{p.description}</p>}
                <div className="mt-4">
                  <span className="text-4xl font-extrabold">Rs {p.totalWithVat.toLocaleString()}</span>
                  <span className="text-sm" style={{ color: 'var(--site-sub)' }}> / {planPeriod(p.type, p.durationDays)}</span>
                </div>
                <ul className="mt-4 space-y-1 text-sm flex-1" style={{ color: 'var(--site-sub)' }}>
                  <li>✓ {p.accessHours || 'Gym access'}</li>
                  <li>{p.includesTrainer ? '✓' : '✗'} Personal trainer</li>
                  <li>{p.includesClasses ? '✓' : '✗'} Group classes</li>
                  <li>{p.includesDietPlan ? '✓' : '✗'} Diet plan</li>
                  <li>{p.includesLocker ? '✓' : '✗'} Locker</li>
                  <li>✓ {p.branchAccess === 'all' ? 'All branches' : 'Single branch'}</li>
                </ul>
                <Link
                  href={`/register?plan=${p.id}`}
                  className="mt-6 text-center px-4 py-2 font-semibold"
                  style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
                >
                  Choose {p.name}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center" style={{ background: 'var(--site-accent)', color: 'var(--site-on-accent)' }}>
        <h2 className="text-3xl font-bold">Not sure where to start?</h2>
        <p className="mt-2 opacity-80">Book a free intro session and we&apos;ll build a plan together.</p>
        <Link
          href="/book"
          className="mt-6 inline-block px-8 py-3 font-semibold"
          style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
        >
          Book a Session
        </Link>
      </section>

      <SiteFooter theme={theme} name={t.name} contact={t.contact} />
    </div>
  );
}
