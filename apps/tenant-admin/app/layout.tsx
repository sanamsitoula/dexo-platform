import './globals.css'
import { inter, grotesk, jbMono } from '@dexo/ui'

// DEXO brand type stack (brand/Brand/04-typography.md) — the type foundation is
// Dexo; the tenant's own primary color is applied as a semantic token override.
// Self-hosted, see packages/ui/src/fonts.ts.

export const metadata = {
  title: 'Tenant Admin',
  description: 'Tenant owner + staff portal — powered by Dexo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${grotesk.variable} ${jbMono.variable} ${inter.className}`} suppressHydrationWarning>{children}</body>
    </html>
  )
}
