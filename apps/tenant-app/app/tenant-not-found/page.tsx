import { headers } from 'next/headers';

/** Shown (via middleware rewrite) when the request's host doesn't resolve to
 * any tenant — no silent default anymore, this is a real error state. */
export default function TenantNotFoundPage() {
  const host = headers().get('x-attempted-host') || 'this address';
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">🏳️</div>
        <h1 className="text-xl font-bold mt-4 text-gray-900">We can&apos;t find that business</h1>
        <p className="mt-2 text-sm text-gray-600">
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{host}</code> doesn&apos;t match any
          registered tenant on this platform.
        </p>
        <div className="mt-5 text-left text-sm bg-gray-50 rounded-lg p-4 space-y-1 text-gray-600">
          <p className="font-medium text-gray-800">To open a specific business:</p>
          <p>Use its full link, e.g. <code className="text-xs">portal.&lt;business&gt;.localhost:4007</code></p>
          <p>or add <code className="text-xs">?tenant=&lt;business&gt;</code> to the URL.</p>
        </div>
      </div>
    </div>
  );
}
