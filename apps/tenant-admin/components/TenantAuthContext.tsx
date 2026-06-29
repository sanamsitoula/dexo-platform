'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { tenantApi } from '@/lib/api'
import { TenantInfo, TenantUser } from '@/lib/domain-config'

interface TenantAuthContextType {
  user: TenantUser | null
  tenant: TenantInfo | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  logout: () => void
}

const TenantAuthContext = createContext<TenantAuthContextType | undefined>(undefined)

export function TenantAuthProvider({ children }: { children: ReactNode }) {
  const params = useParams()
  const subdomain = params?.subdomain as string
  
  const [user, setUser] = useState<TenantUser | null>(null)
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subdomain) {
      setLoading(false)
      return
    }
    checkAuth()
  }, [subdomain])

  async function checkAuth() {
    const token = localStorage.getItem(`tenant-token-${subdomain}`)
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const [tenantRes, profileRes] = await Promise.all([
        tenantApi.getBySubdomain(subdomain),
        tenantApi.getProfile(subdomain),
      ])

      if (tenantRes.data) {
        setTenant(tenantRes.data)
      }
      if (profileRes.data) {
        setUser(profileRes.data)
      } else {
        localStorage.removeItem(`tenant-token-${subdomain}`)
        localStorage.removeItem(`tenant-user-${subdomain}`)
      }
    } catch {
      localStorage.removeItem(`tenant-token-${subdomain}`)
      localStorage.removeItem(`tenant-user-${subdomain}`)
    }
    setLoading(false)
  }

  async function login(email: string, password: string) {
    try {
      const data = await tenantApi.login(subdomain, email, password)
      localStorage.setItem(`tenant-token-${subdomain}`, data.accessToken)
      localStorage.setItem(`tenant-refresh-${subdomain}`, data.refreshToken)
      localStorage.setItem(`tenant-user-${subdomain}`, JSON.stringify(data.user))
      setUser(data.user)
      
      const tenantRes = await tenantApi.getBySubdomain(subdomain)
      if (tenantRes.data) setTenant(tenantRes.data)
      
      return {}
    } catch (err: any) {
      return { error: err.message || 'Login failed' }
    }
  }

  function logout() {
    localStorage.removeItem(`tenant-token-${subdomain}`)
    localStorage.removeItem(`tenant-refresh-${subdomain}`)
    localStorage.removeItem(`tenant-user-${subdomain}`)
    setUser(null)
    setTenant(null)
  }

  return (
    <TenantAuthContext.Provider value={{ user, tenant, loading, login, logout }}>
      {children}
    </TenantAuthContext.Provider>
  )
}

export function useTenantAuth() {
  const context = useContext(TenantAuthContext)
  if (!context) throw new Error('useTenantAuth must be used within TenantAuthProvider')
  return context
}
