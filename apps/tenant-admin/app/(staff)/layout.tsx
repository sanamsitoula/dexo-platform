import { ReactNode } from 'react';

const NAV = [
  { href: '/staff/dashboard', label: 'Dashboard' },
  { href: '/staff/customers', label: 'Customers' },
  { href: '/staff/schedule',  label: 'Schedule' },
  { href: '/staff/profile',   label: 'Profile' },
];

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-slate-800 text-slate-100 flex flex-col">
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="text-lg font-bold">Staff Portal</div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="block px-3 py-2 rounded-md text-sm hover:bg-slate-700">
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Staff Console</h1>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
