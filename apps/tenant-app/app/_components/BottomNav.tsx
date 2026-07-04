'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/',           label: 'Home',       icon: '🏠' },
  { href: '/workouts',   label: 'Workouts',   icon: '🏋️' },
  { href: '/diet',       label: 'Diet',       icon: '🥗' },
  { href: '/membership', label: 'Membership', icon: '💳' },
  { href: '/account',    label: 'Account',    icon: '👤' },
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
              className={`flex flex-col items-center px-2 py-1 text-xs ${active ? 'text-orange-600 font-semibold' : 'text-gray-500'}`}
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
