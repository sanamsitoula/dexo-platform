'use client'

import { useEffect } from 'react'

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')

function resolveTenantSlug(): string {
  if (typeof document === 'undefined') return 'vrfitness'
  return (
    document.cookie.match(/(?:^|;\s*)dexo-tenant-slug=([^;]+)/)?.[1] ||
    localStorage.getItem('dexo-tenant-slug') ||
    'vrfitness'
  )
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  const slug = resolveTenantSlug()
  return localStorage.getItem(`tenant-token-${slug}`) || localStorage.getItem('token')
}

/**
 * Tier 2 of the Chatwoot integration (see docs/CHATWOOT_INTEGRATION.md):
 * Tenant <-> Platform. Loads the SINGLE platform-wide Chatwoot widget so a
 * gym owner/staff member logged into tenant-admin can message platform
 * support directly — same widget instance for every tenant, distinguished
 * on the agent side by which contact (tenant owner) is messaging.
 */
export default function ChatwootPlatformWidget() {
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let cancelled = false

    fetch(`${API_HOST}/api/chatwoot/platform-widget`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((cfg: { configured: boolean; baseUrl?: string; websiteToken?: string }) => {
        if (cancelled || !cfg.configured || !cfg.baseUrl || !cfg.websiteToken) return
        loadChatwootScript(cfg.baseUrl, cfg.websiteToken)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return null
}

function loadChatwootScript(baseUrl: string, websiteToken: string) {
  if ((window as any).chatwootSDK || document.getElementById('chatwoot-sdk')) return
  const script = document.createElement('script')
  script.id = 'chatwoot-sdk'
  script.src = `${baseUrl.replace(/\/$/, '')}/packs/js/sdk.js`
  script.defer = true
  script.async = true
  script.onload = () => {
    ;(window as any).chatwootSDK?.run({ websiteToken, baseUrl })
  }
  document.body.appendChild(script)
}
