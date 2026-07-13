'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const PLATFORM_ADMIN_URL = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_URL || 'http://localhost:3002';

export default function PlatformHeader() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try { setUser(JSON.parse(userData)) } catch { /* ignore */ }
    }
    setMounted(true)
  }, [])

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/')
  }

  return (
    <header className="border-b border-white/10 bg-[#05050a]/80 backdrop-blur-md sticky top-0 z-30">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" aria-label="Dexo home">
          {/* DEXO Tenant Cube mark (brand/Brand/02-visual-guidelines.md) */}
          <svg viewBox="0 0 96 96" width={30} height={30} role="img" aria-label="DEXO logo mark">
            <path d="M16 62 48 46l32 16-32 16z" fill="#E4E4E7" />
            <path d="M16 48 48 32l32 16-32 16z" fill="#71717A" />
            <path d="M16 34 48 18l32 16-32 16z" fill="#818CF8" />
          </svg>
          <span className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-grotesk), 'Space Grotesk', system-ui, sans-serif", letterSpacing: '0.02em' }}>DEXO</span>
        </Link>

        {/* Platform Nav (always visible) */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/#features" className="text-sm text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
            Features
          </Link>
          <Link href="/#industries" className="text-sm text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
            Industries
          </Link>
          <Link href="/#pricing" className="text-sm text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
            Pricing
          </Link>
          <Link href="/docs" className="text-sm text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
            Docs
          </Link>
          <Link href="/blog" className="text-sm text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
            Blog
          </Link>
          <Link href="/marketplace" className="text-sm text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
            Marketplace
          </Link>
          <Link href="/contact" className="text-sm text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
            Contact
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3" suppressHydrationWarning>
          {mounted && user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                  {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline text-sm text-gray-700">
                  {user.firstName || user.email}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    {user.isPlatformAdmin && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                        Platform Admin
                      </span>
                    )}
                  </div>
                  {user.isPlatformAdmin && (
                    <a
                      href={`${PLATFORM_ADMIN_URL}/dashboard`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Admin Console
                    </a>
                  )}
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Your Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-zinc-300 hover:text-cyan-300 font-medium px-3 py-2 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 hover:opacity-90 font-medium px-4 py-2 rounded-full transition-opacity"
              >
                Start Free
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
