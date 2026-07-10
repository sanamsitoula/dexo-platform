'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

/** Profile dropdown for the platform admin console — user details, platform
 *  role, and logout. Rendered in the header of every page. */
export default function UserMenu() {
  const { user, logout, isPlatformAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (!user) return null
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
  const initial = (user.firstName || user.email || 'A').charAt(0).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">
        <span className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold" style={{ background: '#4F46E5' }}>{initial}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 hidden sm:block">{name}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold" style={{ background: '#4F46E5' }}>{initial}</span>
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">{name}</div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {isPlatformAdmin && <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">Platform Admin</span>}
              {user.tenantId && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">tenant user</span>}
            </div>
          </div>
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 text-sm">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Scope</div>
            <div className="font-semibold text-gray-900 dark:text-white">Dexo Platform</div>
            <div className="text-xs text-gray-500 mt-0.5">All tenants · administration console</div>
          </div>
          <div className="p-2">
            <a href="/settings" className="block px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">⚙ Platform settings</a>
            <a href="/audit" className="block px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">🕐 Audit logs</a>
            <button onClick={logout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20">⎋ Sign out</button>
          </div>
        </div>
      )}
    </div>
  )
}
