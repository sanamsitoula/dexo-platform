'use client';

import { useEffect, useState, useCallback } from 'react';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, EmptyState, Badge } from '../_ui';

const typeMeta: Record<string, { icon: string; color: 'green' | 'amber' | 'gray' | 'red' | 'indigo' }> = {
  MEMBERSHIP_EXPIRING: { icon: '⏳', color: 'amber' },
  MEMBERSHIP_EXPIRED: { icon: '⛔', color: 'red' },
  MEMBERSHIP_EXTENDED: { icon: '✅', color: 'green' },
};

export default function AlertsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await gymApi.alerts.list(subdomain, { limit: 50 });
    if (res.data) {
      setItems(res.data.items ?? []);
      setUnread(res.data.unread ?? 0);
    }
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function markAll() {
    await gymApi.alerts.markAllRead(subdomain);
    load();
  }

  async function markOne(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await gymApi.alerts.markRead(subdomain, id);
  }

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Membership expiry reminders and plan changes"
        action={unread > 0 ? <Btn variant="outline" onClick={markAll}>Mark all read ({unread})</Btn> : undefined}
      />

      <Card>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState icon="🔔" title="No alerts yet" msg="Expiring and expired memberships will appear here automatically." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((n) => {
              const meta = typeMeta[n.type] ?? { icon: '🔔', color: 'gray' as const };
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 ${n.isRead ? '' : 'bg-indigo-50/40'}`}
                  onClick={() => !n.isRead && markOne(n.id)}
                >
                  <span className="text-xl leading-none mt-0.5">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${n.isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</span>
                      <Badge color={meta.color}>{String(n.type || '').replace(/_/g, ' ').toLowerCase()}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
