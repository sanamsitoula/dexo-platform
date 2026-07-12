import type { Metadata } from 'next'
import { inter, grotesk, jbMono } from '@dexo/ui'
import './globals.css'
import PlatformHeader from '@/components/PlatformHeader'
import Footer from '@/components/Footer'
import { TenantProvider } from '@/lib/tenant-context'
import { ThemeProvider } from '@/lib/theme-provider'
import { DomainThemeProvider } from '@/components/DomainThemeProvider'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import SmoothScrollProvider from '@/components/SmoothScrollProvider'
import CustomCursor from '@/components/CustomCursor'
import ScrollProgress from '@/components/ScrollProgress'
import LoadingScreen from '@/components/LoadingScreen'

// DEXO brand type stack (brand/Brand/04-typography.md):
// Inter for UI/body, Space Grotesk for display 24px+, JetBrains Mono for code/data.
// Self-hosted, see packages/ui/src/fonts.ts.

export const metadata: Metadata = {
  title: 'Dexo Platform - Multi-tenant SaaS Platform Engine',
  description: 'Build and scale your multi-tenant SaaS applications with Dexo Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${grotesk.variable} ${jbMono.variable} ${inter.className} bg-[#05050a]`} suppressHydrationWarning>
        <TenantProvider>
          <ThemeProvider>
            <DomainThemeProvider>
              <LoadingScreen />
              <ScrollProgress />
              <CustomCursor />
              <SmoothScrollProvider>
                <div className="min-h-screen flex flex-col">
                  <PlatformHeader />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
              </SmoothScrollProvider>
              <GoogleAnalytics />
            </DomainThemeProvider>
          </ThemeProvider>
        </TenantProvider>
      </body>
    </html>
  )
}
