'use client';

import { useEffect, useState } from 'react';
import { notificationsApi, publicApi, type Announcement, type AppNotification } from '../../lib/api';

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
  const [info, setInfo] = useState<any>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [personal, setPersonal] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [i, a, p] = await Promise.all([
        publicApi.info(),
        notificationsApi.announcements(),
        notificationsApi.mine().catch(() => ({ data: null }) as any),
      ]);
      if (i.data) setInfo(i.data);
      const list = Array.isArray(a.data) ? a.data : [];
      // Backend returns oldest last already, but sort defensively by sentAt desc.
      list.sort((x, y) => new Date(y.sentAt).getTime() - new Date(x.sentAt).getTime());
      setItems(list);
      setPersonal(p.data?.items ?? []);
      setLoading(false);
    })();
  }, []);

  async function markPersonalRead(n: AppNotification) {
    if (n.isRead) return;
    setPersonal((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    await notificationsApi.markRead(n.id);
  }

  const primary = info?.colorPrimary || '#E85D24';

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-extrabold text-gray-900 px-2 -tracking-tight">Announcements</h1>
      <p className="text-gray-500 px-2 mt-1 text-sm">Updates from {info?.name || 'your gym'}.</p>

      {personal.length > 0 && (
        <div className="mt-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 px-2">For you</h2>
          <div className="mt-2 space-y-3">
            {personal.map((n) => (
              <div
                key={n.id}
                onClick={() => markPersonalRead(n)}
                className={`rounded-3xl bg-white border shadow-sm p-5 cursor-pointer ${n.isRead ? 'border-gray-100' : 'border-2'}`}
                style={n.isRead ? undefined : { borderColor: primary }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-extrabold text-gray-900 flex items-center gap-2">
                    {!n.isRead && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: primary }} />}
                    {n.title}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">{n.message}</p>
              </div>
            ))}
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 px-2 mt-6">Announcements</h2>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-gray-300 p-8 text-center">
          <div className="text-4xl">📣</div>
          <p className="mt-3 font-bold text-gray-900">No announcements yet</p>
          <p className="text-sm text-gray-500 mt-1">Check back later for updates from the gym.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((a, i) => (
            <div key={i} className="rounded-3xl bg-white border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="font-extrabold text-gray-900">{a.title}</div>
                <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(a.sentAt)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">{a.message}</p>
              {a.audience && (
                <span className="inline-block mt-3 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: primary + '15', color: primary }}>
                  {a.audience}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
