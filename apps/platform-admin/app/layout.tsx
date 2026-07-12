import './globals.css'
import { inter, grotesk, jbMono } from '@dexo/ui'
import ClientLayout from '@/components/ClientLayout'

// DEXO brand type stack (brand/Brand/04-typography.md) — self-hosted, see packages/ui/src/fonts.ts

export const metadata = {
  title: 'Dexo Admin Dashboard',
  description: 'Admin dashboard for Dexo Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${grotesk.variable} ${jbMono.variable} ${inter.className}`} suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}