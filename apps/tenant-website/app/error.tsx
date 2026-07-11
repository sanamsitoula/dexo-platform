'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/** Tenant-website error boundary — theme-aware like the 404 page. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[tenant-website] route error:', error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--site-bg, #0f0f10)', color: 'var(--site-text, #fff)' }}
    >
      <div className="max-w-md w-full text-center">
        <div
          className="mx-auto h-16 w-16 flex items-center justify-center text-3xl"
          style={{
            backgroundColor: 'var(--site-surface, rgba(255,255,255,0.05))',
            border: '1px solid var(--site-border, rgba(255,255,255,0.1))',
            borderRadius: 'var(--site-radius, 12px)',
          }}
        >
          ⚠️
        </div>
        <h1 className="mt-5 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3" style={{ color: 'var(--site-sub, rgba(255,255,255,0.7))' }}>
          This page failed to load. Please try again in a moment.
        </p>
        {error?.digest && <p className="mt-2 text-xs font-mono opacity-50">Error ID: {error.digest}</p>}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 font-semibold"
            style={{
              background: 'var(--site-primary, #E85D24)',
              color: 'var(--site-on-primary, #111)',
              borderRadius: 'var(--site-radius, 8px)',
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 font-semibold border hover:opacity-80"
            style={{ borderColor: 'var(--site-border, rgba(255,255,255,0.2))', borderRadius: 'var(--site-radius, 8px)' }}
          >
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
