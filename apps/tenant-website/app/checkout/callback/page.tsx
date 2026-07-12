'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { verifyPayment, confirmPayment } from '@/lib/api'

/** Return page for the real payment gateways (eSewa/Fonepay/ConnectIPS/Stripe/
 * PayPal). We build the successUrl/failureUrl/cancelUrl at checkout time with
 * our own orderId/providerType/amount in the query string (eSewa/Fonepay/
 * ConnectIPS verify against those directly, not gateway echo params), plus
 * whatever the gateway itself appends on return — Stripe's `session_id` and
 * PayPal's `token`/`PayerID`, both read here via rawParams. */
function CheckoutCallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [state, setState] = useState<'verifying' | 'success' | 'failed' | 'cancelled'>('verifying')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const orderId = params.get('orderId')
    const providerType = params.get('providerType')
    const amountStr = params.get('amount')
    const result = params.get('result')

    if (result === 'cancelled') {
      setState('cancelled')
      return
    }
    if (result === 'failed') {
      setState('failed')
      return
    }
    if (!orderId || !providerType) {
      setState('failed')
      setMessage('Missing order details in the payment return URL.')
      return
    }

    const rawParams: Record<string, string> = {}
    params.forEach((v, k) => { rawParams[k] = v })

    const providerTxnId = params.get('session_id') || params.get('token') || params.get('ref_id') || ''
    const amount = amountStr ? Number(amountStr) : undefined

    ;(async () => {
      const verifyRes = await verifyPayment({ providerType, providerTxnId, orderId, amount, rawParams })
      if (!verifyRes.ok || verifyRes.data.status !== 'COMPLETED') {
        setState('failed')
        setMessage((verifyRes.ok ? verifyRes.data.message : verifyRes.error) || 'Payment could not be verified.')
        return
      }

      const confirmRes = await confirmPayment(orderId, {
        providerType,
        providerTxnId: verifyRes.data.providerTxnId || providerTxnId,
        amount: verifyRes.data.amount ?? amount,
        rawParams,
      })
      if (!confirmRes.ok) {
        setState('failed')
        setMessage(confirmRes.error || 'Payment verified but the order could not be confirmed.')
        return
      }

      setState('success')
      router.replace(`/orders/${orderId}`)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (state === 'verifying') {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center" style={{ color: 'var(--site-text)' }}>
        <div className="text-4xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold">Confirming your payment…</h1>
        <p className="mt-2" style={{ color: 'var(--site-sub)' }}>Please don&apos;t close this page.</p>
      </main>
    )
  }

  if (state === 'success') {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center" style={{ color: 'var(--site-text)' }}>
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-2xl font-bold">Payment confirmed</h1>
        <p className="mt-2" style={{ color: 'var(--site-sub)' }}>Redirecting to your order…</p>
      </main>
    )
  }

  const title = state === 'cancelled' ? 'Payment cancelled' : 'Payment failed'
  const icon = state === 'cancelled' ? '↩️' : '⚠️'

  return (
    <main className="max-w-xl mx-auto px-4 py-16 text-center" style={{ color: 'var(--site-text)' }}>
      <div className="text-4xl mb-4">{icon}</div>
      <h1 className="text-2xl font-bold">{title}</h1>
      {message && <p className="mt-2" style={{ color: 'var(--site-sub)' }}>{message}</p>}
      <div className="flex gap-3 justify-center mt-8">
        <Link
          href="/checkout"
          className="px-5 py-2.5 font-semibold"
          style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
        >
          Back to checkout
        </Link>
        <Link
          href="/cart"
          className="px-5 py-2.5 font-semibold border"
          style={{ borderColor: 'var(--site-border)', borderRadius: 'var(--site-radius)' }}
        >
          View cart
        </Link>
      </div>
    </main>
  )
}

export default function CheckoutCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutCallbackInner />
    </Suspense>
  )
}
