'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ThemeConfig, defaultTheme, loadTheme, saveTheme, resetTheme as resetThemeUtil } from '@/lib/theme'

interface ThemeContextType {
  theme: ThemeConfig
  updateTheme: (config: Partial<ThemeConfig>) => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)

  useEffect(() => {
    const loaded = loadTheme()
    setTheme(loaded)
  }, [])

  const updateTheme = (config: Partial<ThemeConfig>) => {
    const newTheme = { ...theme, ...config }
    setTheme(newTheme)
    saveTheme(newTheme)
  }

  const handleResetTheme = () => {
    setTheme(defaultTheme)
    resetThemeUtil()
  }

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme: handleResetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
