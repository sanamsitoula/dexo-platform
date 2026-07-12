'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tenantModulesApi } from '@/lib/api';

export interface NavSection {
  heading: string;
  items: { href: string; label: string }[];
}

// Nav href → plan module key. Entries without a mapping are always shown.
const HREF_MODULE_MAP: Record<string, string> = {
  '/contacts': 'crm',
  '/blogs': 'blog',
  '/finance': 'billing_invoice',
  '/attendance': 'attendance',
  '/website': 'website_builder',
  '/announcements': 'announcements',
  '/products': 'ecommerce',
  '/products/categories': 'ecommerce',
  '/products/brands': 'ecommerce',
  '/orders': 'ecommerce',
  '/customers': 'ecommerce',
  '/inventory': 'ecommerce',
};

/**
 * Sidebar nav that hides entries for modules disabled by the tenant's plan.
 * Fails open: until modules load (or on any fetch error) all entries show.
 */
export default function ModuleNav({ sections, subdomain }: { sections: NavSection[]; subdomain: string }) {
  const [modules, setModules] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;
    tenantModulesApi.get(subdomain).then((m) => {
      if (!cancelled) setModules(m);
    });
    return () => {
      cancelled = true;
    };
  }, [subdomain]);

  const isVisible = (href: string) => {
    if (!modules) return true; // fail open
    const moduleKey = HREF_MODULE_MAP[href];
    if (!moduleKey) return true;
    return modules[moduleKey] !== false;
  };

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
      {sections.map((section) => {
        const items = section.items.filter((item) => isVisible(item.href));
        if (items.length === 0) return null;
        return (
          <div key={section.heading}>
            <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {section.heading}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm hover:bg-slate-800"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
