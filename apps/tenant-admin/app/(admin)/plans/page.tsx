'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { gymApi } from '@/lib/api';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

export default function PlansPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'MONTHLY', durationDays: 30, priceNpr: 2000, vatPercent: 13, includesTrainer: false, includesClasses: true, description: '' });

  const load = useCallback(async () => {
    const r = await gymApi.plans.list(subdomain);
    setPlans(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    const r = await gymApi.plans.create(subdomain, { ...form, durationDays: Number(form.durationDays), priceNpr: Number(form.priceNpr), vatPercent: Number(form.vatPercent) });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  return (
    <div>
      <PageHeader title="Membership Plans" subtitle="What members can buy · NPR + 13% VAT"
        action={<Btn onClick={() => setOpen(true)}>+ New plan</Btn>} />

      {loading ? <div className="text-gray-400">Loading…</div> : plans.length === 0 ? (
        <Card><EmptyState icon="🎟️" title="No plans yet" msg="Create your first membership plan." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex justify-between items-start">
                <div className="font-bold text-gray-900">{p.name}</div>
                <Badge color={p.isActive === false ? 'gray' : 'green'}>{p.isActive === false ? 'Inactive' : 'Active'}</Badge>
              </div>
              <div className="text-2xl font-extrabold text-indigo-600 mt-2">NPR {p.totalWithVat ?? p.priceNpr}</div>
              <div className="text-xs text-gray-500">{p.durationDays} days · {p.type}</div>
              {p.description && <p className="text-sm text-gray-600 mt-2">{p.description}</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.includesTrainer && <Badge color="indigo">Trainer</Badge>}
                {p.includesClasses && <Badge color="indigo">Classes</Badge>}
                {p.includesDietPlan && <Badge color="indigo">Diet</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="New membership plan">
        <Field label="Plan name"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Monthly Unlimited" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {['DAY_PASS', 'MONTHLY', 'QUARTERLY', 'HALF_YEAR', 'YEARLY', 'CUSTOM'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Duration (days)"><Input type="number" value={form.durationDays} onChange={(e: any) => setForm({ ...form, durationDays: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (NPR, ex-VAT)"><Input type="number" value={form.priceNpr} onChange={(e: any) => setForm({ ...form, priceNpr: e.target.value })} /></Field>
          <Field label="VAT %"><Input type="number" value={form.vatPercent} onChange={(e: any) => setForm({ ...form, vatPercent: e.target.value })} /></Field>
        </div>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.includesTrainer} onChange={(e) => setForm({ ...form, includesTrainer: e.target.checked })} /> Trainer</label>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.includesClasses} onChange={(e) => setForm({ ...form, includesClasses: e.target.checked })} /> Classes</label>
        </div>
        <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></Field>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={save} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Create plan'}</Btn>
      </SlideOver>
    </div>
  );
}
