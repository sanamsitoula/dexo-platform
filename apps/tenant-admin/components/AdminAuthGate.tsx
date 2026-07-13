'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const CUSTOMER_ROLES = new Set(['MEMBER', 'CUSTOMER', 'GUEST']);

/** Guards every (admin) and (staff) page: requires a logged-in STAFF account.
 * A stale customer/member token (or none at all) is rejected here even if it
 * somehow slipped past the login-time check in app/login/page.tsx — e.g. a
 * session that predates that fix. */
export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    if (!token || !userRaw) {
      router.replace('/login');
      return;
    }
    let role = '';
    try {
      const user = JSON.parse(userRaw);
      role = (user?.role || user?.userRoles?.[0]?.role?.code || '').toUpperCase();
    } catch { /* corrupt cache — treat as unauthenticated */ }

    if (!role || CUSTOMER_ROLES.has(role)) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      router.replace('/login');
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Checking access…</div>;
  }
  return <>{children}</>;
}
