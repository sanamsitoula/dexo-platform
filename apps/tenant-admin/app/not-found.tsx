import Link from 'next/link'

/** Tenant-admin 404 — shown when no admin console route matches. */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <p
          className="text-[6rem] font-black leading-none bg-clip-text text-transparent select-none"
          style={{ backgroundImage: 'linear-gradient(135deg, #0f172a, #64748b)' }}
        >
          404
        </p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          This page doesn&apos;t exist in your admin console, or your role doesn&apos;t have access to it.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/" className="px-5 py-2.5 rounded-lg font-semibold text-white bg-slate-900 hover:bg-slate-800 transition">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
