'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { useTenantInfo } from '../../lib/tenant-info';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { info, vertical, primary } = useTenantInfo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    router.replace('/');
  }

  const logo = info?.branding?.logo;

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-8">
        {logo && String(logo).startsWith('http') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={info?.name || 'Logo'} className="w-16 h-16 rounded-2xl mx-auto object-contain bg-gray-50" />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg"
            style={{ background: `linear-gradient(135deg, ${primary}, var(--brand-accent, #F59E0B))` }}
          >
            {logo && !String(logo).startsWith('http') ? logo : (info?.name || 'D').charAt(0)}
          </div>
        )}
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{info?.name || 'Welcome back'}</h1>
        <p className="text-gray-500 text-sm">{vertical.loginTagline}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 max-w-sm w-full mx-auto">
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as any]: primary }} />
        <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as any]: primary }} />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={submitting}
          className="w-full rounded-lg py-2.5 text-white font-semibold disabled:opacity-60 shadow transition hover:opacity-90"
          style={{ background: primary }}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
        <Link href="/forgot-password" className="block text-center text-sm text-gray-500 hover:text-gray-700">Forgot password?</Link>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        New {vertical.noun}?{' '}
        <Link href="/register" className="font-semibold" style={{ color: primary }}>Create an account</Link>
      </p>
    </div>
  );
}
