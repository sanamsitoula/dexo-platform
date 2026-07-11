'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/** Member-portal error boundary. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[tenant-app] route error:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto h-14 w-14 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-500">
          This page failed to load. Try again, or head back home.
        </p>
        {error?.digest && <p className="mt-2 text-xs font-mono text-gray-400">Error ID: {error.digest}</p>}
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--brand-primary, #EA580C)' }}
          >
            Try again
          </button>
          <Link href="/" className="px-5 py-2.5 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
