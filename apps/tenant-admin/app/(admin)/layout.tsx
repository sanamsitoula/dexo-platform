import { ReactNode } from 'react';
import { headers } from 'next/headers';
import UserMenu from '@/components/UserMenu';
import ModuleNav from '@/components/ModuleNav';
import AiAssistant from '@/components/AiAssistant';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';

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
      { href: '/blogs', label: 'Blogs' },
      { href: '/contacts', label: 'Contact / CRM' },
      { href: '/whatsapp', label: 'WhatsApp' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { href: '/users', label: 'Users' },
      { href: '/roles', label: 'Roles' },
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
        {/* Client nav: hides entries for modules disabled by the tenant's plan (fails open). */}
        <ModuleNav sections={NAV_SECTIONS} subdomain={slug} />
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
          <a href={`http://${slug}.${PLATFORM_DOMAIN}`} target="_blank" rel="noreferrer" className="hover:text-slate-200">
            ↗ View public site
          </a>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Admin Console</h1>
          <UserMenu />
        </header>
        <div className="p-6">{children}</div>
      </main>
      <AiAssistant />
    </div>
  );
}
