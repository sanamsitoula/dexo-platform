'use client'

import { useState } from 'react'
import Link from 'next/link'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')

const TIME_SLOTS = [
  '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM',
]

interface Props {
  subdomain: string
  tenantName: string
  accent: string
  services: string[]
  preselected?: string
}

export default function BookingForm({ subdomain, tenantName, accent, services, preselected }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    service: preselected && services.includes(preselected) ? preselected : services[0] || '',
    date: '',
    time: '',
    name: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading'); setErrorMsg(null)

    // Public booking API doesn't exist (class bookings are members-only), so
    // the request lands in the tenant CRM inbox as a structured WEBSITE message.
    const message = [
      `Booking request: ${form.service} on ${form.date} at ${form.time}.`,
      form.phone ? `Phone: ${form.phone}.` : '',
      form.notes ? `Notes: ${form.notes}` : '',
    ].filter(Boolean).join(' ')

    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          subject: `Booking request — ${form.service}`,
          message,
          subdomain,
          channel: 'WEBSITE',
          source: 'tenant_website_booking_form',
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `HTTP ${res.status}`)
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
    }
  }

  if (status === 'success') {
    return (
      <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="mt-4 text-2xl font-bold">Booking request sent!</h2>
        <p className="mt-3 text-sm opacity-80">
          We&apos;ve sent your request for <strong>{form.service}</strong> on{' '}
          <strong>{form.date}</strong> at <strong>{form.time}</strong> to the {tenantName} team.
        </p>
        <p className="mt-2 text-sm opacity-60">
          You&apos;ll get a confirmation at {form.email}{form.phone ? ` or ${form.phone}` : ''} shortly.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => { setStatus('idle'); setForm((f) => ({ ...f, date: '', time: '', notes: '' })) }}
            className="px-5 py-2.5 rounded-md font-semibold border border-white/20 hover:bg-white/5"
          >
            Book another
          </button>
          <Link href="/" className="px-5 py-2.5 rounded-md font-semibold text-black" style={{ background: accent }}>
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const inputCls = 'w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-white'

  return (
    <form onSubmit={onSubmit} className="p-8 rounded-xl bg-white/5 border border-white/10 space-y-4">
      {status === 'error' && errorMsg && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          Could not send your booking: {errorMsg}
        </div>
      )}

      <div>
        <label htmlFor="service" className="block text-sm font-medium opacity-80 mb-1">Class / service *</label>
        <select id="service" required value={form.service} onChange={set('service')} className={inputCls}>
          {services.map((s) => <option key={s} value={s} className="text-black">{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium opacity-80 mb-1">Preferred date *</label>
          <input id="date" type="date" required min={today} value={form.date} onChange={set('date')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium opacity-80 mb-1">Preferred time *</label>
          <select id="time" required value={form.time} onChange={set('time')} className={inputCls}>
            <option value="" className="text-black">Select a time</option>
            {TIME_SLOTS.map((t) => <option key={t} value={t} className="text-black">{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium opacity-80 mb-1">Full name *</label>
        <input id="name" required value={form.name} onChange={set('name')} className={inputCls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium opacity-80 mb-1">Email *</label>
          <input id="email" type="email" required value={form.email} onChange={set('email')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium opacity-80 mb-1">Phone</label>
          <input id="phone" type="tel" value={form.phone} onChange={set('phone')} className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium opacity-80 mb-1">Anything we should know?</label>
        <textarea id="notes" rows={3} value={form.notes} onChange={set('notes')} className={`${inputCls} resize-y`} />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-md py-2.5 font-semibold text-black disabled:opacity-60"
        style={{ background: accent }}
      >
        {status === 'loading' ? 'Sending…' : 'Request Booking'}
      </button>
      <p className="text-xs opacity-50">
        Your request goes straight to the {tenantName} team, who will confirm availability.
      </p>
    </form>
  )
}
