'use client'

import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/components/ThemeProvider'
import AdminSidebar from '@/components/AdminSidebar'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading, isPlatformAdmin } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push('/login')
    }
  }, [user, loading, isLoginPage, router])

  useEffect(() => {
    if (!loading && user && !isPlatformAdmin && !isLoginPage) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      router.push('/login')
    }
  }, [user, loading, isPlatformAdmin, isLoginPage, router])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="w-64 bg-gray-900" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!isPlatformAdmin) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LayoutContent>{children}</LayoutContent>
      </ThemeProvider>
    </AuthProvider>
  )
}
