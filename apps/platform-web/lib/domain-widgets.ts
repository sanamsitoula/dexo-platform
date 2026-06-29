'use client'

import { useState, useEffect, useMemo } from 'react'
import { domainsApi } from '@/lib/api'

interface Widget {
  id: string
  code: string
  name: string
  description: string
  category: string
  icon: string
  component: string
  config: Record<string, any>
  refreshInterval: number | null
  moduleId: string
  roleId: string | null
}

export function useDomainWidgets(domainCode: string | undefined, roleCode: string | undefined) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!domainCode) {
      setWidgets([])
      setLoading(false)
      return
    }

    const fetchWidgets = async () => {
      try {
        setLoading(true)
        const response = await domainsApi.getWidgets(domainCode, roleCode)
        if (response.data) {
          setWidgets(response.data)
        } else if (response.error) {
          setError(response.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch widgets')
      } finally {
        setLoading(false)
      }
    }

    fetchWidgets()
  }, [domainCode, roleCode])

  const dashboardWidgets = useMemo(() => 
    widgets.filter(w => w.category === 'DASHBOARD'), [widgets])

  const analyticsWidgets = useMemo(() => 
    widgets.filter(w => w.category === 'ANALYTICS'), [widgets])

  const reportsWidgets = useMemo(() => 
    widgets.filter(w => w.category === 'REPORTS'), [widgets])

  return { 
    widgets, 
    dashboardWidgets, 
    analyticsWidgets, 
    reportsWidgets, 
    loading, 
    error 
  }
}