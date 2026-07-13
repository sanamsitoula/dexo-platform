'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tenantApi } from '../../lib/api';
import { resolveTenantAdminSubdomain } from '../../lib/subdomain';
import { memberPortalUrl, tenantWebsiteUrl } from '../../lib/portal';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');

interface TenantBrand {
  name: string;
  logo: string | null;
  colorPrimary: string;
  colorAccent: string;
  domainLabel: string | null;
}

function humanizeDomainCode(code?: string | null): string | null {
  if (!code) return null;
  return code.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [brand, setBrand] = useState<TenantBrand | null>(null);

  const tenantSlug = resolveTenantAdminSubdomain();

  useEffect(() => {
    fetch(`${API_HOST}/api/tenants/subdomain/${tenantSlug}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => {
        if (!t) return;
        const b = (t.settings as any)?.branding || {};
        setBrand({
          name: t.name || tenantSlug,
          logo: b.logo || null,
          colorPrimary: b.colorPrimary || '#4F46E5',
          colorAccent: b.colorAccent || '#818CF8',
          domainLabel: humanizeDomainCode(t.domains?.[0]?.domain?.code),
        });
      })
      .catch(() => {});
  }, [tenantSlug]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Resolved from the "admin.<tenant>.<domain>" host we're actually being
      // visited on and sent to the backend so login is scoped to THIS
      // tenant — previously omitted entirely, which let any valid user from
      // any tenant log into any other tenant's admin panel.
      const data = await tenantApi.login(tenantSlug, email, password);
      const role = data?.user?.role || data?.user?.userRoles?.[0]?.role?.code || '';

      // Customer/member accounts authenticate through the same /auth/login
      // endpoint as staff, but must never get into the staff admin — they
      // belong in the member portal (tenant-app), not here. Send them there
      // directly rather than just showing an error and leaving them stuck.
      const CUSTOMER_ROLES = new Set(['MEMBER', 'CUSTOMER', 'GUEST']);
      if (CUSTOMER_ROLES.has(role.toUpperCase())) {
        setError('This is a customer account — redirecting you to the member sign-in…');
        setRedirecting(true);
        const memberLoginUrl = `${memberPortalUrl(tenantSlug)}/login`;
        setTimeout(() => { window.location.href = memberLoginUrl; }, 1500);
        return;
      }
      if (!role) {
        setError('Your account has no staff role assigned. Contact your business owner.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.accessToken);
      // Subdomain-scoped key that lib/api.ts reads first (multi-tenant safe).
      localStorage.setItem(`tenant-token-${tenantSlug}`, data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      document.cookie = `dexo-tenant-slug=${tenantSlug}; path=/; max-age=86400`;
      localStorage.setItem('dexo-tenant-slug', tenantSlug);
      const dest = ['OWNER', 'ADMIN'].includes(role) ? '/dashboard' : '/staff/dashboard';
      router.push(dest);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const brandName = brand?.name || tenantSlug;
  const primary = brand?.colorPrimary || '#4F46E5';
  const accent = brand?.colorAccent || '#818CF8';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left 40%: sign-in form ─────────────────────────────────────── */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-6 sm:px-12 py-12 bg-white">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center gap-3 mb-8">
            {brand?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt={brandName} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: primary }}
              >
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-bold text-gray-900 leading-tight">{brandName}</div>
              <div className="text-xs text-gray-400">Staff Admin</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">Manage {brandName} from your staff dashboard.</p>

          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as any]: primary }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as any]: primary }}
              />
            </div>
            {error && (
              <div className={`text-sm ${redirecting ? 'text-blue-600' : 'text-red-600'}`}>{error}</div>
            )}
            <button
              type="submit"
              disabled={loading || redirecting}
              className="w-full text-white rounded-md py-2.5 font-medium disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: primary }}
            >
              {redirecting ? 'Redirecting…' : loading ? 'Signing in...' : 'Sign In'}
            </button>
            <a href="/forgot-password" className="block text-center text-sm text-gray-500 hover:text-gray-700">Forgot password?</a>
          </form>

          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col gap-2 text-sm">
            <a href={tenantWebsiteUrl(tenantSlug)} className="text-gray-500 hover:text-gray-700">
              ← Back to {brandName} website
            </a>
            <a href={`${memberPortalUrl(tenantSlug)}/login`} className="text-gray-500 hover:text-gray-700">
              ← Are you a customer? Go to the member app
            </a>
          </div>
        </div>
      </div>

      {/* ── Right 60%: tenant showcase ─────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[60%] relative overflow-hidden items-center justify-center px-16"
        style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="relative max-w-lg text-white">
          {brand?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logo} alt={brandName} className="w-16 h-16 rounded-2xl object-cover shadow-xl mb-8" />
          )}
          <h2 className="text-4xl font-extrabold leading-tight">
            Run {brandName}<br />from one place.
          </h2>
          {brand?.domainLabel && (
            <p className="mt-4 text-white/80 text-lg">
              Purpose-built for {brand.domainLabel.toLowerCase()} businesses — members, bookings, billing and
              reporting, all in your staff dashboard.
            </p>
          )}
          <div className="mt-10 bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
            <p className="text-lg leading-relaxed italic">
              &ldquo;Everything my team needs to run {brandName} day-to-day — attendance, billing, and members —
              lives right here.&rdquo;
            </p>
            <p className="mt-4 text-sm text-white/70">— {brandName} team</p>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-xs text-white/70 mt-1">Dashboard access</div>
            </div>
            <div>
              <div className="text-2xl font-bold">Real-time</div>
              <div className="text-xs text-white/70 mt-1">Reporting</div>
            </div>
            <div>
              <div className="text-2xl font-bold">Secure</div>
              <div className="text-xs text-white/70 mt-1">Role-based access</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
