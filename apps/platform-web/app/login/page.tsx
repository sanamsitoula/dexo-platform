'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

const PLATFORM_ADMIN_URL = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_URL || 'http://localhost:3002';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data, error: apiError } = await authApi.login(email, password);
    if (apiError || !data) {
      setError(apiError || 'Login failed');
      setSubmitting(false);
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('dexo_user', JSON.stringify(data.user || {}));
    }
    if (data.user?.isPlatformAdmin) {
      window.location.href = `${PLATFORM_ADMIN_URL}/?token=${encodeURIComponent(data.accessToken)}`;
    } else {
      router.push('/');
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left: sign-in form ─────────────────────────────────────────── */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 py-12 bg-white">
        <div className="w-full max-w-sm mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-extrabold text-indigo-600">
            <span className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-base">D</span>
            Dexo
          </Link>

          <h1 className="mt-8 text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-gray-500">Sign in to run your business on Dexo.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@yourbusiness.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            <Link href="/forgot-password" className="block text-center text-sm text-gray-500 hover:text-gray-700">Forgot password?</Link>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have a business on Dexo yet?{' '}
            <Link href="/signup/create" className="text-indigo-600 font-medium hover:underline">
              Create your tenant
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-gray-400">
            Demo: admin@test.com / Admin@123
          </p>
          <p className="mt-6 text-center text-xs text-gray-400">
            Looking for the internal platform staff console?{' '}
            <a href={PLATFORM_ADMIN_URL} className="text-gray-500 hover:text-gray-700 underline">Platform Admin →</a>
          </p>
        </div>
      </div>

      {/* ── Right: marketing showcase ──────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center px-16 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="relative max-w-lg text-white">
          <h2 className="text-4xl font-extrabold leading-tight">
            One account.<br />Every kind of business.
          </h2>
          <p className="mt-4 text-white/80 text-lg">
            Fitness centers, restaurants, salons, e-commerce and more — Dexo gives every
            business owner a branded website, staff admin and customer app out of the box.
          </p>
          <div className="mt-10 bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
            <p className="text-lg leading-relaxed italic">
              &ldquo;We signed up, picked our template, and had our storefront live the same
              afternoon.&rdquo;
            </p>
            <p className="mt-4 text-sm text-white/70">— A Dexo tenant owner</p>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">60+</div>
              <div className="text-xs text-white/70 mt-1">Business templates</div>
            </div>
            <div>
              <div className="text-2xl font-bold">Minutes</div>
              <div className="text-xs text-white/70 mt-1">To launch</div>
            </div>
            <div>
              <div className="text-2xl font-bold">All-in-one</div>
              <div className="text-xs text-white/70 mt-1">Website + admin + app</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
