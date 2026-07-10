'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { tenantCrmApi } from '@/lib/api';
import { PageHeader, KpiCard, Card, EmptyState, Badge } from '../_ui';

export default function ContactsPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tenantCrmApi.list(subdomain, { limit: 100 }).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? (r.data as any)?.data ?? [];
      setMessages(list);
    }).finally(() => setLoading(false));
  }, [subdomain]);

  const unread = messages.filter((m) => !m.isRead && m.status !== 'READ').length;

  return (
    <div>
      <PageHeader title="Contact / CRM" subtitle="Messages from your website's contact form" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <KpiCard label="Total messages" value={messages.length} accent="#4f46e5" />
        <KpiCard label="Unread" value={unread} accent="#f59e0b" />
        <KpiCard label="This week" value={messages.filter((m) => Date.now() - new Date(m.createdAt).getTime() < 7 * 864e5).length} accent="#16a34a" />
      </div>
      <Card>
        {loading ? <div className="p-10 text-center text-gray-400">Loading…</div> : messages.length === 0 ? (
          <EmptyState icon="✉️" title="No messages yet" msg="Enquiries from your public contact page land here." />
        ) : (
          <div className="divide-y divide-gray-100">
            {messages.map((m) => (
              <div key={m.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{m.name || 'Anonymous'} <span className="text-gray-400 font-normal text-sm">· {m.email || m.phone || ''}</span></div>
                  <div className="flex items-center gap-2">
                    {m.subject && <Badge color="indigo">{m.subject}</Badge>}
                    <span className="text-xs text-gray-400">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
