'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { publicApi } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [info, setInfo] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { publicApi.info().then((r) => setInfo(r.data)); }, []);
  const primary = info?.colorPrimary || '#E85D24';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    router.replace('/');
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold" style={{ background: primary }}>
          {(info?.name || 'F').charAt(0)}
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{info?.name || 'Fitness App'}</h1>
        <p className="text-gray-500 text-sm">{info?.tagline || 'Sign in to your membership'}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5" />
        <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5" />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={submitting}
          className="w-full rounded-lg py-2.5 text-white font-semibold disabled:opacity-60" style={{ background: primary }}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        New here?{' '}
        <Link href="/register" className="font-semibold" style={{ color: primary }}>Create an account</Link>
      </p>
    </div>
  );
}
