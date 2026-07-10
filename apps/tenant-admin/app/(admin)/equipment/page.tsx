'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { gymApi } from '@/lib/api';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge, KpiCard } from '../_ui';

const condColor: any = { NEW: 'green', GOOD: 'green', FAIR: 'amber', NEEDS_REPAIR: 'red', OUT_OF_SERVICE: 'red' };

export default function EquipmentPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'CARDIO', brand: '', quantity: 1, condition: 'GOOD', purchaseCost: '' });
  const [logForm, setLogForm] = useState({ maintenanceType: 'ROUTINE', description: '', cost: '' });

  const load = useCallback(async () => {
    const [e, s] = await Promise.all([gymApi.equipment.list(subdomain), gymApi.equipment.stats(subdomain)]);
    setRows(Array.isArray(e.data) ? e.data : (e.data as any)?.items ?? []);
    setStats(s.data ?? null);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    const r = await gymApi.equipment.create(subdomain, { ...form, quantity: Number(form.quantity), purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  async function saveLog() {
    if (!logOpen) return;
    setSaving(true); setErr(null);
    const r = await gymApi.equipment.maintenance.create(subdomain, { equipmentId: logOpen, ...logForm, cost: logForm.cost ? Number(logForm.cost) : undefined });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setLogOpen(null); setLogForm({ maintenanceType: 'ROUTINE', description: '', cost: '' }); load();
  }

  return (
    <div>
      <PageHeader title="Equipment" subtitle="Gym inventory and maintenance"
        action={<Btn onClick={() => setOpen(true)}>+ Add equipment</Btn>} />
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total items" value={stats.total ?? rows.length} />
          <KpiCard label="Needs repair" value={stats.needsRepair ?? rows.filter((r) => r.condition === 'NEEDS_REPAIR').length} accent="#dc2626" />
          <KpiCard label="Out of service" value={stats.outOfService ?? rows.filter((r) => r.condition === 'OUT_OF_SERVICE').length} accent="#dc2626" />
          <KpiCard label="Categories" value={stats.categories ?? new Set(rows.map((r) => r.category)).size} />
        </div>
      )}
      {loading ? <div className="text-gray-400">Loading…</div> : rows.length === 0 ? (
        <Card><EmptyState icon="🏗️" title="No equipment yet" msg="Add your gym equipment inventory." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-5 py-3">Name</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Brand</th>
                <th className="px-5 py-3">Qty</th><th className="px-5 py-3">Condition</th><th className="px-5 py-3">Next maintenance</th><th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-5 py-3 text-gray-500">{r.category}</td>
                  <td className="px-5 py-3 text-gray-500">{r.brand ?? '—'}</td>
                  <td className="px-5 py-3">{r.quantity}</td>
                  <td className="px-5 py-3"><Badge color={condColor[r.condition] ?? 'gray'}>{r.condition?.replace(/_/g, ' ')}</Badge></td>
                  <td className="px-5 py-3 text-gray-500">{r.nextMaintenance ? new Date(r.nextMaintenance).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3"><Btn variant="ghost" onClick={() => setLogOpen(r.id)}>Log service</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="Add equipment">
        <Field label="Name"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Category">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['CARDIO', 'STRENGTH', 'FREE_WEIGHTS', 'MACHINES', 'ACCESSORIES'].map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Field label="Brand"><Input value={form.brand} onChange={(e: any) => setForm({ ...form, brand: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity"><Input type="number" min={1} value={form.quantity} onChange={(e: any) => setForm({ ...form, quantity: e.target.value })} /></Field>
          <Field label="Cost (NPR)"><Input type="number" value={form.purchaseCost} onChange={(e: any) => setForm({ ...form, purchaseCost: e.target.value })} /></Field>
        </div>
        <Field label="Condition">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
            {['NEW', 'GOOD', 'FAIR', 'NEEDS_REPAIR', 'OUT_OF_SERVICE'].map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={save} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Add equipment'}</Btn>
      </SlideOver>

      <SlideOver open={!!logOpen} onClose={() => setLogOpen(null)} title="Log maintenance">
        <Field label="Type">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={logForm.maintenanceType} onChange={(e) => setLogForm({ ...logForm, maintenanceType: e.target.value })}>
            {['ROUTINE', 'REPAIR', 'INSPECTION'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Description"><Input value={logForm.description} onChange={(e: any) => setLogForm({ ...logForm, description: e.target.value })} /></Field>
        <Field label="Cost (NPR)"><Input type="number" value={logForm.cost} onChange={(e: any) => setLogForm({ ...logForm, cost: e.target.value })} /></Field>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={saveLog} disabled={saving || !logForm.description}>{saving ? 'Saving…' : 'Log maintenance'}</Btn>
      </SlideOver>
    </div>
  );
}
