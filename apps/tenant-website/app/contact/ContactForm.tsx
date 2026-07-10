'use client'

import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export default function ContactForm({ subdomain }: { subdomain: string }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading'); setErrorMsg(null)
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subdomain, source: 'tenant_website_contact_form' }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `HTTP ${res.status}`)
      }
      setStatus('success')
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Send a Message</h2>
      <p className="text-sm text-slate-600 -mt-2">
        Fill out the form below and we&apos;ll get back to you within 24 hours.
      </p>

      {status === 'success' && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          ✅ Thank you for your message! We&apos;ll get back to you soon.
        </div>
      )}
      {status === 'error' && errorMsg && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-800">
          Error: {errorMsg}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
        <input id="name" name="name" required value={form.name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
          <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
        <input id="subject" name="subject" value={form.subject} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
        <textarea id="message" name="message" required rows={5} value={form.message} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md resize-y" />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 font-medium disabled:opacity-50"
      >
        {status === 'loading' ? 'Sending…' : 'Send Message'}
      </button>
      <p className="text-xs text-slate-500">
        Submitting sends your message to <strong>{subdomain}</strong> via the Dexo platform.
      </p>
    </form>
  )
}