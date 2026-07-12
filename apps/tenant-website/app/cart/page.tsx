'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { resolveClientSubdomain } from '@/lib/subdomain'
import {
  getGuestCart,
  updateGuestCartItem,
  removeGuestCartItem,
  guestCartTotals,
  CART_EVENT,
  type GuestCartItem,
} from '@/lib/guestCart'

/** Shopping cart — client-only, backed by the localStorage guest cart. The
 * cart is replayed into the real backend cart at checkout (see app/checkout).
 * Themed entirely with the tenant's --site-* CSS variables. */
export default function CartPage() {
  const [subdomain, setSubdomain] = useState('')
  const [items, setItems] = useState<GuestCartItem[]>([])

  useEffect(() => {
    const sub = resolveClientSubdomain()
    setSubdomain(sub)
    const refresh = () => setItems(getGuestCart(sub))
    refresh()
    window.addEventListener(CART_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CART_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const { subtotal, tax, total } = guestCartTotals(items)
  const currency = 'Rs.'
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`

  const setQty = (i: GuestCartItem, qty: number) =>
    updateGuestCartItem(subdomain, i.productId, i.variantId, qty)
  const remove = (i: GuestCartItem) => removeGuestCartItem(subdomain, i.productId, i.variantId)

  return (
    <main className="max-w-4xl mx-auto px-4 py-10" style={{ color: 'var(--site-text)' }}>
      <h1 className="text-3xl font-bold mb-6">Your Cart</h1>

      {items.length === 0 ? (
        <div
          className="rounded-lg p-10 text-center"
          style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
        >
          <p className="mb-4" style={{ color: 'var(--site-sub)' }}>Your cart is empty.</p>
          <Link
            href="/shop"
            className="inline-block px-5 py-2.5 font-semibold"
            style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            {items.map((i) => (
              <div
                key={`${i.productId}:${i.variantId ?? ''}`}
                className="flex gap-4 p-3 items-center"
                style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={i.image || 'https://picsum.photos/seed/placeholder/120/120'}
                  alt={i.name}
                  className="w-20 h-20 object-cover"
                  style={{ borderRadius: 'var(--site-radius)' }}
                />
                <div className="flex-1 min-w-0">
                  <Link href={`/shop/${i.slug}`} className="font-semibold hover:underline">
                    {i.name}
                  </Link>
                  <div className="text-sm mt-1" style={{ color: 'var(--site-sub)' }}>
                    {fmt(i.unitPrice)} each
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => setQty(i, i.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center font-bold"
                      style={{ border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-8 text-center">{i.quantity}</span>
                    <button
                      onClick={() => setQty(i, i.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center font-bold"
                      style={{ border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                    <button
                      onClick={() => remove(i)}
                      className="ml-3 text-sm underline"
                      style={{ color: 'var(--site-sub)' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="font-semibold whitespace-nowrap">{fmt(i.unitPrice * i.quantity)}</div>
              </div>
            ))}
          </div>

          <aside
            className="h-fit p-5 space-y-3"
            style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
          >
            <h2 className="font-bold text-lg">Summary</h2>
            <Row label="Subtotal" value={fmt(subtotal)} />
            <Row label="Tax" value={fmt(tax)} />
            <div className="h-px" style={{ background: 'var(--site-border)' }} />
            <Row label="Total" value={fmt(total)} bold />
            <Link
              href="/checkout"
              className="block text-center px-5 py-3 font-semibold mt-2"
              style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
            >
              Proceed to checkout
            </Link>
            <Link href="/shop" className="block text-center text-sm underline" style={{ color: 'var(--site-sub)' }}>
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </main>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between" style={{ fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: bold ? 'var(--site-text)' : 'var(--site-sub)' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
