'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Landing point for platform OAuth (Google etc.) — the API redirects here
 * with ?token=&refresh=&new= after the provider flow completes. Stores the
 * session the same way the email/password login page does (accessToken /
 * refreshToken / dexo_user), then continues into the app. */
function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params?.get('token');
    const refresh = params?.get('refresh');
    if (!token) {
      setError('No token was returned. Please try signing in again.');
      return;
    }
    localStorage.setItem('accessToken', token);
    if (refresh) localStorage.setItem('refreshToken', refresh);
    router.replace('/');
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
        {error ? (
          <>
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold mt-3">Sign-in failed</h1>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <a href="/login" className="mt-6 inline-block px-6 py-3 rounded-lg font-semibold text-white bg-slate-900">
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto h-10 w-10 rounded-full border-4 border-gray-200 border-t-slate-900 animate-spin" />
            <p className="mt-4 text-gray-500">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
