'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { resolveClientSubdomain } from '@/lib/subdomain'
import { getGuestCartCount, CART_EVENT } from '@/lib/guestCart'

/** Small cart-count badge for SiteNav, kept in sync with the guest cart via a
 * custom event (fired by lib/guestCart.ts on every write) + the storage
 * event (covers changes made in another tab). */
export default function CartBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const subdomain = resolveClientSubdomain()
    const refresh = () => setCount(getGuestCartCount(subdomain))
    refresh()
    window.addEventListener(CART_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CART_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return (
    <Link href="/cart" className="relative opacity-75 hover:opacity-100" aria-label="Cart">
      🛒
      {count > 0 && (
        <span
          className="absolute -top-2 -right-2 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center text-[10px] font-bold rounded-full"
          style={{ background: 'var(--site-accent)', color: 'var(--site-on-accent)' }}
        >
          {count}
        </span>
      )}
    </Link>
  )
}
