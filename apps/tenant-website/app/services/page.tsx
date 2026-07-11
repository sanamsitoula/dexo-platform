import Link from 'next/link';
import { headers } from 'next/headers';
import { getFitnessInfo, getFitnessPlans, type FitnessInfo, type FitnessPlan } from '@/lib/api';

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

export default async function ServicesPage() {
  const subdomain = resolveSubdomain();
  const [info, plans] = await Promise.all([getFitnessInfo(subdomain), getFitnessPlans(subdomain)]);
  const t = info || FALLBACK;

  return (
    <div style={{ background: '#0f0f10', color: '#fff', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-extrabold" style={{ color: t.colorPrimary }}>{t.name}</Link>
        <div className="space-x-4 text-sm">
          <Link href="/about" className="opacity-80 hover:opacity-100">About</Link>
          <Link href="/services" className="opacity-100 font-semibold">Services</Link>
          <Link href="/book" className="opacity-80 hover:opacity-100">Book</Link>
          <Link href="/contact" className="opacity-80 hover:opacity-100">Contact</Link>
          <Link href="/register" className="px-4 py-2 rounded-md font-semibold text-black" style={{ background: t.colorPrimary }}>Join Now</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 py-20 max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-widest opacity-60">Services</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight">Everything {t.name} offers</h1>
        <p className="mt-4 opacity-70">{t.description}</p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/book" className="px-7 py-3 rounded-md font-semibold text-black" style={{ background: t.colorPrimary }}>Book a Session</Link>
          <a href="#plans" className="px-7 py-3 rounded-md font-semibold border border-white/20 hover:bg-white/5">View Plans</a>
        </div>
      </section>

      {/* Services grid */}
      <section className="px-4 py-14 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center">Classes & services</h2>
        <p className="text-center opacity-70 mt-2">Ask at the front desk or book online for the current class schedule.</p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((s) => (
            <div key={s.title} className="p-6 rounded-xl bg-white/5 border border-white/10 flex flex-col">
              <div className="text-3xl">{s.icon}</div>
              <h3 className="mt-3 font-semibold text-lg">{s.title}</h3>
              <p className="mt-1 text-sm opacity-70 flex-1">{s.desc}</p>
              <Link href={`/book?service=${encodeURIComponent(s.title)}`} className="mt-4 text-sm font-semibold hover:underline" style={{ color: t.colorPrimary }}>
                Book this →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Membership plans (live from public API) */}
      <section id="plans" className="px-4 py-14 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center">Membership Plans</h2>
        <p className="text-center opacity-70 mt-2">Prices in NPR, inclusive of VAT.</p>
        {plans.length === 0 ? (
          <p className="text-center opacity-60 mt-10">Plans will be available shortly. <Link href="/contact" className="underline">Contact us</Link> to get started today.</p>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p: FitnessPlan, i: number) => (
              <div key={p.id} className="p-6 rounded-xl bg-white/5 border border-white/10 flex flex-col"
                style={i === 1 ? { borderColor: t.colorPrimary, boxShadow: `0 0 0 1px ${t.colorPrimary}` } : {}}>
                <h3 className="font-bold text-xl">{p.name}</h3>
                {p.description && <p className="text-sm opacity-70 mt-1">{p.description}</p>}
                <div className="mt-4">
                  <span className="text-4xl font-extrabold">Rs {p.totalWithVat.toLocaleString()}</span>
                  <span className="opacity-60 text-sm"> / {planPeriod(p.type, p.durationDays)}</span>
                </div>
                <ul className="mt-4 space-y-1 text-sm opacity-80 flex-1">
                  <li>✓ {p.accessHours || 'Gym access'}</li>
                  <li>{p.includesTrainer ? '✓' : '✗'} Personal trainer</li>
                  <li>{p.includesClasses ? '✓' : '✗'} Group classes</li>
                  <li>{p.includesDietPlan ? '✓' : '✗'} Diet plan</li>
                  <li>{p.includesLocker ? '✓' : '✗'} Locker</li>
                  <li>✓ {p.branchAccess === 'all' ? 'All branches' : 'Single branch'}</li>
                </ul>
                <Link href={`/register?plan=${p.id}`} className="mt-6 text-center px-4 py-2 rounded-md font-semibold text-black" style={{ background: t.colorPrimary }}>
                  Choose {p.name}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center" style={{ background: t.colorAccent, color: '#111' }}>
        <h2 className="text-3xl font-bold">Not sure where to start?</h2>
        <p className="mt-2 opacity-80">Book a free intro session and we&apos;ll build a plan together.</p>
        <Link href="/book" className="mt-6 inline-block px-8 py-3 bg-black text-white rounded-md font-semibold">Book a Session</Link>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-sm opacity-60">
        <div className="space-x-3 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/services" className="hover:text-white">Services</Link>
          <Link href="/book" className="hover:text-white">Book</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </div>
        <div>© {new Date().getFullYear()} {t.name} · Powered by Dexo</div>
      </footer>
    </div>
  );
}
