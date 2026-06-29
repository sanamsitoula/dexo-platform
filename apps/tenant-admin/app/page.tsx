'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function TenantAdminIndex() {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const slug =
      document.cookie.match(/(?:^|;\s*)dexo-tenant-slug=([^;]+)/)?.[1] ||
      localStorage.getItem('dexo-tenant-slug') ||
      'vrfitness';
    setTenantSlug(slug);
    router.replace(`/dashboard`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-pulse text-gray-500">Loading tenant portal...</div>
        <div className="mt-2 text-xs text-gray-400">tenant: {tenantSlug || 'detecting...'}</div>
      </div>
    </div>
  );
}
