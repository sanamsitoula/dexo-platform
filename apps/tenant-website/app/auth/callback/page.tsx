'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { setToken } from '@/lib/api';
import { memberPortalUrl } from '@/lib/portal';

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'localhost', 'dexo']);

function resolveSubdomain(): string {
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)dexo_tenant=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    const parts = hostname.split('.');
    if (hostname.endsWith('.localhost') && parts.length >= 2 && !RESERVED_SUBDOMAINS.has(parts[0])) return parts[0];
    if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) return parts[0];
  }
  return process.env.NEXT_PUBLIC_DEV_TENANT || '';
}

/** Landing point for the tenant OAuth flow — the API redirects here with
 * ?token=&refresh=&new= after Google/Facebook sign-in completes. */
export default function AuthCallbackPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'working' | 'error'>('working');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }
    setToken(token);
    setStatus('working');
  }, [params]);

  const isNew = params.get('new') === 'true';
  const memberAppUrl = memberPortalUrl(resolveSubdomain());

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full site-card rounded-xl p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold mt-3">Sign-in failed</h1>
          <p className="mt-2 text-sm opacity-70">No token was returned. Please try again.</p>
          <Link href="/login" className="mt-6 inline-block w-full px-6 py-3 rounded-md font-semibold site-btn">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full site-card rounded-xl p-8 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold mt-3">{isNew ? 'Account created!' : "You're signed in!"}</h1>
        <p className="mt-2 opacity-80">Continue to the member portal to finish setting up.</p>
        <a href={`${memberAppUrl}/login`} className="mt-6 inline-block w-full px-6 py-3 rounded-md font-semibold site-btn">
          Open Member Portal →
        </a>
        <Link href="/" className="mt-3 block text-sm opacity-70 hover:opacity-100">← Back to Home</Link>
      </div>
    </div>
  );
}
