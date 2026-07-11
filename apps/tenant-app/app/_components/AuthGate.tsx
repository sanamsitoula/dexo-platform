'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../../lib/auth';
import { TenantInfoProvider } from '../../lib/tenant-info';

const PUBLIC_PATHS = ['/login', '/register'];

function Gate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname || '');

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && !isPublic) router.replace('/login');
    if (isAuthenticated && isPublic) router.replace('/');
  }, [isAuthenticated, loading, isPublic, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
    );
  }
  if (!isAuthenticated && !isPublic) return null;
  return <>{children}</>;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TenantInfoProvider>
        <Gate>{children}</Gate>
      </TenantInfoProvider>
    </AuthProvider>
  );
}
