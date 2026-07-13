'use client';

import { useEffect, useState, useCallback } from 'react';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ClassesPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [classes, setClasses] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', classType: 'YOGA', dayOfWeek: 1, startTime: '18:00', duration: 60, maxCapacity: 20, trainerId: '', description: '' });

  const load = useCallback(async () => {
    const [c, t] = await Promise.all([gymApi.classes.list(subdomain), gymApi.trainers.list(subdomain)]);
    setClasses(Array.isArray(c.data) ? c.data : (c.data as any)?.items ?? []);
    setTrainers(Array.isArray(t.data) ? t.data : (t.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    const [h, min] = form.startTime.split(':').map(Number);
    const start = new Date(); start.setHours(h, min, 0, 0);
    const r = await gymApi.classes.create(subdomain, {
      name: form.name, classType: form.classType, dayOfWeek: Number(form.dayOfWeek),
      startTime: start.toISOString(), duration: Number(form.duration) || 60, maxCapacity: Number(form.maxCapacity),
      trainerId: form.trainerId || undefined, description: form.description,
    });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  return (
    <div>
      <PageHeader title="Classes & Schedule" subtitle="Group classes members can book"
        action={<Btn onClick={() => setOpen(true)}>+ Schedule class</Btn>} />
      {loading ? <div className="text-gray-400">Loading…</div> : classes.length === 0 ? (
        <Card><EmptyState icon="📅" title="No classes scheduled" msg="Add your weekly group classes." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((c) => {
            const full = c.currentCount >= c.maxCapacity;
            return (
              <Card key={c.id} className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {c.dayOfWeek != null ? DAYS[c.dayOfWeek] : 'Weekly'} · {c.startTime ? new Date(c.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} {c.trainer?.name ? `· ${c.trainer.name}` : ''}
                    </div>
                  </div>
                  <Badge color={full ? 'red' : 'green'}>{c.currentCount ?? 0}/{c.maxCapacity}</Badge>
                </div>
                {c.description && <p className="text-sm text-gray-600 mt-2">{c.description}</p>}
              </Card>
            );
          })}
        </div>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="Schedule a class">
        <Field label="Class name"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Morning HIIT" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Day">
            <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="Start time"><Input type="time" value={form.startTime} onChange={(e: any) => setForm({ ...form, startTime: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Class type">
            <select value={form.classType} onChange={(e) => setForm({ ...form, classType: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {['YOGA', 'ZUMBA', 'CROSSFIT', 'SPINNING', 'PILATES', 'AEROBICS', 'BOXING', 'HIIT', 'STRENGTH', 'CARDIO', 'FUNCTIONAL', 'OTHER'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Duration (min)"><Input type="number" min={15} value={form.duration} onChange={(e: any) => setForm({ ...form, duration: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacity"><Input type="number" value={form.maxCapacity} onChange={(e: any) => setForm({ ...form, maxCapacity: e.target.value })} /></Field>
          <Field label="Trainer">
            <select value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">— none —</option>
              {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></Field>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={save} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Schedule class'}</Btn>
      </SlideOver>
    </div>
  );
}
