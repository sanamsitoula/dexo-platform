import { ReactNode } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';

const NAV = [
  { href: '/dashboard',  label: 'Dashboard' },
  { href: '/users',      label: 'Users' },
  { href: '/roles',      label: 'Roles' },
  { href: '/customers',  label: 'Customers' },
  { href: '/contacts',   label: 'Contacts' },
  { href: '/branches',   label: 'Branches' },
  { href: '/finance',    label: 'Finance' },
  { href: '/settings',   label: 'Settings' },
  { href: '/modules',    label: 'Modules' },
  { href: '/website',    label: 'Website' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/domain',     label: 'Domain' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const h = headers();
  const slug = h.get('x-tenant-slug') || 'vrfitness';

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="text-lg font-bold">Dexo Admin</div>
          <div className="text-xs text-slate-400 mt-1">tenant: {slug}</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-md text-sm hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
          <a href={`http://${slug}.dexo.com:4005`} target="_blank" rel="noreferrer" className="hover:text-slate-200">
            ↗ View public site
          </a>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Admin Console</h1>
          <div className="text-sm text-gray-500">OWNER / ADMIN</div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
