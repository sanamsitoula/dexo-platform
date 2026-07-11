'use client'

import { useTenantContext } from '@/lib/tenant-context'
import { useTheme } from '@/lib/theme-provider'

export default function Footer() {
  const { tenant } = useTenantContext()
  const theme = useTheme()

  const brandName = tenant?.name || 'Dexo Platform'
  const isWhiteLabeled = tenant?.settings?.whiteLabel || false

  return (
    <footer className="border-t mt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-4" style={{ color: theme.primaryColor }}>
              {brandName}
            </h3>
            <p className="text-sm text-gray-600">
              {isWhiteLabeled
                ? 'Powered by our platform'
                : 'Multi-tenant SaaS platform engine'}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/features" className="hover:text-gray-900">Features</a></li>
              <li><a href="/pricing" className="hover:text-gray-900">Pricing</a></li>
              <li><a href="/docs" className="hover:text-gray-900">Documentation</a></li>
              <li><a href="/blog" className="hover:text-gray-900">Blog</a></li>
              <li><a href="/marketplace" className="hover:text-gray-900">Marketplace</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/about" className="hover:text-gray-900">About</a></li>
              <li><a href="/contact" className="hover:text-gray-900">Contact</a></li>
              <li><a href="/privacy" className="hover:text-gray-900">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
          {!isWhiteLabeled && (
            <span className="ml-2">
              Built with <span style={{ color: theme.primaryColor }}>Dexo Platform</span>.
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}
