'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { cookies } from 'next/headers'

/**
 * Tenant Context for Multi-Tenant Applications
 *
 * Provides tenant information throughout the React tree.
 * Reads tenant context from headers set by middleware.
 */

export interface TenantBranding {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  logo?: string
  favicon?: string
  customCSS?: string
  fontFamily?: string
}

export interface TenantAnalytics {
  gaMeasurementId?: string
  gtmId?: string
  FacebookPixelId?: string
}

export interface TenantSettings {
  branding?: TenantBranding
  analytics?: TenantAnalytics
  whiteLabel?: boolean
  customDomain?: string
}

export interface Tenant {
  id: string
  name: string
  subdomain: string
  domain?: string
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL'
  settings?: TenantSettings
}

export interface TenantContextValue {
  tenant: Tenant | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch tenant by subdomain or custom domain
   */
  const fetchTenant = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get tenant identifier from headers or cookies
      // In a real implementation, this would be passed from server component
      const response = await fetch('/api/tenant/current')

      if (!response.ok) {
        if (response.status === 404) {
          // No tenant found - platform landing
          setTenant(null)
          return
        }
        throw new Error('Failed to fetch tenant')
      }

      const data = await response.json()
      setTenant(data.tenant)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch tenant:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTenant()
  }, [])

  const value: TenantContextValue = {
    tenant,
    isLoading,
    error,
    refetch: fetchTenant,
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

/**
 * Hook to use tenant context
 */
export function useTenantContext(): TenantContextValue {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider')
  }
  return context
}

/**
 * Hook to get tenant branding settings
 */
export function useTenantBranding(): TenantBranding {
  const { tenant } = useTenantContext()
  return tenant?.settings?.branding || {}
}

/**
 * Hook to get tenant analytics settings
 */
export function useTenantAnalytics(): TenantAnalytics {
  const { tenant } = useTenantContext()
  return tenant?.settings?.analytics || {}
}

/**
 * Higher-order component to require tenant context
 * Redirects to platform home if no tenant found
 */
export function withTenant<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WithTenantComponent(props: P) {
    const { tenant, isLoading } = useTenantContext()

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      )
    }

    if (!tenant) {
      // No tenant - redirect to platform home
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
      return null
    }

    return <Component {...props} />
  }
}
