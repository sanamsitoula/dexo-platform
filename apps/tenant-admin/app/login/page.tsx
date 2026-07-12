'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tenantApi } from '../../lib/api';
import { resolveTenantAdminSubdomain } from '../../lib/subdomain';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Resolved from the "admin.<tenant>.<domain>" host we're actually being
      // visited on and sent to the backend so login is scoped to THIS
      // tenant — previously omitted entirely, which let any valid user from
      // any tenant log into any other tenant's admin panel.
      const tenantSlug = resolveTenantAdminSubdomain();
      const data = await tenantApi.login(tenantSlug, email, password);
      const role = data?.user?.role || data?.user?.userRoles?.[0]?.role?.code || 'OWNER';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tenant Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to manage your tenant</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded-md py-2 font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <a href="/forgot-password" className="block text-center text-sm text-gray-500 hover:text-gray-700">Forgot password?</a>
        </form>
      </div>
    </div>
  );
}
