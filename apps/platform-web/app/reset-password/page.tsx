'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')}/api`;

/**
 * Canonical password-reset landing page — the target of the reset link in every
 * password-reset email (FRONTEND_URL/reset-password?token=...). Token-based, so
 * it works for platform admins, tenant staff and customers alike.
 */
function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Reset failed — the link may have expired.');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md border p-8" style={{ borderColor: 'var(--dx-border, #E4E4E7)', borderRadius: 'var(--dx-radius, 10px)', background: 'var(--dx-surface-1, #fff)' }}>
        {done ? (
          <div className="text-center">
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-bold mt-4">Password updated</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--dx-text-muted, #52525B)' }}>
              You can now sign in with your new password in your usual portal.
            </p>
            <button onClick={() => router.push('/login')} className="mt-6 w-full rounded-lg py-2.5 text-white font-semibold" style={{ background: 'var(--dx-primary, #4F46E5)' }}>
              Go to sign in
            </button>
          </div>
        ) : !token ? (
          <div className="text-center">
            <div className="text-5xl">🔗</div>
            <h1 className="text-2xl font-bold mt-4">Invalid reset link</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--dx-text-muted, #52525B)' }}>
              This link is missing its token. Request a new one from the{' '}
              <a href="/forgot-password" style={{ color: 'var(--dx-primary, #4F46E5)' }}>forgot password</a> page.
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 className="text-2xl font-bold">Choose a new password</h1>
            <p className="text-sm mt-1 mb-6" style={{ color: 'var(--dx-text-muted, #52525B)' }}>Reset links expire after 1 hour.</p>
            <label className="block text-sm font-semibold mb-1.5">New password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm mb-4" style={{ borderColor: 'var(--dx-border, #E4E4E7)' }} />
            <label className="block text-sm font-semibold mb-1.5">Confirm password</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--dx-border, #E4E4E7)' }} />
            {error && <p className="text-sm mt-3" style={{ color: 'var(--dx-danger, #EF4444)' }}>{error}</p>}
            <button type="submit" disabled={busy} className="mt-5 w-full rounded-lg py-2.5 text-white font-semibold disabled:opacity-50" style={{ background: 'var(--dx-primary, #4F46E5)' }}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-gray-400">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
