'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenantInfo } from '../../lib/tenant-info';

// Canonical fitness journey — mirrored by the mobile app's tab bar
// (apps/mobile/app/(tabs)/_layout.tsx): Home / Workouts / Diet / My Plan / Profile.
const FITNESS_ITEMS = [
  { href: '/',           label: 'Home',     icon: '🏠' },
  { href: '/workouts',   label: 'Workouts', icon: '🏋️' },
  { href: '/diet',       label: 'Diet',     icon: '🥗' },
  { href: '/membership', label: 'My Plan',  icon: '💳' },
  { href: '/account',    label: 'Profile',  icon: '👤' },
];

const HIDDEN_ON = ['/login', '/register', '/onboarding', '/forgot-password'];

export default function BottomNav() {
  const path = usePathname();
  const { vertical } = useTenantInfo();
  if (HIDDEN_ON.includes(path || '')) return null;

  // Non-fitness verticals build their tab bar from the registry's quick actions.
  const items =
    vertical.key === 'fitness'
      ? FITNESS_ITEMS
      : [
          { href: '/', label: 'Home', icon: '🏠' },
          ...vertical.quickActions.filter((a) => a.href !== '/account').slice(0, 3)
            .map((a) => ({ href: a.href, label: a.label.split(' ')[0], icon: a.icon })),
          { href: '/account', label: 'Profile', icon: '👤' },
        ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto flex justify-around py-2">
        {items.map((it) => {
          const active = it.href === '/' ? path === '/' : path?.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center px-2 py-1 text-xs ${active ? 'font-semibold' : 'text-gray-500'}`}
              style={active ? { color: 'var(--brand-primary, #EA580C)' } : undefined}
            >
              <span className="text-lg">{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
