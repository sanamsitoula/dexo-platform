'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getToken } from '../../../lib/api';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
const API_BASE_URL = `${API_HOST}/api`;

interface ChatTurn { role: 'user' | 'assistant'; text: string }

const SUGGESTIONS = [
  'How is my progress this month?',
  "What's my current workout plan?",
  'Recommend adjustments to my diet plan',
  'When does my membership expire?',
];

/**
 * "My Coach" — the member-facing AI assistant. Always uses the
 * `fitness.member` agent, which is self-scoped server-side: its tools
 * cannot accept another member's id no matter what's asked here, so this
 * page is safe to expose to any signed-in member (see
 * apps/api/.../fitness/ai-integration/tools/member-self-tools.ts).
 */
export default function MyCoachPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, loading]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    setInput('');
    setError(null);
    setTurns((t) => [...t, { role: 'user', text }]);
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ agentKey: 'fitness.member', message: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setTurns((t) => [...t, { role: 'assistant', text: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <Link href="/coach" className="text-gray-400">←</Link>
        <div>
          <h1 className="font-bold text-gray-900">My Coach</h1>
          <p className="text-xs text-gray-500">Ask about your plans, progress or membership</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {turns.length === 0 && (
          <div className="space-y-2 mt-4">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-gray-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                t.role === 'user' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-400">Thinking…</div>}
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-100 flex gap-2 pb-24">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Ask My Coach…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
