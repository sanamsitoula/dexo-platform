'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { useTenantInfo } from '../../lib/tenant-info';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { info, vertical, primary } = useTenantInfo();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2';
  const ringStyle = { ['--tw-ring-color' as any]: primary };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {info?.name ? `Join ${info.name}` : vertical.registerTitle}
        </h1>
        <p className="text-gray-500 text-sm">{vertical.registerTagline}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 max-w-sm w-full mx-auto">
        <div className="grid grid-cols-2 gap-3">
          <input required placeholder="First name" value={form.firstName} onChange={set('firstName')} className="rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2" style={ringStyle} />
          <input required placeholder="Last name" value={form.lastName} onChange={set('lastName')} className="rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2" style={ringStyle} />
        </div>
        <input required type="email" placeholder="Email" value={form.email} onChange={set('email')} autoComplete="email" className={inputCls} style={ringStyle} />
        <input placeholder="Phone (optional)" value={form.phone} onChange={set('phone')} className={inputCls} style={ringStyle} />
        <input required type="password" placeholder="Password" value={form.password} onChange={set('password')} autoComplete="new-password" className={inputCls} style={ringStyle} />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={submitting}
          className="w-full rounded-lg py-2.5 text-white font-semibold disabled:opacity-60 shadow transition hover:opacity-90"
          style={{ background: primary }}>
          {submitting ? 'Creating…' : 'Create Account'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        Already a {vertical.noun}?{' '}
        <Link href="/login" className="font-semibold" style={{ color: primary }}>Sign in</Link>
      </p>
    </div>
  );
}
