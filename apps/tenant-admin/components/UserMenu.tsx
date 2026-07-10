'use client';

import { useEffect, useRef, useState } from 'react';
import { tenantApi } from '@/lib/api';

/**
 * Profile dropdown for the tenant portals (admin + staff): who am I, which
 * tenant/business am I in, my roles — and logout. Self-contained (fetches
 * /auth/profile + tenant itself), so it can sit in server-component layouts.
 */
export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);

  const subdomain =
    (typeof window !== 'undefined' && localStorage.getItem('dexo-tenant-slug')) || 'vrfitness';

  useEffect(() => {
    (async () => {
      const [p, t] = await Promise.all([
        tenantApi.getProfile(subdomain),
        tenantApi.getBySubdomain(subdomain),
      ]);
      if (p.data) setUser(p.data);
      if (t.data) setTenant(t.data);
    })();
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    ['token', 'refreshToken', 'user', `tenant-token-${subdomain}`, `tenant-user-${subdomain}`].forEach((k) =>
      localStorage.removeItem(k),
    );
    window.location.href = '/login';
  }

  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : '…';
  const roles: string[] =
    user?.roles ??
    (user?.userRoles ?? []).map((r: any) => r?.role?.name ?? r?.role?.code).filter(Boolean);
  const initial = (user?.firstName || user?.email || 'U').charAt(0).toUpperCase();
  const domainCode = tenant?.domainCode || (tenant?.settings as any)?.domainCode;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-gray-100">
        <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">{initial}</span>
        <span className="text-sm font-semibold text-gray-800 hidden sm:block">{name}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">{initial}</span>
              <div className="min-w-0">
                <div className="font-bold text-gray-900 truncate">{name}</div>
                <div className="text-xs text-gray-500 truncate">{user?.email}</div>
              </div>
            </div>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {roles.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">{r}</span>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-b border-gray-100 text-sm">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Business</div>
            <div className="font-semibold text-gray-900">{tenant?.name ?? subdomain}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {subdomain}.dexo.com{domainCode ? ` · ${String(domainCode).replace(/_/g, ' ').toLowerCase()}` : ''}
            </div>
            {tenant?.status && <div className="text-xs text-gray-400 mt-0.5">status: {tenant.status}</div>}
          </div>
          <div className="p-2">
            <a href={`http://${subdomain}.localhost:4005`} target="_blank" rel="noreferrer" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">↗ View public site</a>
            <a href="/settings" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">⚙ Settings</a>
            <button onClick={logout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 font-semibold hover:bg-red-50">⎋ Sign out</button>
          </div>
          <div className="px-4 py-2 bg-gray-50 text-[10px] text-gray-400 font-semibold">Powered by DEXO</div>
        </div>
      )}
    </div>
  );
}
