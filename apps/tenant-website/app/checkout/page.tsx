'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { resolveClientSubdomain } from '@/lib/subdomain'
import {
  getGuestCart,
  guestCartTotals,
  clearGuestCart,
  type GuestCartItem,
} from '@/lib/guestCart'
import {
  getToken,
  loginCustomer,
  addToCart,
  checkout,
  getTenantBySubdomain,
  getTenantAvailableProviders,
  initPayment,
  type TenantPaymentProvider,
} from '@/lib/api'

type PaymentMethod = 'COD' | 'PREPAID'

/** Checkout — collects shipping/contact details, ensures the shopper is
 * authenticated (login inline if needed), replays the localStorage guest cart
 * into the backend cart, then places the order. PREPAID orders are handed off
 * to the tenant's real configured payment gateway (eSewa/Fonepay/ConnectIPS/
 * Stripe/PayPal) via /checkout/callback; COD orders go straight to the order
 * detail page. */
export default function CheckoutPage() {
  const router = useRouter()
  const [subdomain, setSubdomain] = useState('')
  const [items, setItems] = useState<GuestCartItem[]>([])
  const [authed, setAuthed] = useState(false)

  // login form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // shipping / contact
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [line1, setLine1] = useState('')
  const [city, setCity] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('COD')
  const [providers, setProviders] = useState<TenantPaymentProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sub = resolveClientSubdomain()
    setSubdomain(sub)
    setItems(getGuestCart(sub))
    setAuthed(!!getToken())

    ;(async () => {
      const tenant = await getTenantBySubdomain(sub)
      if (!tenant?.id) return
      const list = await getTenantAvailableProviders(tenant.id)
      setProviders(list)
      if (list.length > 0) {
        const def = list.find((p) => p.isDefault) || list[0]
        setSelectedProvider(def.type)
      } else {
        // No gateway configured for this tenant — fall back to COD-only.
        setPayment('COD')
      }
    })()
  }, [])

  const { subtotal, tax, total } = guestCartTotals(items)
  const fmt = (n: number) => `Rs. ${n.toFixed(2)}`

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await loginCustomer(subdomain, email, password)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setAuthed(true)
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (items.length === 0) return setError('Your cart is empty.')
    setBusy(true)

    // Replay guest cart lines into the backend cart.
    for (const i of items) {
      const r = await addToCart({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })
      if (!r.ok) {
        setBusy(false)
        return setError(`Could not add "${i.name}" to cart: ${r.error}`)
      }
    }

    const res = await checkout({
      shippingAddress: { line1, city },
      paymentMethod: payment,
      customerName: name,
      customerPhone: phone,
    })
    if (!res.ok) {
      setBusy(false)
      return setError(res.error)
    }

    const order = res.order
    const orderId = order?.id

    if (payment === 'PREPAID' && orderId && selectedProvider) {
      const started = await startGatewayPayment(orderId, Number(order.grandTotal ?? total), selectedProvider)
      setBusy(false)
      if (!started.ok) return setError(started.error || 'Could not start payment.')
      // startGatewayPayment either redirects the browser or submits a hidden
      // form — nothing left to do on this page.
      return
    }

    // COD (or PREPAID with no provider available, which shouldn't happen
    // since the option is hidden in that case) — order is placed, done.
    clearGuestCart(subdomain)
    setBusy(false)
    if (orderId) router.push(`/orders/${orderId}`)
  }

  /** Calls payment-gateway/init and either redirects the browser to the
   * gateway (Fonepay/Stripe/PayPal return a full paymentUrl) or auto-submits
   * a hidden POST form (eSewa/ConnectIPS return formData that must be
   * submitted to paymentUrl). */
  async function startGatewayPayment(orderId: string, amount: number, providerType: string): Promise<{ ok: boolean; error?: string }> {
    const origin = window.location.origin
    const base = `${origin}/checkout/callback?orderId=${encodeURIComponent(orderId)}&providerType=${encodeURIComponent(providerType)}&amount=${encodeURIComponent(amount)}`
    // Stripe substitutes this exact literal token in the returned URL — it
    // must not be URL-encoded.
    const successUrl = providerType === 'STRIPE' ? `${base}&session_id={CHECKOUT_SESSION_ID}` : base
    const failureUrl = `${origin}/checkout/callback?orderId=${encodeURIComponent(orderId)}&providerType=${encodeURIComponent(providerType)}&amount=${encodeURIComponent(amount)}&result=failed`
    const cancelUrl = `${origin}/checkout/callback?orderId=${encodeURIComponent(orderId)}&providerType=${encodeURIComponent(providerType)}&amount=${encodeURIComponent(amount)}&result=cancelled`

    const res = await initPayment({ providerType, orderId, amount, successUrl, failureUrl, cancelUrl })
    if (!res.ok) return { ok: false, error: res.error }

    const data = res.data
    if (data.formData && data.paymentUrl) {
      submitAutoForm(data.paymentUrl, data.formData)
      return { ok: true }
    }
    if (data.paymentUrl) {
      window.location.href = data.paymentUrl
      return { ok: true }
    }
    return { ok: false, error: 'Payment gateway did not return a redirect URL.' }
  }

  function submitAutoForm(action: string, fields: Record<string, string>) {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = action
    for (const [k, v] of Object.entries(fields)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = k
      input.value = v
      form.appendChild(input)
    }
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10" style={{ color: 'var(--site-text)' }}>
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      {items.length === 0 ? (
        <p style={{ color: 'var(--site-sub)' }}>
          Your cart is empty. <Link href="/shop" className="underline">Browse products</Link>.
        </p>
      ) : (
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {!authed ? (
              <Panel title="Sign in to continue">
                <p className="text-sm mb-3" style={{ color: 'var(--site-sub)' }}>
                  Log in to place your order. New here?{' '}
                  <Link href="/register" className="underline">Create an account</Link>.
                </p>
                <form onSubmit={handleLogin} className="space-y-3">
                  <Field label="Email" type="email" value={email} onChange={setEmail} required />
                  <Field label="Password" type="password" value={password} onChange={setPassword} required />
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2.5 font-semibold disabled:opacity-60"
                    style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
                  >
                    {busy ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>
              </Panel>
            ) : (
              <form onSubmit={placeOrder} className="space-y-6">
                <Panel title="Shipping details">
                  <div className="space-y-3">
                    <Field label="Full name" value={name} onChange={setName} required />
                    <Field label="Phone" value={phone} onChange={setPhone} required />
                    <Field label="Address" value={line1} onChange={setLine1} required />
                    <Field label="City" value={city} onChange={setCity} required />
                  </div>
                </Panel>

                <Panel title="Payment method">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === 'COD'}
                        onChange={() => setPayment('COD')}
                      />
                      <span>Cash on delivery</span>
                    </label>
                    {providers.length > 0 && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          checked={payment === 'PREPAID'}
                          onChange={() => setPayment('PREPAID')}
                        />
                        <span>Pay now</span>
                      </label>
                    )}
                  </div>

                  {payment === 'PREPAID' && providers.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="block text-sm" style={{ color: 'var(--site-sub)' }}>Choose a payment provider</span>
                      {providers.map((p) => (
                        <label key={p.type} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="radio"
                            name="provider"
                            checked={selectedProvider === p.type}
                            onChange={() => setSelectedProvider(p.type)}
                          />
                          <span>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </Panel>

                {error && <p style={{ color: 'var(--site-accent)' }}>{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-3 font-semibold disabled:opacity-60"
                  style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
                >
                  {busy ? 'Placing order…' : `Place order · ${fmt(total)}`}
                </button>
              </form>
            )}
            {!authed && error && <p style={{ color: 'var(--site-accent)' }}>{error}</p>}
          </div>

          <aside
            className="h-fit p-5 space-y-3"
            style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
          >
            <h2 className="font-bold text-lg">Order summary</h2>
            {items.map((i) => (
              <div key={`${i.productId}:${i.variantId ?? ''}`} className="flex justify-between text-sm">
                <span style={{ color: 'var(--site-sub)' }}>
                  {i.name} × {i.quantity}
                </span>
                <span>{fmt(i.unitPrice * i.quantity)}</span>
              </div>
            ))}
            <div className="h-px" style={{ background: 'var(--site-border)' }} />
            <div className="flex justify-between text-sm" style={{ color: 'var(--site-sub)' }}>
              <span>Tax</span>
              <span>{fmt(tax)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="p-5"
      style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
    >
      <h2 className="font-bold text-lg mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-sm mb-1" style={{ color: 'var(--site-sub)' }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 outline-none"
        style={{
          background: 'var(--site-bg)',
          border: '1px solid var(--site-border)',
          borderRadius: 'var(--site-radius)',
          color: 'var(--site-text)',
        }}
      />
    </label>
  )
}
