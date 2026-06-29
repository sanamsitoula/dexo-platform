'use client'

import { useState, useEffect } from 'react'
import { domainsApi } from '@/lib/api'

export interface DomainInfo {
  code: string
  name: string
  description: string
  theme: string
  modules: string[]
}

export function useDomainInfo(domainCode: string | undefined) {
  const [domain, setDomain] = useState<DomainInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!domainCode) {
      setDomain(null)
      setLoading(false)
      return
    }

    const fetchDomain = async () => {
      try {
        setLoading(true)
        const response = await domainsApi.getByCode(domainCode)
        if (response.data) {
          setDomain({
            code: response.data.code,
            name: response.data.name,
            description: response.data.description || '',
            theme: response.data.theme || 'default',
            modules: response.data.modulesEnabled || [],
          })
        } else if (response.error) {
          setError(response.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch domain info')
      } finally {
        setLoading(false)
      }
    }

    fetchDomain()
  }, [domainCode])

  return { domain, loading, error }
}