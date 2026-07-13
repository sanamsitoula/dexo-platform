'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavItems } from './useNavItems';
import { useTenantInfo } from '../../lib/tenant-info';

const HIDDEN_ON = ['/login', '/register', '/onboarding', '/forgot-password'];

/** Desktop top bar (md+) — the web-app counterpart to BottomNav's mobile tab
 * bar, sharing the same nav-item source so the two never drift apart. */
export default function TopNav() {
  const path = usePathname();
  const items = useNavItems();
  const { info } = useTenantInfo();
  if (HIDDEN_ON.includes(path || '')) return null;

  return (
    <nav className="hidden md:block sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3">
        <Link href="/" className="font-bold text-lg tracking-tight" style={{ color: 'var(--brand-primary, #EA580C)' }}>
          {info?.name || 'Dexo'}
        </Link>
        <div className="flex items-center gap-1">
          {items.map((it) => {
            const active = it.href === '/' ? path === '/' : path?.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  active ? 'bg-gray-100' : 'text-gray-500 hover:bg-gray-50'
                }`}
                style={active ? { color: 'var(--brand-primary, #EA580C)' } : undefined}
              >
                <span>{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
