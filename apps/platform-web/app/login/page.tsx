'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

const PLATFORM_ADMIN_URL = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_URL || 'http://platform-admin.onedexo.com';

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-extrabold text-indigo-600">Dexo Platform</Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Sign in</h1>
          <p className="mt-2 text-gray-500">Access your platform dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
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
              placeholder="admin@test.com"
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
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link href="/signup/create" className="text-indigo-600 font-medium hover:underline">
            Create your tenant
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-gray-400">
          Demo: admin@test.com / Admin@123
        </p>
      </div>
    </div>
  );
}
