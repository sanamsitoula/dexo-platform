'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getToken, getOrder } from '@/lib/api'

/** Status → color mapping mirrors apps/mobile/app/orders.tsx's statusColor(). */
function statusColor(status: string): string {
  const s = (status || '').toUpperCase()
  if (s.includes('CANCEL')) return '#ef4444'
  if (s.includes('DELIVER') || s.includes('COMPLETE') || s.includes('PAID')) return '#22c55e'
  if (s.includes('SHIP')) return '#3b82f6'
  return '#f59e0b'
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const orderId = params?.id as string
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const isAuthed = !!getToken()
    setAuthed(isAuthed)
    if (!isAuthed || !orderId) {
      setLoading(false)
      return
    }
    ;(async () => {
      const o = await getOrder(orderId)
      if (!o) setError('Order not found.')
      setOrder(o)
      setLoading(false)
    })()
  }, [orderId])

  const fmt = (n: number) => `Rs. ${Number(n || 0).toFixed(2)}`

  if (authed === false) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center" style={{ color: 'var(--site-text)' }}>
        <h1 className="text-2xl font-bold mb-2">Sign in to view this order</h1>
        <Link
          href="/checkout"
          className="inline-block mt-4 px-5 py-2.5 font-semibold"
          style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
        >
          Sign in
        </Link>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center" style={{ color: 'var(--site-sub)' }}>
        Loading…
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center" style={{ color: 'var(--site-text)' }}>
        <h1 className="text-2xl font-bold mb-2">Order not found</h1>
        <Link href="/orders" className="underline">Back to your orders</Link>
      </main>
    )
  }

  const address = order.shippingAddress || {}

  return (
    <main className="max-w-3xl mx-auto px-4 py-10" style={{ color: 'var(--site-text)' }}>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">{order.orderNumber || order.id}</h1>
        <span
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{ color: '#fff', background: statusColor(order.status) }}
        >
          {order.status}
        </span>
      </div>
      <p className="mb-6 text-sm" style={{ color: 'var(--site-sub)' }}>
        Placed {order.placedAt ? new Date(order.placedAt).toLocaleString() : ''}
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <section
            className="p-5"
            style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
          >
            <h2 className="font-bold text-lg mb-3">Items</h2>
            <div className="space-y-3">
              {(order.items || []).map((it: any) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span style={{ color: 'var(--site-sub)' }}>
                    {it.product?.name || 'Item'} × {it.quantity}
                  </span>
                  <span>{fmt(it.total)}</span>
                </div>
              ))}
            </div>
          </section>

          {(order.shipments || []).length > 0 && (
            <section
              className="p-5"
              style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
            >
              <h2 className="font-bold text-lg mb-3">Shipment</h2>
              {order.shipments.map((s: any) => (
                <div key={s.id} className="text-sm space-y-1">
                  <div>Status: <strong>{s.status}</strong></div>
                  {s.courierName && <div>Courier: {s.courierName}</div>}
                  {s.trackingNumber && <div>Tracking #: {s.trackingNumber}</div>}
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section
            className="p-5"
            style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
          >
            <h2 className="font-bold text-lg mb-3">Shipping address</h2>
            <p className="text-sm" style={{ color: 'var(--site-sub)' }}>
              {address.line1}{address.line1 && <br />}
              {address.city}
            </p>
          </section>

          <section
            className="p-5 space-y-2"
            style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
          >
            <h2 className="font-bold text-lg mb-1">Order total</h2>
            <div className="flex justify-between text-sm" style={{ color: 'var(--site-sub)' }}>
              <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--site-sub)' }}>
              <span>Tax</span><span>{fmt(order.taxTotal)}</span>
            </div>
            {Number(order.shippingTotal) > 0 && (
              <div className="flex justify-between text-sm" style={{ color: 'var(--site-sub)' }}>
                <span>Shipping</span><span>{fmt(order.shippingTotal)}</span>
              </div>
            )}
            <div className="h-px" style={{ background: 'var(--site-border)' }} />
            <div className="flex justify-between font-bold">
              <span>Total</span><span>{fmt(order.grandTotal)}</span>
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--site-sub)' }}>
              Payment: {order.paymentMethod}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-8">
        <Link href="/orders" className="underline text-sm">Back to your orders</Link>
      </div>
    </main>
  )
}
