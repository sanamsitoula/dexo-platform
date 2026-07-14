'use client';

import { useEffect, useState, useCallback } from 'react';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, KpiCard, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

export default function MembersPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', membershipType: 'MONTHLY' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // "Manage plan" slide-over state
  const [manageMember, setManageMember] = useState<any | null>(null);
  const [dates, setDates] = useState({ startDate: '', endDate: '' });
  const [extendDays, setExtendDays] = useState('15');
  const [assignPlanId, setAssignPlanId] = useState('');
  const [assignStart, setAssignStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [manageErr, setManageErr] = useState<string | null>(null);
  const [manageMsg, setManageMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [m, s, e, p] = await Promise.all([
      gymApi.members.list(subdomain),
      gymApi.members.stats(subdomain),
      gymApi.memberships.expiring(subdomain, 7),
      gymApi.plans.list(subdomain),
    ]);
    const list = Array.isArray(m.data) ? m.data : (m.data as any)?.items ?? [];
    setMembers(list);
    setStats(s.data);
    setExpiring(Array.isArray(e.data) ? e.data : (e.data as any)?.items ?? []);
    setPlans(Array.isArray(p.data) ? p.data : (p.data as any)?.items ?? []);
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

  function toDateInput(d: string | Date) {
    return new Date(d).toISOString().slice(0, 10);
  }

  function openManage(m: any) {
    const ms = m.memberships?.[0];
    setManageMember(m);
    setManageErr(null); setManageMsg(null);
    setExtendDays('15');
    setAssignPlanId(''); setAssignStart(toDateInput(new Date()));
    setDates(ms ? { startDate: toDateInput(ms.startDate), endDate: toDateInput(ms.endDate) } : { startDate: '', endDate: '' });
  }

  const manageMembership = manageMember?.memberships?.[0];

  async function saveDates() {
    if (!manageMembership) return;
    setBusy(true); setManageErr(null); setManageMsg(null);
    const res = await gymApi.memberships.update(subdomain, manageMembership.id, { startDate: dates.startDate, endDate: dates.endDate });
    setBusy(false);
    if (res.error) return setManageErr(res.error);
    setManageMsg('Membership period updated. The member is notified in their app.');
    load();
  }

  async function extend(days: number) {
    if (!manageMembership || !days || days <= 0) return setManageErr('Days must be a positive number');
    setBusy(true); setManageErr(null); setManageMsg(null);
    const res = await gymApi.memberships.extend(subdomain, manageMembership.id, days);
    setBusy(false);
    if (res.error) return setManageErr(res.error);
    setManageMsg(`Extended by ${days} days at no extra charge. The member is notified in their app.`);
    setDates((d) => ({ ...d, endDate: res.data?.endDate ? toDateInput(res.data.endDate) : d.endDate }));
    load();
  }

  async function assignPlan() {
    if (!manageMember || !assignPlanId) return setManageErr('Pick a plan first');
    setBusy(true); setManageErr(null); setManageMsg(null);
    const res = await gymApi.memberships.create(subdomain, {
      memberId: manageMember.id,
      planId: assignPlanId,
      startDate: assignStart || undefined,
      status: 'ACTIVE',
    });
    setBusy(false);
    if (res.error) return setManageErr(res.error);
    setManageMsg('Plan assigned.');
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

      {expiring.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">⏳ {expiring.length} membership{expiring.length === 1 ? '' : 's'} expiring within 7 days:</span>{' '}
          {expiring.slice(0, 5).map((e: any, i: number) => {
            const n = `${e.member?.user?.firstName ?? ''} ${e.member?.user?.lastName ?? ''}`.trim() || 'Member';
            return <span key={e.id}>{i > 0 && ', '}{n} ({new Date(e.endDate).toLocaleDateString()})</span>;
          })}
          {expiring.length > 5 && ` and ${expiring.length - 5} more`}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total members" value={stats?.total ?? members.length} accent="#4f46e5" />
        <KpiCard label="Active" value={stats?.active ?? active} accent="#16a34a" />
        <KpiCard label="Pending" value={pending} accent="#f59e0b" />
        <KpiCard label="Expiring in 7d" value={expiring.length} accent="#dc2626" />
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
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex gap-2">
                          {!m.isVerified && <Btn variant="outline" onClick={async () => { await gymApi.members.verify(subdomain, m.id); load(); }}>Verify</Btn>}
                          <Btn variant="outline" onClick={() => openManage(m)}>Manage plan</Btn>
                        </span>
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

      <SlideOver open={!!manageMember} onClose={() => setManageMember(null)} title="Manage plan">
        {manageMember && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-semibold text-gray-900">
                {`${manageMember.user?.firstName ?? ''} ${manageMember.user?.lastName ?? ''}`.trim() || 'Member'}
              </span>
              {manageMembership ? (
                <> — {manageMembership.plan?.name} <Badge color={String(manageMembership.status).toUpperCase() === 'ACTIVE' ? 'green' : String(manageMembership.status).toUpperCase() === 'EXPIRED' ? 'red' : 'gray'}>{manageMembership.status}</Badge></>
              ) : (
                <> — no membership yet</>
              )}
            </p>

            {manageMembership && (
              <>
                <div className="mb-5">
                  <div className="text-xs font-bold uppercase text-gray-400 mb-2">Membership period</div>
                  <Field label="Start date"><Input type="date" value={dates.startDate} onChange={(e: any) => setDates({ ...dates, startDate: e.target.value })} /></Field>
                  <Field label="End date (expiry)"><Input type="date" value={dates.endDate} onChange={(e: any) => setDates({ ...dates, endDate: e.target.value })} /></Field>
                  <Btn onClick={saveDates} disabled={busy || !dates.startDate || !dates.endDate}>{busy ? 'Saving…' : 'Save dates'}</Btn>
                </div>

                <div className="mb-5 border-t border-gray-100 pt-4">
                  <div className="text-xs font-bold uppercase text-gray-400 mb-2">Extend at same price</div>
                  <p className="text-xs text-gray-500 mb-2">Adds days to the current expiry without charging the member.</p>
                  <div className="flex gap-2 mb-3">
                    {[7, 15, 30].map((d) => (
                      <Btn key={d} variant="outline" onClick={() => extend(d)} disabled={busy}>+{d} days</Btn>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input type="number" value={extendDays} onChange={(e: any) => setExtendDays(e.target.value)} />
                    <Btn variant="outline" onClick={() => extend(parseInt(extendDays))} disabled={busy}>Extend</Btn>
                  </div>
                </div>
              </>
            )}

            <div className="mb-4 border-t border-gray-100 pt-4">
              <div className="text-xs font-bold uppercase text-gray-400 mb-2">{manageMembership ? 'Assign a new plan' : 'Assign plan'}</div>
              <Field label="Plan">
                <select value={assignPlanId} onChange={(e) => setAssignPlanId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Choose a plan…</option>
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.durationDays} days — NPR {p.totalWithVat ?? p.priceNpr}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start date"><Input type="date" value={assignStart} onChange={(e: any) => setAssignStart(e.target.value)} /></Field>
              <p className="text-xs text-gray-400 mb-2">Expiry is calculated automatically from the plan&apos;s duration.</p>
              <Btn variant="outline" onClick={assignPlan} disabled={busy || !assignPlanId}>{busy ? 'Assigning…' : 'Assign plan'}</Btn>
            </div>

            {manageErr && <p className="text-sm text-red-600 mb-2">{manageErr}</p>}
            {manageMsg && <p className="text-sm text-green-600 mb-2">{manageMsg}</p>}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
