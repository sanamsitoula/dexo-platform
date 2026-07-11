'use client'

import { useTenantContext } from '@/lib/tenant-context'
import { useTheme } from '@/lib/theme-provider'

export default function Footer() {
  const { tenant } = useTenantContext()
  const theme = useTheme()

  const brandName = tenant?.name || 'Dexo Platform'
  const isWhiteLabeled = tenant?.settings?.whiteLabel || false

  return (
    <footer className="border-t border-white/10 bg-[#05050a] mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-4 text-white">
              {brandName}
            </h3>
            <p className="text-sm text-zinc-400">
              {isWhiteLabeled
                ? 'Powered by our platform'
                : 'Multi-tenant SaaS platform engine'}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white">Product</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><a href="/features" className="hover:text-cyan-300 transition-colors">Features</a></li>
              <li><a href="/pricing" className="hover:text-cyan-300 transition-colors">Pricing</a></li>
              <li><a href="/docs" className="hover:text-cyan-300 transition-colors">Documentation</a></li>
              <li><a href="/blog" className="hover:text-cyan-300 transition-colors">Blog</a></li>
              <li><a href="/marketplace" className="hover:text-cyan-300 transition-colors">Marketplace</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white">Company</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><a href="/about" className="hover:text-cyan-300 transition-colors">About</a></li>
              <li><a href="/contact" className="hover:text-cyan-300 transition-colors">Contact</a></li>
              <li><a href="/privacy" className="hover:text-cyan-300 transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
          {!isWhiteLabeled && (
            <span className="ml-2">
              Built with <span className="text-cyan-300">Dexo Platform</span>.
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}
