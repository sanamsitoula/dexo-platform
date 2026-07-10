import { ReactNode } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';

// Grouped nav. Every link resolves to a real page (no 404s).
const NAV_SECTIONS: { heading: string; items: { href: string; label: string }[] }[] = [
  {
    heading: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard' }],
  },
  {
    heading: 'Gym',
    items: [
      { href: '/members', label: 'Members' },
      { href: '/plans', label: 'Membership Plans' },
      { href: '/trainers', label: 'Trainers' },
      { href: '/classes', label: 'Classes' },
      { href: '/attendance', label: 'Attendance' },
      { href: '/trainer', label: 'Trainer Hub' },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { href: '/finance', label: 'Finance' },
      { href: '/reports', label: 'Reports & Audit' },
    ],
  },
  {
    heading: 'Engage',
    items: [
      { href: '/announcements', label: 'Announcements' },
      { href: '/contacts', label: 'Contact / CRM' },
      { href: '/whatsapp', label: 'WhatsApp' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { href: '/users', label: 'Users' },
      { href: '/settings', label: 'Gym Settings' },
      { href: '/website', label: 'Website Builder' },
      { href: '/domain', label: 'Domain' },
      { href: '/onboarding', label: 'Onboarding' },
    ],
  },
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
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading}>
              <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{section.heading}</div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href} className="block px-3 py-2 rounded-md text-sm hover:bg-slate-800">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
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
