'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDomainMenus } from '@/lib/domain-menus'
import { useTenantContext } from '@/lib/tenant-context'
import { useDomainInfo } from '@/lib/domain-info'

interface DynamicSidebarProps {
  roleCode?: string
  domainCode?: string
}

export default function DynamicSidebar({ roleCode, domainCode }: DynamicSidebarProps) {
  const pathname = usePathname()
  const { tenant } = useTenantContext()
  const effectiveDomainCode = domainCode || tenant?.subdomain || 'default'
  const { menus, loading, error } = useDomainMenus(effectiveDomainCode, roleCode)
  const { domain } = useDomainInfo(effectiveDomainCode)

  if (loading) {
    return (
      <aside className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      </aside>
    )
  }

  if (error) {
    return (
      <aside className="w-64 bg-white border-r border-gray-200 p-4">
        <p className="text-sm text-red-500">Error loading menu: {error}</p>
      </aside>
    )
  }

  const renderMenuItem = (item: any, depth = 0) => {
    const isActive = pathname === item.route
    const hasChildren = item.children && item.children.length > 0

    return (
      <li key={item.id}>
        <Link
          href={item.route}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            isActive
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {item.icon && <span className="text-lg">{item.icon}</span>}
          <span>{item.label}</span>
          {hasChildren && (
            <svg className="ml-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </Link>
        {hasChildren && (
          <ul className="mt-1 space-y-1">
            {item.children.map((child: any) => renderMenuItem(child, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
      {domain && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Industry</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{domain.name}</p>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {menus.map((item) => renderMenuItem(item))}
        </ul>
      </nav>
    </aside>
  )
}
