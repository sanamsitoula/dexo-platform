'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/website', label: 'Overview' },
  { href: '/website/theme', label: 'Theme Builder' },
  { href: '/website/pages', label: 'Pages' },
  { href: '/website/menus', label: 'Homepage Sections' },
  { href: '/website/forms', label: 'Forms' },
  { href: '/website/media', label: 'Media Library' },
];

/** Persistent tab bar shown at the top of every Website Builder sub-page —
 * previously these five tools were only cross-linked via cards on the /website
 * hub page, so once you drilled into e.g. a page editor there was no way to
 * jump to Theme Builder or Forms without navigating back first. */
export default function WebsiteSubNav() {
  const pathname = usePathname() || '';

  return (
    <div className="flex flex-wrap gap-1 mb-5 border-b border-gray-200 pb-2">
      {TABS.map((tab) => {
        // Exact match for '/website' itself; prefix match for sub-pages so
        // e.g. '/website/pages/abc123' still highlights the "Pages" tab.
        const active = tab.href === '/website' ? pathname === '/website' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              active ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
