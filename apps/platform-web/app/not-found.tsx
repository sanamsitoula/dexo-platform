import Link from 'next/link';

/** Shown whenever no route matches — the platform 404 page. */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4">
      <div className="max-w-md w-full text-center">
        <p
          className="text-[7rem] sm:text-[9rem] font-black leading-none bg-clip-text text-transparent select-none"
          style={{ backgroundImage: 'linear-gradient(135deg, #4f46e5, #38bdf8)' }}
        >
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-3 text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist, was moved, or is temporarily unavailable.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow transition"
          >
            Go to Homepage
          </Link>
          <Link
            href="/signup/create"
            className="px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition"
          >
            Create your platform
          </Link>
        </div>
        <p className="mt-8 text-xs text-gray-400">
          Need help? <a href="mailto:support@onedexo.com" className="underline hover:text-gray-600">support@onedexo.com</a>
        </p>
      </div>
    </div>
  );
}
