'use client';

import { useState } from 'react';
import Link from 'next/link';
import { registerMember } from '@/lib/api';

// Dev resolves to the env tenant; production sets x-tenant-slug via proxy and
// the host subdomain matches. We read it from the hostname when available.
function resolveSubdomain(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const parts = host.split('.');
    // e.g. vrfitness.dexo.app → "vrfitness"; localhost → fallback
    if (parts.length > 2 && parts[0] !== 'www') return parts[0];
  }
  return process.env.NEXT_PUBLIC_DEV_TENANT || 'vrfitness';
}

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side password rule mirrors the API (upper, lower, digit, 8+).
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      setError('Password must be 8+ characters with an uppercase, lowercase and a number.');
      return;
    }

    setSubmitting(true);
    const res = await registerMember({ subdomain: resolveSubdomain(), ...form });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold mt-3">Welcome, {form.firstName}!</h1>
          <p className="mt-2 opacity-80">Your membership account is ready.</p>
          <div className="mt-5 text-left text-sm bg-black/30 rounded-lg p-4 space-y-1">
            <p className="opacity-70">Next steps:</p>
            <p>1. Download the <strong>Dexo Fitness</strong> mobile app.</p>
            <p>2. Log in with <strong>{form.email}</strong>.</p>
            <p>3. Complete onboarding &amp; pick your plan.</p>
          </div>
          <Link href="/" className="mt-6 inline-block px-6 py-3 rounded-md font-semibold bg-orange-500 text-black">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4 py-10">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-center">Create your membership</h1>
        <p className="text-center text-sm opacity-70 mt-1">Join in under a minute.</p>
        <form onSubmit={onSubmit} className="space-y-3 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="First name" value={form.firstName} onChange={set('firstName')}
              className="rounded-md bg-black/30 border border-white/15 px-3 py-2" />
            <input required placeholder="Last name" value={form.lastName} onChange={set('lastName')}
              className="rounded-md bg-black/30 border border-white/15 px-3 py-2" />
          </div>
          <input required type="email" placeholder="Email" value={form.email} onChange={set('email')}
            className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2" />
          <input placeholder="Phone (optional)" value={form.phone} onChange={set('phone')}
            className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2" />
          <input required type="password" placeholder="Password" value={form.password} onChange={set('password')}
            className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2" />
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button type="submit" disabled={submitting}
            className="w-full rounded-md py-2.5 font-semibold text-black bg-orange-500 disabled:opacity-60">
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-xs opacity-60 mt-4">
          Already a member? Log in from the mobile app.
        </p>
        <Link href="/" className="block text-center text-sm opacity-70 hover:opacity-100 mt-3">← Back to home</Link>
      </div>
    </div>
  );
}
