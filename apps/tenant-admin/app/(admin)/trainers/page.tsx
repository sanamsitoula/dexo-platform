'use client';

import { useEffect, useState, useCallback } from 'react';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState } from '../_ui';

export default function TrainersPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', specialization: '', experienceYears: 1, hourlyRate: 1000 });

  const load = useCallback(async () => {
    const r = await gymApi.trainers.list(subdomain);
    setTrainers(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    const r = await gymApi.trainers.create(subdomain, { ...form, experienceYears: Number(form.experienceYears), hourlyRate: Number(form.hourlyRate) });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  return (
    <div>
      <PageHeader title="Trainers" subtitle="Your coaching team"
        action={<Btn onClick={() => setOpen(true)}>+ Add trainer</Btn>} />
      {loading ? <div className="text-gray-400">Loading…</div> : trainers.length === 0 ? (
        <Card><EmptyState icon="🏋️" title="No trainers yet" msg="Add your coaching staff." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trainers.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">{(t.name || 'T').charAt(0)}</div>
                <div>
                  <div className="font-bold text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.experienceYears ? `${t.experienceYears} yrs` : ''} {t.rating ? `· ★ ${t.rating}` : ''}</div>
                </div>
              </div>
              {t.specialization && <div className="text-sm text-gray-600 mt-3">{t.specialization}</div>}
              {t.hourlyRate != null && <div className="text-sm font-semibold text-indigo-600 mt-2">NPR {t.hourlyRate}/session</div>}
            </Card>
          ))}
        </div>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="Add trainer">
        <Field label="Full name"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Specialization"><Input value={form.specialization} onChange={(e: any) => setForm({ ...form, specialization: e.target.value })} placeholder="Strength, HIIT, Yoga" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Experience (yrs)"><Input type="number" value={form.experienceYears} onChange={(e: any) => setForm({ ...form, experienceYears: e.target.value })} /></Field>
          <Field label="Rate (NPR)"><Input type="number" value={form.hourlyRate} onChange={(e: any) => setForm({ ...form, hourlyRate: e.target.value })} /></Field>
        </div>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={save} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Add trainer'}</Btn>
      </SlideOver>
    </div>
  );
}
