'use client'

import { useEffect, useRef, useState } from 'react'
import { getToken } from '@/lib/api'

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')
const API_BASE_URL = `${API_HOST}/api`

interface ChatTurn { role: 'user' | 'assistant'; text: string }

const SUGGESTIONS = [
  'What products do you have on sale?',
  'Help me find a gift under $50',
  "What's in my cart?",
  'Do you ship internationally?',
]

/**
 * Floating shopping assistant — bottom-right chat bubble for ecommerce
 * tenants, talking to the `ecommerce.shopper` AI agent (apps/api/.../
 * ecommerce/ai-integration). Mounted conditionally in app/layout.tsx.
 *
 * Positioned above FloatingWhatsApp (bottom-5 right-5, z-50) so the two
 * floating widgets stack instead of overlapping: this bubble sits higher
 * up (bottom-24) and one z-index above it.
 */
export default function ShoppingAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, loading, open])

  async function send(message: string) {
    const text = message.trim()
    if (!text || loading) return
    setInput('')
    setError(null)
    setTurns((t) => [...t, { role: 'user', text }])
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ agentKey: 'ecommerce.shopper', message: text }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setTurns((t) => [...t, { role: 'assistant', text: data.reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sorry, I couldn't reach the assistant right now. Please try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-24 right-5 z-[60] flex flex-col items-end">
      {open && (
        <div
          className="mb-3 w-[92vw] max-w-sm h-[28rem] flex flex-col shadow-2xl overflow-hidden"
          style={{ background: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)', color: 'var(--site-text)' }}
          role="dialog"
          aria-label="Shopping assistant chat"
        >
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)' }}
          >
            <div>
              <p className="font-semibold text-sm">Shopping Assistant</p>
              <p className="text-xs opacity-80">Ask me anything about our products</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-lg leading-none opacity-90 hover:opacity-100">
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 text-sm">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p style={{ color: 'var(--site-sub)' }}>Hi! I'm here to help you find the right product, check stock, or answer questions about your order. What can I help with today?</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left px-3 py-2 rounded-md border text-xs hover:opacity-80"
                    style={{ borderColor: 'var(--site-border)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={t.role === 'user' ? 'text-right' : 'text-left'}>
                <div
                  className="inline-block max-w-[85%] rounded-xl px-3 py-2 whitespace-pre-wrap"
                  style={
                    t.role === 'user'
                      ? { background: 'var(--site-primary)', color: 'var(--site-on-primary)' }
                      : { background: 'var(--site-bg)', border: '1px solid var(--site-border)' }
                  }
                >
                  {t.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs" style={{ color: 'var(--site-sub)' }}>Thinking…</div>}
            {error && <div className="text-xs text-red-400">{error}</div>}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t flex gap-2" style={{ borderColor: 'var(--site-border)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="Ask about products, orders…"
              className="flex-1 rounded-md px-3 py-2 text-sm site-input"
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)' }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close shopping assistant' : 'Open shopping assistant'}
        className="w-14 h-14 rounded-full shadow-lg text-2xl flex items-center justify-center transition-transform hover:scale-110"
        style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)' }}
      >
        {open ? '×' : '🛍️'}
      </button>
    </div>
  )
}
