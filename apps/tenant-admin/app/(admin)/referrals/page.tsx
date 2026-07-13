'use client';

import { useEffect, useState, useCallback } from 'react';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

const statusColor: any = { PENDING: 'amber', ACCEPTED: 'indigo', COMPLETED: 'green', EXPIRED: 'gray' };

export default function ReferralsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [rows, setRows] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ referrerId: '', refereeEmail: '', refereePhone: '', rewardType: 'DISCOUNT', rewardValue: 500 });

  const load = useCallback(async () => {
    const [r, m] = await Promise.all([gymApi.referrals.list(subdomain), gymApi.members.list(subdomain)]);
    setRows(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []);
    setMembers(Array.isArray(m.data) ? m.data : (m.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    const r = await gymApi.referrals.create(subdomain, { ...form, rewardValue: Number(form.rewardValue) });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  async function complete(id: string) { await gymApi.referrals.complete(subdomain, id); load(); }

  const memberName = (m: any) => m?.user ? `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() : (m?.id ?? '').slice(0, 8);

  return (
    <div>
      <PageHeader title="Referrals" subtitle="Member referral program"
        action={<Btn onClick={() => setOpen(true)}>+ New referral</Btn>} />
      {loading ? <div className="text-gray-400">Loading…</div> : rows.length === 0 ? (
        <Card><EmptyState icon="🤝" title="No referrals yet" msg="Create a referral code for a member." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-5 py-3">Code</th><th className="px-5 py-3">Referrer</th><th className="px-5 py-3">Referee</th>
                <th className="px-5 py-3">Reward</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono font-medium text-gray-900">{r.referralCode}</td>
                  <td className="px-5 py-3">{memberName(r.referrer)}</td>
                  <td className="px-5 py-3 text-gray-500">{r.referee ? memberName(r.referee) : r.refereeEmail ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{r.rewardType ? `${r.rewardType} ${r.rewardValue ?? ''}` : '—'}</td>
                  <td className="px-5 py-3"><Badge color={statusColor[r.status] ?? 'gray'}>{r.status}</Badge></td>
                  <td className="px-5 py-3">{['PENDING', 'ACCEPTED'].includes(r.status) && <Btn variant="ghost" onClick={() => complete(r.id)}>Mark completed</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="New referral">
        <Field label="Referring member">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.referrerId} onChange={(e) => setForm({ ...form, referrerId: e.target.value })}>
            <option value="">Select member…</option>
            {members.map((m: any) => <option key={m.id} value={m.id}>{m.user ? `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() || m.user.email : m.id.slice(0, 8)}</option>)}
          </select>
        </Field>
        <Field label="Friend's email"><Input type="email" value={form.refereeEmail} onChange={(e: any) => setForm({ ...form, refereeEmail: e.target.value })} /></Field>
        <Field label="Friend's phone (optional)"><Input value={form.refereePhone} onChange={(e: any) => setForm({ ...form, refereePhone: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reward type">
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.rewardType} onChange={(e) => setForm({ ...form, rewardType: e.target.value })}>
              {['DISCOUNT', 'FREE_DAYS', 'CASHBACK'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Reward value"><Input type="number" value={form.rewardValue} onChange={(e: any) => setForm({ ...form, rewardValue: e.target.value })} /></Field>
        </div>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={save} disabled={saving || !form.referrerId}>{saving ? 'Saving…' : 'Create referral'}</Btn>
      </SlideOver>
    </div>
  );
}
