'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTenantContext, useTenantBranding } from '@/lib/tenant-context'
import { useTheme } from '@/lib/theme-provider'
import Image from 'next/image'

export default function Header() {
  const router = useRouter()
  const { tenant } = useTenantContext()
  const branding = useTenantBranding()
  const theme = useTheme()
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem('user')
    if (userData) setUser(JSON.parse(userData))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/')
  }

  // Use tenant name or default to Dexo Platform
  const brandName = tenant?.name || 'Dexo Platform'
  const logoUrl = branding.logo

  return (
    <header
      className="border-b bg-white"
      style={{
        borderColor: theme.primaryColor ? `${theme.primaryColor}20` : undefined,
      }}
    >
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo or Brand Name */}
          <a href="/" className="flex items-center gap-2">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={brandName}
                width={32}
                height={32}
                className="rounded"
              />
            ) : null}
            <h1
              className="text-xl font-bold"
              style={{ color: theme.primaryColor }}
            >
              {brandName}
            </h1>
          </a>

          {/* Navigation Links */}
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Home</a>
          <a href="/#features" className="text-sm text-gray-600 hover:text-gray-900">Features</a>
          <a href="/#industries" className="text-sm text-gray-600 hover:text-gray-900">Industries</a>
          <a href="/contact" className="text-sm text-gray-600 hover:text-gray-900">Contact</a>
          {mounted && user && (
            <>
              <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/workouts" className="text-sm text-gray-600 hover:text-gray-900">Workouts</a>
              <a href="/team" className="text-sm text-gray-600 hover:text-gray-900">Team</a>
              <a href="/billing" className="text-sm text-gray-600 hover:text-gray-900">Billing</a>
              <a href="/notifications" className="text-sm text-gray-600 hover:text-gray-900">Notifications</a>
            </>
          )}
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-4">
          {!mounted ? (
            <div className="flex items-center gap-4">
              <div className="h-9 w-20 bg-gray-200 animate-pulse rounded" />
              <div className="h-9 w-20 bg-gray-200 animate-pulse rounded" />
            </div>
          ) : user ? (
            <>
              <a href="/profile" className="text-sm text-gray-600 hover:text-gray-900">
                {user.firstName || user.email}
              </a>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                Login
              </a>
              <a
                href="/register"
                className="text-sm px-4 py-2 rounded text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Sign Up
              </a>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
