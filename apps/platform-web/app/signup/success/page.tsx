'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';

export default function SignupSuccess() {
  const params = useSearchParams();
  const sub = params?.get('sub') || 'your-tenant';
  const tenantId = params?.get('tenant') || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-50 px-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-lg p-8 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
          🎉
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Your tenant is live!</h1>
        <p className="mt-2 text-gray-600">
          Your subdomain <span className="font-mono font-semibold">{sub}.{PLATFORM_DOMAIN}</span> is now active.
        </p>
        <div className="mt-6 space-y-2">
          {/* tenant-admin is a single global portal — it resolves the tenant from the
              login response, not the URL, so there's no per-tenant admin subdomain. */}
          <Link href={`http://admin.${PLATFORM_DOMAIN}/login`} className="block w-full px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800">
            Go to Admin Console
          </Link>
          <Link href={`http://${sub}.${PLATFORM_DOMAIN}`} className="block w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            View Public Site
          </Link>
        </div>
        {tenantId && <div className="mt-4 text-xs text-gray-400">tenant: {tenantId}</div>}
      </div>
    </div>
  );
}
