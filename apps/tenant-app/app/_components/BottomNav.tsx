'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavItems } from './useNavItems';

const HIDDEN_ON = ['/login', '/register', '/onboarding', '/forgot-password'];

/** Mobile tab bar — hidden md+ in favor of TopNav (see layout.tsx). */
export default function BottomNav() {
  const path = usePathname();
  const items = useNavItems();
  if (HIDDEN_ON.includes(path || '')) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-50">
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
