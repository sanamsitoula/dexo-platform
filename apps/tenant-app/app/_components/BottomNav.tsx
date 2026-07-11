'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Canonical customer journey — mirrored by the mobile app's tab bar
// (apps/mobile/app/(tabs)/_layout.tsx): Home / Workouts / Diet / My Plan / Profile.
const ITEMS = [
  { href: '/',           label: 'Home',     icon: '🏠' },
  { href: '/workouts',   label: 'Workouts', icon: '🏋️' },
  { href: '/diet',       label: 'Diet',     icon: '🥗' },
  { href: '/membership', label: 'My Plan',  icon: '💳' },
  { href: '/account',    label: 'Profile',  icon: '👤' },
];

const HIDDEN_ON = ['/login', '/register', '/onboarding'];

export default function BottomNav() {
  const path = usePathname();
  if (HIDDEN_ON.includes(path || '')) return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto flex justify-around py-2">
        {ITEMS.map((it) => {
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
