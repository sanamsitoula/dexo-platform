'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  tenantId?: string
  isPlatformAdmin?: boolean
  roles?: string[]
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
  isPlatformAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setLoading(false)
      return
    }

    const response = await authApi.getProfile()
    if (response.data) {
      if (!response.data.isPlatformAdmin) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setLoading(false)
        return
      }
      setUser(response.data)
    } else {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
    setLoading(false)
  }

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password)
    if (response.data) {
      localStorage.setItem('accessToken', response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      setUser(response.data.user)
      return {}
    }
    return { error: response.error || 'Login failed' }
  }

  async function logout() {
    await authApi.logout()
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    router.push('/login')
  }

  const isPlatformAdmin = user?.isPlatformAdmin || false

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isPlatformAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
