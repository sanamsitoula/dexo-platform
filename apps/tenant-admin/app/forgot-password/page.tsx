'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        {sent ? (
          <div className="text-center">
            <div className="text-5xl">📬</div>
            <h1 className="text-2xl font-bold mt-4 text-gray-900">Check your email</h1>
            <p className="text-sm text-gray-500 mt-2">
              If an account exists for <b>{email}</b>, a reset link is on its way (expires in 1 hour).
            </p>
            <Link href="/login" className="inline-block mt-6 text-sm font-semibold text-indigo-600">← Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">We&apos;ll email you a link to reset it.</p>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" />
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <button type="submit" disabled={busy || !email}
              className="mt-5 w-full rounded-lg py-2.5 text-white font-semibold bg-gray-900 hover:bg-gray-800 disabled:opacity-50">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <Link href="/login" className="block text-center mt-4 text-sm font-semibold text-indigo-600">← Back to sign in</Link>
          </form>
        )}
      </div>
    </div>
  );
}
