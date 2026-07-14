'use client';

import { useEffect, useState } from 'react';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Field, Input } from '../_ui';

const AUDIENCES = [
  { key: 'ALL', label: 'All members' },
  { key: 'ACTIVE', label: 'Active members' },
  { key: 'EXPIRING', label: 'Expiring soon' },
];

interface SentAnnouncement {
  title: string;
  message: string;
  audience?: string;
  sentAt: string;
  recipients?: number;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AnnouncementsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<SentAnnouncement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  async function loadHistory() {
    setHistoryLoading(true);
    const r = await gymApi.announcements.list(subdomain);
    const list = Array.isArray(r.data) ? r.data : [];
    list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    setHistory(list);
    setHistoryLoading(false);
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  async function send() {
    if (!title || !message) return;
    setBusy(true); setResult(null);
    const r = await gymApi.announcements.send(subdomain, { title, message, audience });
    setBusy(false);
    if (r.error) setResult({ ok: false, text: r.error });
    else {
      setResult({ ok: true, text: 'Announcement sent 🎉' });
      setTitle(''); setMessage('');
      loadHistory(); // refresh so the send is immediately visible below
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Announcements" subtitle="Push news & offers to your members’ apps" />

      <Card className="p-6">
        <Field label="Title"><Input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="Dashain offer — 20% off yearly plans" /></Field>
        <Field label="Message">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
            placeholder="Write your announcement…" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </Field>
        <Field label="Audience">
          <div className="flex gap-2">
            {AUDIENCES.map((a) => (
              <button key={a.key} onClick={() => setAudience(a.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${audience === a.key ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600'}`}>
                {a.label}
              </button>
            ))}
          </div>
        </Field>
        {result && <p className={`text-sm mb-3 ${result.ok ? 'text-green-600' : 'text-red-600'}`}>{result.text}</p>}
        <Btn onClick={send} disabled={busy || !title || !message}>{busy ? 'Sending…' : 'Send announcement'}</Btn>
      </Card>

      {/* Live preview */}
      <div className="mt-6">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Preview (member app)</div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm max-w-sm">
          <div className="flex items-center gap-2 text-xs text-gray-400"><span>📣</span> Announcement</div>
          <div className="font-bold text-gray-900 mt-1">{title || 'Your title appears here'}</div>
          <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{message || 'Your message preview…'}</div>
        </div>
      </div>

      {/* Recent announcements — same GET /notifications/announcements the
          member portal (tenant-app) reads, so this confirms a send actually
          lands for members. */}
      <div className="mt-8">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent announcements</div>
        {historyLoading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-gray-400">Nothing sent yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map((a, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-gray-900">{a.title}</div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(a.sentAt)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  {a.audience && (
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {a.audience}
                    </span>
                  )}
                  {typeof a.recipients === 'number' && (
                    <span className="text-xs text-gray-400">{a.recipients} recipient{a.recipients === 1 ? '' : 's'}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
