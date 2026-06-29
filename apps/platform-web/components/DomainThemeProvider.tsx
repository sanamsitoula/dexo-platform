'use client'

import { useEffect } from 'react'
import { useDomainTheme } from '@/lib/domain-theme'
import { useTenantContext } from '@/lib/tenant-context'

interface DomainThemeProviderProps {
  domainCode?: string
  children: React.ReactNode
}

export function DomainThemeProvider({ domainCode, children }: DomainThemeProviderProps) {
  const { tenant } = useTenantContext()
  const effectiveDomainCode = domainCode || tenant?.subdomain || 'default'
  const { theme, loading, error } = useDomainTheme(effectiveDomainCode)

  useEffect(() => {
    if (!theme) return

    const root = document.documentElement

    if (theme.primaryColor) {
      root.style.setProperty('--color-primary', theme.primaryColor)
      root.style.setProperty('--color-primary-rgb', hexToRgb(theme.primaryColor))
    }

    if (theme.secondaryColor) {
      root.style.setProperty('--color-secondary', theme.secondaryColor)
      root.style.setProperty('--color-secondary-rgb', hexToRgb(theme.secondaryColor))
    }

    if (theme.backgroundColor) {
      root.style.setProperty('--color-bg', theme.backgroundColor)
      document.body.style.backgroundColor = theme.backgroundColor
    }

    if (theme.textColor) {
      root.style.setProperty('--color-text', theme.textColor)
      document.body.style.color = theme.textColor
    }

    if (theme.primaryFont) {
      root.style.setProperty('--font-family', theme.primaryFont)
      document.body.style.fontFamily = theme.primaryFont
    }

    return () => {
      root.style.removeProperty('--color-primary')
      root.style.removeProperty('--color-primary-rgb')
      root.style.removeProperty('--color-secondary')
      root.style.removeProperty('--color-secondary-rgb')
      root.style.removeProperty('--color-bg')
      root.style.removeProperty('--color-text')
      root.style.removeProperty('--font-family')
    }
  }, [theme])

  return <>{children}</>
}

function hexToRgb(hex: string): string {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}
