import './globals.css'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'

// DEXO brand type stack (brand/Brand/04-typography.md) — the type foundation is
// Dexo; the tenant's own primary color is applied as a semantic token override.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-grotesk', display: 'swap' })
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-jbmono', display: 'swap' })

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
