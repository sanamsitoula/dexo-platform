import Link from 'next/link';
import { headers } from 'next/headers';
import { getFitnessInfo, type FitnessInfo } from '@/lib/api';

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

const VALUES = [
  { icon: '💪', title: 'Results First', desc: 'Every program is built around measurable progress — assessments, streaks and milestones keep you honest.' },
  { icon: '🤝', title: 'Community', desc: 'Train alongside people who push you further. Group classes, referrals and shared goals.' },
  { icon: '🧠', title: 'Expert Guidance', desc: 'Certified trainers design your workouts and diet plans — no guesswork, just science.' },
  { icon: '🛡️', title: 'Safe & Clean', desc: 'Well-maintained equipment, hygienic facilities and staff trained in proper form and safety.' },
];

const TEAM_PLACEHOLDERS = [
  { role: 'Head Coach', desc: 'Leads programming and trainer development.' },
  { role: 'Personal Trainers', desc: 'One-on-one coaching tailored to your goals.' },
  { role: 'Nutrition Team', desc: 'Diet plans and calorie tracking support, including local foods.' },
  { role: 'Front Desk & Support', desc: 'Memberships, bookings and anything you need day-to-day.' },
];

export default async function AboutPage() {
  const subdomain = resolveSubdomain();
  const info = await getFitnessInfo(subdomain);
  const t = info || FALLBACK;

  return (
    <div style={{ background: '#0f0f10', color: '#fff', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-extrabold" style={{ color: t.colorPrimary }}>{t.name}</Link>
        <div className="space-x-4 text-sm">
          <Link href="/about" className="opacity-100 font-semibold">About</Link>
          <Link href="/services" className="opacity-80 hover:opacity-100">Services</Link>
          <Link href="/book" className="opacity-80 hover:opacity-100">Book</Link>
          <Link href="/contact" className="opacity-80 hover:opacity-100">Contact</Link>
          <Link href="/register" className="px-4 py-2 rounded-md font-semibold text-black" style={{ background: t.colorPrimary }}>Join Now</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 py-20 max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-widest opacity-60">About us</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight">{t.name}</h1>
        <p className="mt-4 text-lg opacity-80">{t.tagline}</p>
        <p className="mt-4 opacity-70">{t.description}</p>
        {t.branchCount > 0 && (
          <p className="mt-6 text-sm opacity-60">{t.branchCount} location{t.branchCount > 1 ? 's' : ''} serving our community</p>
        )}
      </section>

      {/* Values */}
      <section className="px-4 py-14 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center">What we stand for</h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map((v) => (
            <div key={v.title} className="p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl">{v.icon}</div>
              <h3 className="mt-3 font-semibold text-lg">{v.title}</h3>
              <p className="mt-1 text-sm opacity-70">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="px-4 py-14 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center">The team behind {t.name}</h2>
        <p className="text-center opacity-70 mt-2">Meet the people who make it happen.</p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEAM_PLACEHOLDERS.map((m) => (
            <div key={m.role} className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
              <div
                className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-black"
                style={{ background: t.colorPrimary }}
              >
                {m.role.charAt(0)}
              </div>
              <h3 className="mt-4 font-semibold">{m.role}</h3>
              <p className="mt-1 text-sm opacity-70">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Location / contact strip */}
      {t.contact && (
        <section className="px-4 py-10 max-w-3xl mx-auto text-center">
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-lg">Visit us</h3>
            <p className="mt-2 text-sm opacity-80">
              {t.contact.branch}
              {t.contact.address ? ` · ${t.contact.address}` : ''}
              {t.contact.city ? `, ${t.contact.city}` : ''}
            </p>
            {t.contact.phone && <p className="mt-1 text-sm opacity-70">📞 {t.contact.phone}</p>}
            {t.contact.email && <p className="mt-1 text-sm opacity-70">✉️ {t.contact.email}</p>}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-4 py-16 text-center" style={{ background: t.colorAccent, color: '#111' }}>
        <h2 className="text-3xl font-bold">Come train with us</h2>
        <p className="mt-2 opacity-80">Your first step is a minute away.</p>
        <Link href="/register" className="mt-6 inline-block px-8 py-3 bg-black text-white rounded-md font-semibold">Join {t.name}</Link>
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
