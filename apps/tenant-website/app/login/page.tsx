import Link from 'next/link';
import { headers } from 'next/headers';
import { getFitnessInfo, type FitnessInfo } from '@/lib/api';
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
  const info = await getFitnessInfo(subdomain);
  const t = info || FALLBACK;
  // Customer app (member portal) URL — {slug} placeholder supports prod domains.
  const memberAppUrl = (process.env.NEXT_PUBLIC_TENANT_APP_URL || 'http://{slug}.localhost:4007')
    .replace('{slug}', subdomain);
  const loginUrl = `${memberAppUrl}/login`;

  return (
    <div style={{ background: '#0f0f10', color: '#fff', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-extrabold" style={{ color: t.colorPrimary }}>{t.name}</Link>
        <div className="space-x-4 text-sm">
          <Link href="/#plans" className="opacity-80 hover:opacity-100">Plans</Link>
          <Link href="/contact" className="opacity-80 hover:opacity-100">Contact</Link>
          <Link href="/register" className="px-4 py-2 rounded-md font-semibold text-black" style={{ background: t.colorPrimary }}>Join Now</Link>
        </div>
      </nav>

      {/* Redirect card */}
      <section className="px-4 py-24 max-w-md mx-auto text-center">
        <div className="p-8 rounded-xl bg-white/5 border border-white/10">
          <div className="text-4xl">🔐</div>
          <h1 className="mt-4 text-3xl font-extrabold">Member Login</h1>
          <p className="mt-3 text-sm opacity-70">
            Members sign in through the {t.name} member portal, where you can book classes,
            track workouts, manage payments and check in with your QR code.
          </p>
          <LoginRedirect loginUrl={loginUrl} accent={t.colorPrimary} />
          <p className="mt-6 text-sm opacity-60">
            Not a member yet?{' '}
            <Link href="/register" className="underline hover:text-white" style={{ color: t.colorPrimary }}>Join now</Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-sm opacity-60">
        <div className="space-x-3 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/register" className="hover:text-white">Join</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </div>
        <div>© {new Date().getFullYear()} {t.name} · Powered by Dexo</div>
      </footer>
    </div>
  );
}
