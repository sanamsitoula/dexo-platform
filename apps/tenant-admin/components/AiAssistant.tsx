'use client'

import { useEffect, useRef, useState } from 'react'

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')
const API_BASE_URL = `${API_HOST}/api`

function resolveTenantSlug(): string {
  if (typeof document === 'undefined') return ''
  return (
    document.cookie.match(/(?:^|;\s*)dexo-tenant-slug=([^;]+)/)?.[1] ||
    localStorage.getItem('dexo-tenant-slug') ||
    ''
  )
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  const slug = resolveTenantSlug()
  return localStorage.getItem(`tenant-token-${slug}`) || localStorage.getItem('token')
}

interface AgentSummary { key: string; name: string; description: string }
interface ChatTurn { role: 'user' | 'assistant'; text: string; toolCalls?: Array<{ tool: string }> }

/**
 * Floating AI Assistant widget for tenant-admin — talks to the Dexo AI
 * Platform's generic gateway (POST /api/ai/chat). Only staff/admin ever log
 * into tenant-admin, so the staff personas (Reception/Trainer/Nutrition/
 * Management/Finance) are safe to expose here; the member-only "My Coach"
 * agent lives in tenant-app instead (see docs/ai/00_AI_MASTER_ARCHITECTURE.md).
 */
export default function AiAssistant() {
  const [open, setOpen] = useState(false)
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [agentKey, setAgentKey] = useState<string>('')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || agents.length) return
    const token = getToken()
    if (!token) return
    fetch(`${API_BASE_URL}/ai/agents`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: AgentSummary[]) => {
        // Tenant-admin is staff-only — hide the member-facing self-scoped agent.
        const staffAgents = list.filter((a) => a.key !== 'fitness.member')
        setAgents(staffAgents)
        if (staffAgents.length) setAgentKey(staffAgents[0].key)
      })
      .catch(() => setError('Could not load assistants'))
  }, [open, agents.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, loading])

  async function send() {
    const message = input.trim()
    if (!message || !agentKey || loading) return
    setInput('')
    setError(null)
    setTurns((t) => [...t, { role: 'user', text: message }])
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ agentKey, message }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setTurns((t) => [...t, { role: 'assistant', text: data.reply, toolCalls: data.toolCalls }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 flex items-center justify-center text-2xl transition"
        title="AI Assistant"
      >
        {open ? '✕' : '✨'}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[380px] max-w-[92vw] h-[560px] max-h-[75vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-slate-900 text-white flex items-center justify-between">
            <span className="font-semibold text-sm">AI Assistant</span>
            {agents.length > 0 && (
              <select
                value={agentKey}
                onChange={(e) => { setAgentKey(e.target.value); setTurns([]) }}
                className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
              >
                {agents.map((a) => (
                  <option key={a.key} value={a.key} className="text-black">{a.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {turns.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-8">
                {agents.find((a) => a.key === agentKey)?.description || 'Ask a question to get started.'}
              </p>
            )}
            {turns.map((t, i) => (
              <div key={i} className={t.role === 'user' ? 'text-right' : 'text-left'}>
                <div
                  className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    t.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {t.text}
                </div>
                {t.toolCalls && t.toolCalls.length > 0 && (
                  <div className="mt-1 text-[10px] text-gray-400">
                    used: {t.toolCalls.map((c) => c.tool).join(', ')}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="text-xs text-gray-400">Thinking…</div>}
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about members, revenue, plans…"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}
