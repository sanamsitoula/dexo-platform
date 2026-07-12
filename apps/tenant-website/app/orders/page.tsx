'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getToken, getMyOrders } from '@/lib/api'

/** Status → color mapping mirrors apps/mobile/app/orders.tsx's statusColor()
 * so customers see the same color semantics across web and mobile. */
function statusColor(status: string): string {
  const s = (status || '').toUpperCase()
  if (s.includes('CANCEL')) return '#ef4444'
  if (s.includes('DELIVER') || s.includes('COMPLETE') || s.includes('PAID')) return '#22c55e'
  if (s.includes('SHIP')) return '#3b82f6'
  return '#f59e0b'
}

export default function OrdersPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const isAuthed = !!getToken()
    setAuthed(isAuthed)
    if (!isAuthed) {
      setLoading(false)
      return
    }
    ;(async () => {
      const list = await getMyOrders()
      setOrders(Array.isArray(list) ? list : [])
      setLoading(false)
    })()
  }, [])

  const fmt = (n: number) => `Rs. ${Number(n || 0).toFixed(2)}`

  if (authed === false) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center" style={{ color: 'var(--site-text)' }}>
        <h1 className="text-2xl font-bold mb-2">Sign in to view your orders</h1>
        <p className="mb-6" style={{ color: 'var(--site-sub)' }}>
          You need to be logged in to see your order history.
        </p>
        <Link
          href="/checkout"
          className="inline-block px-5 py-2.5 font-semibold"
          style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
        >
          Sign in
        </Link>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10" style={{ color: 'var(--site-text)' }}>
      <h1 className="text-3xl font-bold mb-6">Your orders</h1>

      {loading ? (
        <p style={{ color: 'var(--site-sub)' }}>Loading…</p>
      ) : orders.length === 0 ? (
        <div
          className="p-10 text-center"
          style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
        >
          <p className="mb-4" style={{ color: 'var(--site-sub)' }}>You haven&apos;t placed any orders yet.</p>
          <Link
            href="/shop"
            className="inline-block px-5 py-2.5 font-semibold"
            style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between p-4 hover:opacity-90"
              style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
            >
              <div>
                <div className="font-semibold">{o.orderNumber || o.id}</div>
                <div className="text-sm" style={{ color: 'var(--site-sub)' }}>
                  {(o.placedAt || o.createdAt) ? new Date(o.placedAt || o.createdAt).toLocaleDateString() : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{fmt(o.grandTotal)}</span>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full"
                  style={{ color: '#fff', background: statusColor(o.status) }}
                >
                  {o.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
