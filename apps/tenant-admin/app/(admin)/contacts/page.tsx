'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { tenantCrmApi } from '@/lib/api';
import { PageHeader, KpiCard, Card, EmptyState, Badge, Btn } from '../_ui';

const CHANNELS: Record<string, { icon: string; label: string }> = {
  WEBSITE: { icon: '🌐', label: 'Website' },
  EMAIL: { icon: '✉️', label: 'Email' },
  WHATSAPP: { icon: '🟢', label: 'WhatsApp' },
  VIBER: { icon: '🟣', label: 'Viber' },
  FACEBOOK: { icon: '📘', label: 'Facebook' },
  INSTAGRAM: { icon: '📸', label: 'Instagram' },
  TIKTOK: { icon: '🎵', label: 'TikTok' },
  SMS: { icon: '💬', label: 'SMS' },
};

export default function ContactsPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('all');
  const [showSetup, setShowSetup] = useState(false);
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');

  useEffect(() => {
    tenantCrmApi.list(subdomain, { limit: 100 }).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? (r.data as any)?.data ?? [];
      setMessages(list);
    }).finally(() => setLoading(false));
  }, [subdomain]);

  const filtered = channel === 'all' ? messages : messages.filter((m) => (m.channel || 'WEBSITE') === channel);
  const unread = messages.filter((m) => !m.isRead && m.status !== 'READ').length;

  return (
    <div>
      <PageHeader title="Contact / CRM" subtitle="Omni-channel inbox — website, WhatsApp, socials, email"
        action={<Btn variant="outline" onClick={() => setShowSetup((s) => !s)}>{showSetup ? 'Hide' : '⚙ Channel setup'}</Btn>} />

      {showSetup && (
        <Card className="p-5 mb-6">
          <div className="font-bold text-gray-900">Connect your channels</div>
          <p className="text-sm text-gray-500 mt-1 mb-3">
            Point each platform&apos;s webhook / automation at the matching URL below — incoming messages
            appear in this inbox tagged with their channel. Body: <code className="font-mono text-xs bg-gray-100 px-1 rounded">{'{ "name", "message", "externalId", "phone" }'}</code>
          </p>
          <div className="space-y-1.5">
            {Object.entries(CHANNELS).filter(([k]) => k !== 'WEBSITE').map(([key, c]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="w-28 shrink-0 font-semibold text-gray-700">{c.icon} {c.label}</span>
                <code className="flex-1 font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap">
                  POST {apiBase}/api/contact/inbound/{key.toLowerCase()}?tenant={subdomain}
                </code>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            WhatsApp Business Cloud API, Meta Messenger/Instagram, TikTok and Viber all support webhook targets —
            paste the URL in each platform&apos;s developer console (or via Zapier/Make for email &amp; TikTok DMs).
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <KpiCard label="Total messages" value={messages.length} accent="#4f46e5" />
        <KpiCard label="Unread" value={unread} accent="#f59e0b" />
        <KpiCard label="This week" value={messages.filter((m) => Date.now() - new Date(m.createdAt).getTime() < 7 * 864e5).length} accent="#16a34a" />
      </div>

      {/* Channel filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setChannel('all')} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${channel === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>All ({messages.length})</button>
        {Object.entries(CHANNELS).map(([key, c]) => {
          const n = messages.filter((m) => (m.channel || 'WEBSITE') === key).length;
          if (n === 0 && channel !== key) return null;
          return (
            <button key={key} onClick={() => setChannel(key)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${channel === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
              {c.icon} {c.label} ({n})
            </button>
          );
        })}
      </div>

      <Card>
        {loading ? <div className="p-10 text-center text-gray-400">Loading…</div> : filtered.length === 0 ? (
          <EmptyState icon="✉️" title="No messages yet" msg="Enquiries from your website and connected channels land here." />
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((m) => {
              const c = CHANNELS[(m.channel || 'WEBSITE') as string] ?? CHANNELS.WEBSITE;
              return (
                <div key={m.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">
                      <span className="mr-1.5" title={c.label}>{c.icon}</span>
                      {m.name || 'Anonymous'} <span className="text-gray-400 font-normal text-sm">· {m.email || m.phone || ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="gray">{c.label}</Badge>
                      {m.subject && <Badge color="indigo">{m.subject}</Badge>}
                      <span className="text-xs text-gray-400">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{m.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
