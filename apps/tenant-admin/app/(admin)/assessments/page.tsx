'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { gymApi } from '@/lib/api';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

export default function AssessmentsPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [rows, setRows] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ memberId: '', assessmentType: 'PERIODIC', weight: '', height: '', bodyFatPercent: '', restingHeartRate: '', bloodPressure: '', fitnessLevel: 'BEGINNER', goalType: 'GENERAL_FITNESS', targetWeight: '', trainerNotes: '' });

  const load = useCallback(async () => {
    const [a, m] = await Promise.all([gymApi.assessments.list(subdomain), gymApi.members.list(subdomain)]);
    setRows(Array.isArray(a.data) ? a.data : (a.data as any)?.items ?? []);
    setMembers(Array.isArray(m.data) ? m.data : (m.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    const num = (v: string) => (v === '' ? undefined : Number(v));
    const bmi = form.weight && form.height ? Math.round((Number(form.weight) / Math.pow(Number(form.height) / 100, 2)) * 100) / 100 : undefined;
    const r = await gymApi.assessments.create(subdomain, {
      memberId: form.memberId, assessmentType: form.assessmentType,
      weight: num(form.weight), height: num(form.height), bmi,
      bodyFatPercent: num(form.bodyFatPercent), restingHeartRate: num(form.restingHeartRate),
      bloodPressure: form.bloodPressure || undefined, fitnessLevel: form.fitnessLevel,
      goalType: form.goalType, targetWeight: num(form.targetWeight), trainerNotes: form.trainerNotes || undefined,
    });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  const memberName = (a: any) => a.member?.user ? `${a.member.user.firstName ?? ''} ${a.member.user.lastName ?? ''}`.trim() : (a.memberId ?? '').slice(0, 8);

  return (
    <div>
      <PageHeader title="Body Assessments" subtitle="Measurements, health metrics and fitness goals"
        action={<Btn onClick={() => setOpen(true)}>+ New assessment</Btn>} />
      {loading ? <div className="text-gray-400">Loading…</div> : rows.length === 0 ? (
        <Card><EmptyState icon="📏" title="No assessments yet" msg="Record a member's first assessment." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-5 py-3">Member</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Weight</th><th className="px-5 py-3">BMI</th><th className="px-5 py-3">Body fat</th>
                <th className="px-5 py-3">Goal</th><th className="px-5 py-3">Level</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{memberName(a)}</td>
                  <td className="px-5 py-3"><Badge color={a.assessmentType === 'INITIAL' ? 'indigo' : a.assessmentType === 'FINAL' ? 'green' : 'gray'}>{a.assessmentType}</Badge></td>
                  <td className="px-5 py-3 text-gray-500">{a.assessedAt ? new Date(a.assessedAt).toLocaleDateString() : ''}</td>
                  <td className="px-5 py-3">{a.weight ? `${a.weight} kg` : '—'}</td>
                  <td className="px-5 py-3">{a.bmi ?? '—'}</td>
                  <td className="px-5 py-3">{a.bodyFatPercent ? `${a.bodyFatPercent}%` : '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{a.goalType?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{a.fitnessLevel ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="New assessment">
        <Field label="Member">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
            <option value="">Select member…</option>
            {members.map((m: any) => <option key={m.id} value={m.id}>{m.user ? `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() || m.user.email : m.id.slice(0, 8)}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.assessmentType} onChange={(e) => setForm({ ...form, assessmentType: e.target.value })}>
            {['INITIAL', 'PERIODIC', 'FINAL'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (kg)"><Input type="number" value={form.weight} onChange={(e: any) => setForm({ ...form, weight: e.target.value })} /></Field>
          <Field label="Height (cm)"><Input type="number" value={form.height} onChange={(e: any) => setForm({ ...form, height: e.target.value })} /></Field>
          <Field label="Body fat (%)"><Input type="number" value={form.bodyFatPercent} onChange={(e: any) => setForm({ ...form, bodyFatPercent: e.target.value })} /></Field>
          <Field label="Resting HR"><Input type="number" value={form.restingHeartRate} onChange={(e: any) => setForm({ ...form, restingHeartRate: e.target.value })} /></Field>
          <Field label="Blood pressure"><Input value={form.bloodPressure} onChange={(e: any) => setForm({ ...form, bloodPressure: e.target.value })} placeholder="120/80" /></Field>
          <Field label="Target weight (kg)"><Input type="number" value={form.targetWeight} onChange={(e: any) => setForm({ ...form, targetWeight: e.target.value })} /></Field>
        </div>
        <Field label="Fitness level">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.fitnessLevel} onChange={(e) => setForm({ ...form, fitnessLevel: e.target.value })}>
            {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Goal">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.goalType} onChange={(e) => setForm({ ...form, goalType: e.target.value })}>
            {['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'GENERAL_FITNESS'].map((g) => <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Field label="Trainer notes"><Input value={form.trainerNotes} onChange={(e: any) => setForm({ ...form, trainerNotes: e.target.value })} /></Field>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={save} disabled={saving || !form.memberId}>{saving ? 'Saving…' : 'Save assessment'}</Btn>
      </SlideOver>
    </div>
  );
}
