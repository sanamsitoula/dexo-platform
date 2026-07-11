import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
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
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-grotesk', display: 'swap' })
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-jbmono', display: 'swap' })

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
