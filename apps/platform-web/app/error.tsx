'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/** Shown when a route throws at render time — the platform error boundary. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[platform-web] route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <h1 className="mt-5 text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-3 text-gray-500">
          An unexpected error occurred while loading this page. It&apos;s not you — it&apos;s us.
        </p>
        {error?.digest && (
          <p className="mt-2 text-xs font-mono text-gray-400">Error ID: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-lg font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow transition"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition"
          >
            Go to Homepage
          </Link>
        </div>
        <p className="mt-8 text-xs text-gray-400">
          If this keeps happening, contact <a href="mailto:support@onedexo.com" className="underline hover:text-gray-600">support@onedexo.com</a>
        </p>
      </div>
    </div>
  );
}
