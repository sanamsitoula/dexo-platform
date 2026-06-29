import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PlatformHeader from '@/components/PlatformHeader'
import Footer from '@/components/Footer'
import { TenantProvider } from '@/lib/tenant-context'
import { ThemeProvider } from '@/lib/theme-provider'
import { DomainThemeProvider } from '@/components/DomainThemeProvider'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className} suppressHydrationWarning>
        <TenantProvider>
          <ThemeProvider>
            <DomainThemeProvider>
              <div className="min-h-screen flex flex-col">
                <PlatformHeader />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <GoogleAnalytics />
            </DomainThemeProvider>
          </ThemeProvider>
        </TenantProvider>
      </body>
    </html>
  )
}
