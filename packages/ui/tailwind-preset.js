/**
 * DEXO Tailwind preset — brand/Brand/03-color-system.md + 04-typography.md.
 * Usage in an app's tailwind config:  presets: [require('@dexo/ui/tailwind-preset')]
 * Font families resolve to next/font CSS variables set in each app's root layout
 * (--font-sans → Inter, --font-display → Space Grotesk, --font-mono → JetBrains Mono).
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [],
  theme: {
    extend: {
      colors: {
        dexo: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          accent: '#A3E635',
          ink: '#09090B',
          paper: '#FAFAFA',
        },
        success: { DEFAULT: '#10B981', dark: '#34D399' },
        warning: { DEFAULT: '#F59E0B', dark: '#FBBF24' },
        danger: { DEFAULT: '#EF4444', dark: '#F87171' },
        info: { DEFAULT: '#0EA5E9', dark: '#38BDF8' },
        // Semantic-layer aliases (CSS-var driven — white-label safe)
        surface: {
          0: 'var(--dx-surface-0)',
          1: 'var(--dx-surface-1)',
          2: 'var(--dx-surface-2)',
        },
        primary: {
          // Runtime semantic primary (tenants may override --dx-primary)
          DEFAULT: 'var(--dx-primary)',
          hover: 'var(--dx-primary-hover)',
          // Indigo primitive scale kept for existing utility classes
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
          400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
          800: '#3730a3', 900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-grotesk)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jbmono)', 'JetBrains Mono', 'ui-monospace', 'Consolas', 'monospace'],
      },
      borderRadius: {
        dexo: '10px',
      },
      boxShadow: {
        'dx-sm': '0 1px 2px rgb(9 9 11 / 0.06)',
        'dx-md': '0 4px 12px rgb(9 9 11 / 0.08)',
        'dx-lg': '0 12px 32px rgb(9 9 11 / 0.12)',
        'dx-glow': '0 0 48px rgb(79 70 229 / 0.25)',
      },
      transitionTimingFunction: {
        dexo: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      backgroundImage: {
        'dx-hero': 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #A3E635 130%)',
      },
    },
  },
}
