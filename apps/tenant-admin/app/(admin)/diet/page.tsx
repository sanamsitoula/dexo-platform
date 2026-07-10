'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { gymApi } from '@/lib/api';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

const statusColor: any = { ACTIVE: 'green', DRAFT: 'amber', COMPLETED: 'indigo', ARCHIVED: 'gray' };

export default function DietPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [plans, setPlans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ memberId: '', goalType: 'GENERAL_FITNESS', dietType: 'NON_VEGETARIAN', dailyCalories: '', allergies: '' });

  const load = useCallback(async () => {
    const [p, m] = await Promise.all([gymApi.diet.list(subdomain), gymApi.members.list(subdomain)]);
    setPlans(Array.isArray(p.data) ? p.data : (p.data as any)?.items ?? []);
    setMembers(Array.isArray(m.data) ? m.data : (m.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    setSaving(true); setErr(null);
    const r = await gymApi.diet.generate(subdomain, { ...form, dailyCalories: form.dailyCalories ? Number(form.dailyCalories) : undefined });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  async function approve(id: string) { await gymApi.diet.approve(subdomain, id); load(); }

  const memberName = (p: any) => p.member?.user ? `${p.member.user.firstName ?? ''} ${p.member.user.lastName ?? ''}`.trim() : 'Member';

  return (
    <div>
      <PageHeader title="Diet Plans" subtitle="Nutrition plans built on the Nepali food database"
        action={<Btn onClick={() => setOpen(true)}>⚡ Generate plan</Btn>} />
      {loading ? <div className="text-gray-400">Loading…</div> : plans.length === 0 ? (
        <Card><EmptyState icon="🥗" title="No diet plans yet" msg="Generate an AI diet plan for a member." /></Card>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-bold text-gray-900">{p.name} {p.isAiGenerated && <span title="AI generated">🤖</span>}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {memberName(p)} · {p.dailyCalories} kcal/day · {p.dietType?.replace(/_/g, ' ')}
                    {p.proteinGrams ? ` · P${p.proteinGrams} C${p.carbsGrams} F${p.fatsGrams}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={statusColor[p.status] ?? 'gray'}>{p.status}</Badge>
                  {p.status === 'DRAFT' && <Btn variant="outline" onClick={() => approve(p.id)}>Approve</Btn>}
                  <Btn variant="ghost" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>{expanded === p.id ? 'Hide' : 'Meals'}</Btn>
                </div>
              </div>
              {expanded === p.id && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(p.meals ?? []).map((m: any) => (
                    <div key={m.id} className="rounded-xl bg-gray-50 p-4">
                      <div className="font-semibold text-sm text-gray-900">{m.name || m.mealType}</div>
                      <div className="text-xs text-gray-500 mb-2">{m.totalCalories ? `${m.totalCalories} kcal` : ''}</div>
                      <ul className="text-xs text-gray-700 space-y-1">
                        {(Array.isArray(m.foodItems) ? m.foodItems : []).map((f: any, i: number) => (
                          <li key={i}>• {f.name} {f.quantity ? `— ${f.quantity}` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="Generate diet plan">
        <Field label="Member">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
            <option value="">Select member…</option>
            {members.map((m: any) => <option key={m.id} value={m.id}>{m.user ? `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() || m.user.email : m.id.slice(0, 8)}</option>)}
          </select>
        </Field>
        <Field label="Goal">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.goalType} onChange={(e) => setForm({ ...form, goalType: e.target.value })}>
            {['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'GENERAL_FITNESS'].map((g) => <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Field label="Diet type">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.dietType} onChange={(e) => setForm({ ...form, dietType: e.target.value })}>
            {['NON_VEGETARIAN', 'VEGETARIAN', 'VEGAN', 'KETO'].map((d) => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Field label="Daily calories (blank = auto from assessment)"><Input type="number" value={form.dailyCalories} onChange={(e: any) => setForm({ ...form, dailyCalories: e.target.value })} placeholder="e.g. 2200" /></Field>
        <Field label="Allergies (optional)"><Input value={form.allergies} onChange={(e: any) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. nuts, dairy" /></Field>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={generate} disabled={saving || !form.memberId}>{saving ? 'Generating…' : '⚡ Generate plan'}</Btn>
        <p className="text-xs text-gray-400 mt-3">The plan is created as a draft — approve it to make it active for the member.</p>
      </SlideOver>
    </div>
  );
}
