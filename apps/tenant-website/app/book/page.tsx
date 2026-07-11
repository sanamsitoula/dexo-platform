import Link from 'next/link';
import { headers } from 'next/headers';
import { getFitnessInfo, getFitnessPlans, type FitnessInfo } from '@/lib/api';
import BookingForm from './BookingForm';

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
  const [info, plans] = await Promise.all([getFitnessInfo(subdomain), getFitnessPlans(subdomain)]);
  const t = info || FALLBACK;

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
    <div style={{ background: '#0f0f10', color: '#fff', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-extrabold" style={{ color: t.colorPrimary }}>{t.name}</Link>
        <div className="space-x-4 text-sm">
          <Link href="/about" className="opacity-80 hover:opacity-100">About</Link>
          <Link href="/services" className="opacity-80 hover:opacity-100">Services</Link>
          <Link href="/book" className="opacity-100 font-semibold">Book</Link>
          <Link href="/contact" className="opacity-80 hover:opacity-100">Contact</Link>
          <Link href="/register" className="px-4 py-2 rounded-md font-semibold text-black" style={{ background: t.colorPrimary }}>Join Now</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 py-14 max-w-2xl mx-auto">
        <p className="text-sm uppercase tracking-widest opacity-60">Booking</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight">Book a session at {t.name}</h1>
        <p className="mt-3 opacity-70">
          Pick a class or service and a preferred time — our team will confirm your booking
          by phone or email, usually within a few hours.
        </p>
      </section>

      {/* Booking form */}
      <section className="px-4 pb-20 max-w-xl mx-auto">
        <BookingForm
          subdomain={subdomain}
          tenantName={t.name}
          accent={t.colorPrimary}
          services={services}
          preselected={preselected}
        />
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
