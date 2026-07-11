import Link from 'next/link'

/** Platform-admin 404 — shown when no admin route matches. */
export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p
          className="text-[6rem] font-black leading-none bg-clip-text text-transparent select-none"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-accent, #10b981))' }}
        >
          404
        </p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          This admin page doesn&apos;t exist or you may not have access to it.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/" className="px-5 py-2.5 rounded-lg font-semibold text-white bg-slate-900 hover:bg-slate-800 transition">
            Back to Home
          </Link>
          <Link href="/dashboard" className="px-5 py-2.5 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
