'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')}/api`;

/**
 * Canonical email-verification landing page — the target of the verify link
 * in every signup verification email (FRONTEND_URL/verify-email?token=...).
 * Token-based, so it works for platform admins, tenant staff and customers
 * alike, same pattern as /reset-password. Verifies automatically on load —
 * no form needed, just a token to redeem.
 */
function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params?.get('token') || '';
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    fetch(`${API}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Verification failed — the link may have expired.');
        setMessage(data.message || 'Email verified successfully.');
        setStatus('success');
      })
      .catch((err) => {
        setMessage(err.message);
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md border p-8 text-center" style={{ borderColor: 'var(--dx-border, #E4E4E7)', borderRadius: 'var(--dx-radius, 10px)', background: 'var(--dx-surface-1, #fff)' }}>
        {!token ? (
          <>
            <div className="text-5xl">🔗</div>
            <h1 className="text-2xl font-bold mt-4">Invalid verification link</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--dx-text-muted, #52525B)' }}>
              This link is missing its token. Try signing in — you can request a new verification email from there.
            </p>
          </>
        ) : status === 'pending' ? (
          <>
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--dx-primary, #4F46E5)', borderTopColor: 'transparent' }} />
            <h1 className="text-2xl font-bold mt-4">Verifying your email…</h1>
          </>
        ) : status === 'success' ? (
          <>
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-bold mt-4">Email verified</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--dx-text-muted, #52525B)' }}>{message}</p>
            <a href="/login" className="mt-6 inline-block w-full rounded-lg py-2.5 text-white font-semibold" style={{ background: 'var(--dx-primary, #4F46E5)' }}>
              Go to sign in
            </a>
          </>
        ) : (
          <>
            <div className="text-5xl">⚠️</div>
            <h1 className="text-2xl font-bold mt-4">Verification failed</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--dx-danger, #EF4444)' }}>{message}</p>
            <p className="text-sm mt-4" style={{ color: 'var(--dx-text-muted, #52525B)' }}>
              Links expire after 24 hours. Sign in and request a new one if this link is stale.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-gray-400">Loading…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
