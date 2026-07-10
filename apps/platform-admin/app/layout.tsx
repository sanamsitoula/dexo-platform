import './globals.css'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import ClientLayout from '@/components/ClientLayout'

// DEXO brand type stack (brand/Brand/04-typography.md)
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-grotesk', display: 'swap' })
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-jbmono', display: 'swap' })

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