import Link from 'next/link';

/** Member-portal 404 — uses the tenant's brand color set by the root layout. */
export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <p
          className="text-[6rem] font-black leading-none select-none"
          style={{ color: 'var(--brand-primary, #EA580C)' }}
        >
          404
        </p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          This page doesn&apos;t exist in your member portal.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--brand-primary, #EA580C)' }}
          >
            Back to Home
          </Link>
          <Link href="/account" className="px-5 py-2.5 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition">
            My Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
