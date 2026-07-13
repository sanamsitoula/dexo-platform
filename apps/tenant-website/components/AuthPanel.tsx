'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { registerMember, loginCustomer } from '@/lib/api';
import { memberPortalUrl } from '@/lib/portal';
import TenantSocialLoginButtons from './TenantSocialLoginButtons';

type Tab = 'login' | 'register';

interface Props {
  subdomain: string;
  tenantId: string;
  tenantName: string;
  logoUrl: string | null;
  initialTab: Tab;
}

/** Combined login/register card for the tenant public website — one page,
 * tab-switchable, branded with the tenant's own name/logo/theme (the
 * `site-*` CSS vars set globally by the theme provider in layout.tsx), with
 * email/password plus Google/Facebook via the tenant's own OAuth config. */
export default function AuthPanel({ subdomain, tenantId, tenantName, logoUrl, initialTab }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [doneName, setDoneName] = useState('');

  const [registerForm, setRegisterForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const setR = (k: keyof typeof registerForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRegisterForm((f) => ({ ...f, [k]: e.target.value }));
  const setL = (k: keyof typeof loginForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setLoginForm((f) => ({ ...f, [k]: e.target.value }));

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(registerForm.password)) {
      setError('Password must be 8+ characters with an uppercase, lowercase and a number.');
      return;
    }
    setSubmitting(true);
    const res = await registerMember({ subdomain, ...registerForm });
    setSubmitting(false);
    if (!res.ok) { setError(res.error); return; }
    setDoneName(registerForm.firstName);
    setDone(true);
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await loginCustomer(subdomain, loginForm.email, loginForm.password);
    setSubmitting(false);
    if (!res.ok) { setError(res.error); return; }
    setDoneName('');
    setDone(true);
  }

  const memberAppUrl = memberPortalUrl(subdomain);

  if (done) {
    return (
      <div className="max-w-md w-full site-card rounded-xl p-8 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold mt-3">{doneName ? `Welcome, ${doneName}!` : 'Welcome back!'}</h1>
        <p className="mt-2 opacity-80">
          {doneName ? 'Your membership account is ready.' : `You're signed in to ${tenantName}.`}
        </p>
        <div className="mt-5 text-left text-sm site-inset rounded-lg p-4 space-y-1">
          <p className="opacity-70">Next step:</p>
          <p>Open the <strong>member portal</strong> (or the {tenantName} mobile app) to continue.</p>
        </div>
        <a href={`${memberAppUrl}/login`} className="mt-6 inline-block w-full px-6 py-3 rounded-md font-semibold site-btn">
          Open Member Portal →
        </a>
        <Link href="/" className="mt-3 block text-sm opacity-70 hover:opacity-100">← Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full site-card rounded-xl p-8">
      <div className="text-center">
        {logoUrl && /^(https?:\/\/|\/)/.test(logoUrl) ? (
          <Image src={logoUrl} alt={tenantName} width={56} height={56} className="mx-auto rounded-lg object-cover" />
        ) : (
          <div
            className="mx-auto w-14 h-14 rounded-lg flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: 'var(--site-primary)', color: 'var(--site-on-primary, #fff)' }}
          >
            {/* Some tenants store an emoji glyph (e.g. "💪") as a logo
              placeholder instead of a real image URL — next/image requires
              a URL and throws otherwise, so show the emoji itself here. */}
            {logoUrl || tenantName.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-bold mt-3">{tab === 'register' ? `Join ${tenantName}` : `Welcome back to ${tenantName}`}</h1>
        <p className="text-sm opacity-70 mt-1">
          {tab === 'register' ? 'Create your account in under a minute.' : 'Sign in to manage your membership.'}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex mt-6 rounded-lg overflow-hidden site-inset p-1">
        <button
          type="button"
          onClick={() => { setTab('login'); setError(null); }}
          className="flex-1 py-2 rounded-md text-sm font-semibold transition-all"
          style={tab === 'login' ? { backgroundColor: 'var(--site-primary)', color: 'var(--site-on-primary, #fff)' } : undefined}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { setTab('register'); setError(null); }}
          className="flex-1 py-2 rounded-md text-sm font-semibold transition-all"
          style={tab === 'register' ? { backgroundColor: 'var(--site-primary)', color: 'var(--site-on-primary, #fff)' } : undefined}
        >
          Create account
        </button>
      </div>

      {tab === 'register' ? (
        <form onSubmit={onRegister} className="space-y-3 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="First name" value={registerForm.firstName} onChange={setR('firstName')}
              className="rounded-md site-input px-3 py-2" />
            <input required placeholder="Last name" value={registerForm.lastName} onChange={setR('lastName')}
              className="rounded-md site-input px-3 py-2" />
          </div>
          <input required type="email" placeholder="Email" value={registerForm.email} onChange={setR('email')}
            className="w-full rounded-md site-input px-3 py-2" />
          <input placeholder="Phone (optional)" value={registerForm.phone} onChange={setR('phone')}
            className="w-full rounded-md site-input px-3 py-2" />
          <input required type="password" placeholder="Password" value={registerForm.password} onChange={setR('password')}
            className="w-full rounded-md site-input px-3 py-2" />
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button type="submit" disabled={submitting}
            className="w-full rounded-md py-2.5 font-semibold site-btn disabled:opacity-60">
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      ) : (
        <form onSubmit={onLogin} className="space-y-3 mt-6">
          <input required type="email" placeholder="Email" value={loginForm.email} onChange={setL('email')}
            className="w-full rounded-md site-input px-3 py-2" />
          <input required type="password" placeholder="Password" value={loginForm.password} onChange={setL('password')}
            className="w-full rounded-md site-input px-3 py-2" />
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button type="submit" disabled={submitting}
            className="w-full rounded-md py-2.5 font-semibold site-btn disabled:opacity-60">
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      )}

      <div className="mt-5">
        <TenantSocialLoginButtons tenantId={tenantId} />
      </div>

      <p className="text-center text-xs opacity-60 mt-5">
        {tab === 'register' ? 'Already have an account? ' : "Don't have an account yet? "}
        <button type="button" onClick={() => { setTab(tab === 'register' ? 'login' : 'register'); setError(null); }}
          className="underline hover:opacity-80" style={{ color: 'var(--site-primary)' }}>
          {tab === 'register' ? 'Sign in' : 'Create one'}
        </button>
      </p>
      <Link href="/" className="block text-center text-sm opacity-70 hover:opacity-100 mt-3">← Back to home</Link>
    </div>
  );
}
