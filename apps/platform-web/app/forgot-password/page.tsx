'use client';

import { useState } from 'react';

const API = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')}/api`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Something went wrong.');
      }
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md border p-8" style={{ borderColor: 'var(--dx-border, #E4E4E7)', borderRadius: 'var(--dx-radius, 10px)', background: 'var(--dx-surface-1, #fff)' }}>
        {sent ? (
          <div className="text-center">
            <div className="text-5xl">📬</div>
            <h1 className="text-2xl font-bold mt-4">Check your email</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--dx-text-muted, #52525B)' }}>
              If an account exists for <b>{email}</b>, a reset link is on its way.
              The link expires in 1 hour. (Local dev: check MailHog at <a href="http://localhost:8025" className="underline">localhost:8025</a>.)
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 className="text-2xl font-bold">Forgot your password?</h1>
            <p className="text-sm mt-1 mb-6" style={{ color: 'var(--dx-text-muted, #52525B)' }}>
              Enter the email you use to sign in — platform, staff or customer account — and
              we&apos;ll send you a reset link.
            </p>
            <label className="block text-sm font-semibold mb-1.5">Email address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--dx-border, #E4E4E7)' }} />
            {error && <p className="text-sm mt-3" style={{ color: 'var(--dx-danger, #EF4444)' }}>{error}</p>}
            <button type="submit" disabled={busy || !email} className="mt-5 w-full rounded-lg py-2.5 text-white font-semibold disabled:opacity-50" style={{ background: 'var(--dx-primary, #4F46E5)' }}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
