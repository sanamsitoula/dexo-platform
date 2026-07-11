'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fitnessApi, publicApi } from '../../lib/api';

export default function CoachPage() {
  const [info, setInfo] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [trainer, setTrainer] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async (memberId: string, trainerId?: string) => {
    const r = trainerId
      ? await fitnessApi.coach.thread(memberId, trainerId)
      : await fitnessApi.coach.messages(memberId);
    const list = Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? [];
    // The member-messages endpoint returns newest-first; the chat renders oldest-first.
    setMessages(trainerId ? list : [...list].reverse());
    if (trainerId) fitnessApi.coach.markThreadRead(memberId, trainerId).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const [i, m] = await Promise.all([publicApi.info(), fitnessApi.me()]);
      setInfo(i.data);
      const mem = m.data;
      setMember(mem);
      if (mem?.id) {
        // Prefer the member's assigned trainer; otherwise the first trainer on staff.
        let t = mem.trainer ?? null;
        if (!t) {
          const ts = await fitnessApi.trainers();
          const list = Array.isArray(ts.data) ? ts.data : (ts.data as any)?.items ?? [];
          t = mem.trainerId ? list.find((x: any) => x.id === mem.trainerId) ?? list[0] : list[0];
        }
        setTrainer(t ?? null);
        await loadThread(mem.id, t?.id);
      }
      setLoading(false);
    })();
  }, [loadThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!text.trim() || !member?.id) return;
    setSending(true);
    const r = await fitnessApi.coach.send({ memberId: member.id, trainerId: trainer?.id, senderType: 'MEMBER', message: text.trim() });
    setSending(false);
    if (!r.error) {
      setText('');
      loadThread(member.id, trainer?.id);
    }
  }

  const primary = info?.colorPrimary || '#E85D24';
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="flex flex-col h-screen pb-16">
      <div className="px-6 pt-10 pb-4 border-b border-gray-100 bg-white flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 -tracking-tight">Your coach</h1>
          <p className="text-sm text-gray-500 mt-1">
            {trainer ? `${trainer.name}${trainer.specialization ? ` · ${trainer.specialization}` : ''}` : 'No trainer assigned yet — messages go to the gym team.'}
          </p>
        </div>
        <a href="/coach/ai" className="shrink-0 px-3 py-2 rounded-lg bg-orange-50 text-orange-600 text-xs font-semibold whitespace-nowrap">
          ✨ Ask AI
        </a>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl">💬</div>
            <p className="text-sm text-gray-500 mt-3">Say hello to your coach — ask about your plan, form, or schedule.</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderType === 'MEMBER';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'text-white rounded-br-md' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md'}`}
                  style={mine ? { background: primary } : {}}
                >
                  {m.message}
                  <div className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 bg-white px-4 py-3 flex gap-2">
        <input
          className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
          placeholder="Message your coach…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="rounded-full px-5 py-2.5 text-white text-sm font-bold disabled:opacity-40"
          style={{ background: primary }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
