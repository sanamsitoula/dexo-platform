'use client'

import { useEffect, ReactNode } from 'react'
import { useTenantBranding } from './tenant-context'

/**
 * Theme Provider for Dynamic Tenant Theming
 *
 * Applies tenant-specific branding settings including:
 * - Primary/secondary/accent colors
 * - Custom fonts
 * - Custom CSS
 * - Favicon updates
 */

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const branding = useTenantBranding()

  useEffect(() => {
    // Apply CSS custom properties for colors
    const root = document.documentElement

    if (branding.primaryColor) {
      root.style.setProperty('--color-primary', branding.primaryColor)
      root.style.setProperty('--color-primary-rgb', hexToRgb(branding.primaryColor))
    }

    if (branding.secondaryColor) {
      root.style.setProperty('--color-secondary', branding.secondaryColor)
      root.style.setProperty('--color-secondary-rgb', hexToRgb(branding.secondaryColor))
    }

    if (branding.accentColor) {
      root.style.setProperty('--color-accent', branding.accentColor)
      root.style.setProperty('--color-accent-rgb', hexToRgb(branding.accentColor))
    }

    // Apply custom font family
    if (branding.fontFamily) {
      root.style.setProperty('--font-family', branding.fontFamily)
      document.body.style.fontFamily = branding.fontFamily
    }

    // Update favicon
    if (branding.favicon) {
      updateFavicon(branding.favicon)
    }

    // Apply custom CSS
    if (branding.customCSS) {
      applyCustomCSS(branding.customCSS)
    }

    // Cleanup function to reset styles when tenant changes
    return () => {
      // Reset to default colors
      root.style.removeProperty('--color-primary')
      root.style.removeProperty('--color-primary-rgb')
      root.style.removeProperty('--color-secondary')
      root.style.removeProperty('--color-secondary-rgb')
      root.style.removeProperty('--color-accent')
      root.style.removeProperty('--color-accent-rgb')
      root.style.removeProperty('--font-family')
      document.body.style.fontFamily = ''
    }
  }, [branding])

  return <>{children}</>
}

/**
 * Convert hex color to RGB string
 */
function hexToRgb(hex: string): string {
  // Remove hash if present
  const cleanHex = hex.replace('#', '')

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

  return `${r}, ${g}, ${b}`
}

/**
 * Update favicon dynamically
 */
function updateFavicon(url: string) {
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement

  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }

  link.href = url
}

/**
 * Apply custom CSS
 */
function applyCustomCSS(css: string) {
  let styleElement = document.getElementById('tenant-custom-css') as HTMLStyleElement

  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = 'tenant-custom-css'
    document.head.appendChild(styleElement)
  }

  styleElement.textContent = css
}

/**
 * Hook to get theme values
 */
export function useTheme() {
  const branding = useTenantBranding()

  return {
    primaryColor: branding.primaryColor || '#0066FF',
    secondaryColor: branding.secondaryColor || '#6B7280',
    accentColor: branding.accentColor || '#10B981',
    fontFamily: branding.fontFamily || 'Inter, sans-serif',
    logo: branding.logo,
    favicon: branding.favicon,
    customCSS: branding.customCSS,
  }
}
