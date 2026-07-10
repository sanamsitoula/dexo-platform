import './globals.css'

export const metadata = {
  title: 'Tenant Admin',
  description: 'Tenant owner + staff portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
