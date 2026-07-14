'use client';

import { useEffect, useState, useCallback } from 'react';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, KpiCard, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

export default function MembersPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', membershipType: 'MONTHLY' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [m, s] = await Promise.all([gymApi.members.list(subdomain), gymApi.members.stats(subdomain)]);
    const list = Array.isArray(m.data) ? m.data : (m.data as any)?.items ?? [];
    setMembers(list);
    setStats(s.data);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    const res = await gymApi.members.create(subdomain, form);
    setSaving(false);
    if (res.error) return setErr(res.error);
    setOpen(false);
    setForm({ firstName: '', lastName: '', email: '', phone: '', membershipType: 'MONTHLY' });
    load();
  }

  const filtered = members.filter((m) => {
    const name = `${m.user?.firstName ?? m.firstName ?? ''} ${m.user?.lastName ?? m.lastName ?? ''}`.toLowerCase();
    return !q || name.includes(q.toLowerCase()) || (m.user?.email || '').toLowerCase().includes(q.toLowerCase());
  });
  const active = members.filter((m) => String(m.status).toUpperCase() === 'ACTIVE').length;
  const pending = members.filter((m) => String(m.status).toUpperCase().includes('PENDING')).length;

  return (
    <div>
      <PageHeader title="Members" subtitle="Everyone training at your gym"
        action={<Btn onClick={() => setOpen(true)}>+ Add member</Btn>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total members" value={stats?.total ?? members.length} accent="#4f46e5" />
        <KpiCard label="Active" value={stats?.active ?? active} accent="#16a34a" />
        <KpiCard label="Pending" value={pending} accent="#f59e0b" />
        <KpiCard label="New this month" value={stats?.newThisMonth ?? '—'} accent="#0ea5e9" />
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members…"
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
        </div>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🧍" title="No members yet" msg="Add your first member or let them self-register." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Member</th>
                  <th className="text-left font-semibold px-4 py-3">Contact</th>
                  <th className="text-left font-semibold px-4 py-3">Plan</th>
                  <th className="text-left font-semibold px-4 py-3">Cycle</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((m) => {
                  const name = `${m.user?.firstName ?? m.firstName ?? ''} ${m.user?.lastName ?? m.lastName ?? ''}`.trim() || 'Member';
                  const st = String(m.status || '').toUpperCase();
                  const activeMembership = m.memberships?.[0];
                  const expired = activeMembership?.endDate && new Date(activeMembership.endDate) < new Date();
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">{name.charAt(0)}</div>
                          <span className="font-semibold text-gray-900">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.user?.email || '—'}<div className="text-xs text-gray-400">{m.user?.phone || ''}</div></td>
                      <td className="px-4 py-3 text-gray-600">{activeMembership?.plan?.name || m.membershipType || '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        {activeMembership?.startDate && activeMembership?.endDate ? (
                          <span className={expired ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                            {new Date(activeMembership.startDate).toLocaleDateString()} → {new Date(activeMembership.endDate).toLocaleDateString()}
                            {expired && ' (expired)'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3"><Badge color={st === 'ACTIVE' ? 'green' : st.includes('PENDING') ? 'amber' : 'gray'}>{st || 'N/A'}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {!m.isVerified && <Btn variant="outline" onClick={async () => { await gymApi.members.verify(subdomain, m.id); load(); }}>Verify</Btn>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SlideOver open={open} onClose={() => setOpen(false)} title="Add member">
        <Field label="First name"><Input value={form.firstName} onChange={(e: any) => setForm({ ...form, firstName: e.target.value })} /></Field>
        <Field label="Last name"><Input value={form.lastName} onChange={(e: any) => setForm({ ...form, lastName: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Membership type">
          <select value={form.membershipType} onChange={(e) => setForm({ ...form, membershipType: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {['DAY_PASS', 'MONTHLY', 'QUARTERLY', 'HALF_YEAR', 'YEARLY'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={save} disabled={saving || !form.firstName}>{saving ? 'Saving…' : 'Create member'}</Btn>
      </SlideOver>
    </div>
  );
}
