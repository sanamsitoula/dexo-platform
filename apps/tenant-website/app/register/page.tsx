'use client';

import { useState } from 'react';
import Link from 'next/link';
import { registerMember } from '@/lib/api';
import { memberPortalUrl } from '@/lib/portal';

// Tenant is resolved from the host by middleware.ts, which stamps the
// `dexo_tenant` cookie. We read that (authoritative), then fall back to parsing
// the hostname (supports `*.localhost` in dev and `sub.domain.tld` in prod).
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'localhost', 'dexo']);

function resolveSubdomain(): string {
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)dexo_tenant=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    const parts = hostname.split('.');
    if (hostname.endsWith('.localhost') && parts.length >= 2 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return parts[0];
    }
    if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return parts[0];
    }
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
    // Hand off to the member portal (customer app). {slug} supports prod domains.
    const memberAppUrl = memberPortalUrl(resolveSubdomain());
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full site-card rounded-xl p-8 text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold mt-3">Welcome, {form.firstName}!</h1>
          <p className="mt-2 opacity-80">Your membership account is ready.</p>
          <div className="mt-5 text-left text-sm site-inset rounded-lg p-4 space-y-1">
            <p className="opacity-70">Next steps:</p>
            <p>1. Open the <strong>member portal</strong> below (or the Dexo Fitness mobile app).</p>
            <p>2. Log in with <strong>{form.email}</strong>.</p>
            <p>3. Complete onboarding &amp; pick your plan.</p>
          </div>
          <a href={`${memberAppUrl}/login`} className="mt-6 inline-block w-full px-6 py-3 rounded-md font-semibold site-btn">
            Open Member Portal →
          </a>
          <Link href="/" className="mt-3 block text-sm opacity-70 hover:opacity-100">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full site-card rounded-xl p-8">
        <h1 className="text-2xl font-bold text-center">Create your membership</h1>
        <p className="text-center text-sm opacity-70 mt-1">Join in under a minute.</p>
        <form onSubmit={onSubmit} className="space-y-3 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="First name" value={form.firstName} onChange={set('firstName')}
              className="rounded-md site-input px-3 py-2" />
            <input required placeholder="Last name" value={form.lastName} onChange={set('lastName')}
              className="rounded-md site-input px-3 py-2" />
          </div>
          <input required type="email" placeholder="Email" value={form.email} onChange={set('email')}
            className="w-full rounded-md site-input px-3 py-2" />
          <input placeholder="Phone (optional)" value={form.phone} onChange={set('phone')}
            className="w-full rounded-md site-input px-3 py-2" />
          <input required type="password" placeholder="Password" value={form.password} onChange={set('password')}
            className="w-full rounded-md site-input px-3 py-2" />
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button type="submit" disabled={submitting}
            className="w-full rounded-md py-2.5 font-semibold site-btn disabled:opacity-60">
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
