'use client'

import { useState, useEffect } from 'react'
import { domainsApi } from '@/lib/api'

interface DomainTheme {
  id: string
  name: string
  code: string
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  logoUrl: string | null
  primaryFont: string
  dashboardTemplate: Record<string, any>
  websiteTemplate: Record<string, any>
}

export function useDomainTheme(domainCode: string | undefined) {
  const [theme, setTheme] = useState<DomainTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!domainCode) {
      setTheme(null)
      setLoading(false)
      return
    }

    const fetchTheme = async () => {
      try {
        setLoading(true)
        const response = await domainsApi.getTheme(domainCode)
        if (response.data) {
          setTheme(response.data)
        } else if (response.error) {
          setError(response.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch theme')
      } finally {
        setLoading(false)
      }
    }

    fetchTheme()
  }, [domainCode])

  return { theme, loading, error }
}