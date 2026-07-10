'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { publicApi } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [info, setInfo] = useState<any>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { publicApi.info().then((r) => setInfo(r.data)); }, []);
  const primary = info?.colorPrimary || '#E85D24';
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      setError('Password must be 8+ chars with an uppercase, lowercase and a number.');
      return;
    }
    setSubmitting(true);
    const res = await register(form);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    router.replace('/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Join {info?.name || 'us'}</h1>
        <p className="text-gray-500 text-sm">Create your membership account</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input required placeholder="First name" value={form.firstName} onChange={set('firstName')} className="rounded-lg border border-gray-300 px-3 py-2.5" />
          <input required placeholder="Last name" value={form.lastName} onChange={set('lastName')} className="rounded-lg border border-gray-300 px-3 py-2.5" />
        </div>
        <input required type="email" placeholder="Email" value={form.email} onChange={set('email')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5" />
        <input placeholder="Phone (optional)" value={form.phone} onChange={set('phone')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5" />
        <input required type="password" placeholder="Password" value={form.password} onChange={set('password')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5" />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={submitting} className="w-full rounded-lg py-2.5 text-white font-semibold disabled:opacity-60" style={{ background: primary }}>
          {submitting ? 'Creating…' : 'Create Account'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        Already a member?{' '}
        <Link href="/login" className="font-semibold" style={{ color: primary }}>Sign in</Link>
      </p>
    </div>
  );
}
