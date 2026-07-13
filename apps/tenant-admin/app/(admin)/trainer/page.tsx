'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, KpiCard, Card, EmptyState } from '../_ui';

export default function TrainerDashboard() {
  const subdomain = resolveTenantAdminSubdomain();
  const [me, setMe] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [today, setToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [t, m, a] = await Promise.all([
      gymApi.trainerMe(subdomain).catch(() => ({ data: null })),
      gymApi.members.list(subdomain),
      gymApi.attendance.today(subdomain).catch(() => ({ data: [] })),
    ]);
    setMe(t.data);
    setMembers(Array.isArray(m.data) ? m.data : (m.data as any)?.items ?? []);
    setToday(Array.isArray(a.data) ? a.data : (a.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-gray-400">Loading…</div>;

  const checkedInIds = new Set(today.map((a) => a.memberId));
  const clientsInGym = members.filter((m) => checkedInIds.has(m.id));

  return (
    <div>
      <PageHeader title={`Coach ${me?.name?.split(' ')[0] || 'Hub'}`} subtitle="Your clients, sessions and plans" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="My clients" value={members.length} accent="#4f46e5" />
        <KpiCard label="In gym now" value={clientsInGym.length} accent="#16a34a" />
        <KpiCard label="Check-ins today" value={today.length} accent="#0ea5e9" />
        <KpiCard label="Rating" value={me?.rating ? `★ ${me.rating}` : '—'} accent="#f59e0b" />
      </div>

      <div className="flex gap-3 mb-6">
        <Link href="/trainer/workout-builder" className="rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold">+ Build a workout</Link>
        <Link href="/trainer/clients" className="rounded-xl bg-gray-100 text-gray-700 px-4 py-2.5 text-sm font-semibold">View all clients</Link>
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900">Clients in the gym right now</div>
        {clientsInGym.length === 0 ? (
          <EmptyState icon="🏃" title="No clients checked in" msg="They’ll appear here as they arrive." />
        ) : (
          <div className="divide-y divide-gray-100">
            {clientsInGym.map((m) => {
              const name = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() || 'Member';
              return (
                <Link key={m.id} href={`/trainer/clients?id=${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">{name.charAt(0)}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{name}</div>
                    <div className="text-xs text-gray-400">{m.goals ? String(m.goals).split(',').join(' · ') : 'No goals set'}</div>
                  </div>
                  <span className="text-indigo-600 text-sm font-semibold">Open →</span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
