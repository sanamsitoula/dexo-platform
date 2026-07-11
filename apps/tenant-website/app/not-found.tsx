import Link from 'next/link';

/**
 * Tenant-website 404 — inherits the tenant's template theme via the CSS
 * variables set on <body> by the root layout, so even the error page matches
 * the business's selected design.
 */
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--site-bg, #0f0f10)', color: 'var(--site-text, #fff)' }}
    >
      <div className="max-w-md w-full text-center">
        <p
          className="text-[7rem] font-black leading-none bg-clip-text text-transparent select-none"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--site-primary, #E85D24), var(--site-accent, #F2A623))' }}
        >
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <p className="mt-3" style={{ color: 'var(--site-sub, rgba(255,255,255,0.7))' }}>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 font-semibold"
            style={{
              background: 'var(--site-primary, #E85D24)',
              color: 'var(--site-on-primary, #111)',
              borderRadius: 'var(--site-radius, 8px)',
            }}
          >
            Back to Homepage
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 font-semibold border hover:opacity-80"
            style={{ borderColor: 'var(--site-border, rgba(255,255,255,0.2))', borderRadius: 'var(--site-radius, 8px)' }}
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
