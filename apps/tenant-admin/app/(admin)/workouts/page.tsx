'use client';

import { useEffect, useState, useCallback } from 'react';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

const statusColor: any = { ACTIVE: 'green', DRAFT: 'amber', COMPLETED: 'indigo', ARCHIVED: 'gray' };

export default function WorkoutsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [plans, setPlans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ memberId: '', goalType: 'GENERAL_FITNESS', fitnessLevel: 'BEGINNER', daysPerWeek: 3, durationWeeks: 4, notes: '' });

  const load = useCallback(async () => {
    const [p, m] = await Promise.all([gymApi.workouts.list(subdomain), gymApi.members.list(subdomain)]);
    setPlans(Array.isArray(p.data) ? p.data : (p.data as any)?.items ?? []);
    setMembers(Array.isArray(m.data) ? m.data : (m.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    setSaving(true); setErr(null);
    const r = await gymApi.workouts.generate(subdomain, { ...form, daysPerWeek: Number(form.daysPerWeek), durationWeeks: Number(form.durationWeeks) });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  async function approve(id: string) {
    await gymApi.workouts.approve(subdomain, id); load();
  }

  const memberName = (p: any) => p.member?.user ? `${p.member.user.firstName ?? ''} ${p.member.user.lastName ?? ''}`.trim() : 'Member';

  return (
    <div>
      <PageHeader title="Workout Plans" subtitle="AI-generated and trainer-built programs"
        action={<Btn onClick={() => setOpen(true)}>⚡ Generate plan</Btn>} />
      {loading ? <div className="text-gray-400">Loading…</div> : plans.length === 0 ? (
        <Card><EmptyState icon="🏋️" title="No workout plans yet" msg="Generate an AI plan or build one for a member." /></Card>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-bold text-gray-900">{p.name} {p.isAiGenerated && <span title="AI generated">🤖</span>}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {memberName(p)} · {p.goalType?.replace(/_/g, ' ')} · {p.fitnessLevel} · {p.daysPerWeek} days/wk · {p.durationWeeks} wks
                    {p.trainer?.name ? ` · Coach ${p.trainer.name}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={statusColor[p.status] ?? 'gray'}>{p.status}</Badge>
                  {p.status === 'DRAFT' && <Btn variant="outline" onClick={() => approve(p.id)}>Approve</Btn>}
                  <Btn variant="ghost" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>{expanded === p.id ? 'Hide' : 'Days'}</Btn>
                </div>
              </div>
              {expanded === p.id && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(p.workoutDays ?? []).map((d: any) => (
                    <div key={d.id} className="rounded-xl bg-gray-50 p-4">
                      <div className="font-semibold text-sm text-gray-900">Day {d.dayNumber}: {d.dayName}</div>
                      <div className="text-xs text-gray-500 mb-2">{d.muscleGroup}</div>
                      <ul className="text-xs text-gray-700 space-y-1">
                        {(d.exercises ?? []).map((e: any) => (
                          <li key={e.id}>• {e.name} — {e.sets}×{e.reps} {e.equipment ? `(${e.equipment})` : ''}</li>
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

      <SlideOver open={open} onClose={() => setOpen(false)} title="Generate workout plan">
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
        <Field label="Fitness level">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.fitnessLevel} onChange={(e) => setForm({ ...form, fitnessLevel: e.target.value })}>
            {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Days / week"><Input type="number" min={1} max={7} value={form.daysPerWeek} onChange={(e: any) => setForm({ ...form, daysPerWeek: e.target.value })} /></Field>
          <Field label="Duration (weeks)"><Input type="number" min={1} value={form.durationWeeks} onChange={(e: any) => setForm({ ...form, durationWeeks: e.target.value })} /></Field>
        </div>
        <Field label="Notes for the AI (optional)"><Input value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. knee injury, no barbell work" /></Field>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={generate} disabled={saving || !form.memberId}>{saving ? 'Generating…' : '⚡ Generate plan'}</Btn>
        <p className="text-xs text-gray-400 mt-3">The plan is created as a draft — approve it to make it active for the member.</p>
      </SlideOver>
    </div>
  );
}
