'use client';

import { useEffect, useState, useCallback } from 'react';
import { tenantAccountsApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../../_ui';

/** Approximate BS (Bikram Sambat) year for a Gregorian date. Nepali FY starts mid-Jul
 *  (Shrawan). Good enough for a label; swap for a precise converter later. */
function toBsLabel(d: Date): string {
  const ad = d.getFullYear();
  // Jan–mid-Apr → AD+56, else AD+57 (rough).
  const bsStart = d.getMonth() < 3 ? ad + 56 : ad + 57;
  return `${bsStart}/${(bsStart + 1) % 100} BS`;
}

export default function FiscalYearsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cal, setCal] = useState<'EN' | 'BS'>('EN');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isActive: true });

  const load = useCallback(async () => {
    const r = await tenantAccountsApi.listFiscalYears(subdomain);
    setYears(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function activate(id: string) { await tenantAccountsApi.activateFiscalYear(subdomain, id); load(); }
  async function save() {
    setSaving(true);
    await tenantAccountsApi.createFiscalYear(subdomain, form);
    setSaving(false); setOpen(false); load();
  }

  const fmt = (d: string) => {
    const date = new Date(d);
    return cal === 'BS' ? toBsLabel(date) : date.toLocaleDateString();
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Fiscal Years" subtitle="Set your active accounting year · switch calendar"
        action={<div className="flex items-center gap-3">
          <div className="flex rounded-full bg-gray-100 p-1">
            {(['EN', 'BS'] as const).map((c) => (
              <button key={c} onClick={() => setCal(c)} className={`px-3 py-1 rounded-full text-sm font-semibold ${cal === c ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>{c === 'EN' ? 'English' : 'नेपाली'}</button>
            ))}
          </div>
          <Btn onClick={() => setOpen(true)}>+ New year</Btn>
        </div>} />

      {loading ? <div className="text-gray-400">Loading…</div> : years.length === 0 ? (
        <Card><EmptyState icon="🗓️" title="No fiscal year yet" msg="Create one (or use Load default chart of accounts, which sets one up)." /></Card>
      ) : (
        <div className="space-y-3">
          {years.map((fy) => (
            <Card key={fy.id} className="p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{fy.name}</span>
                  {fy.isActive ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  {fy.isClosed && <Badge color="red">Closed</Badge>}
                </div>
                <div className="text-sm text-gray-500 mt-1">{fmt(fy.startDate)} — {fmt(fy.endDate)}</div>
              </div>
              {!fy.isActive && !fy.isClosed && <Btn variant="outline" onClick={() => activate(fy.id)}>Set active</Btn>}
            </Card>
          ))}
        </div>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="New fiscal year">
        <Field label="Name"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="FY 2026 / 2082-83 BS" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><Input type="date" value={form.startDate} onChange={(e: any) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="End date"><Input type="date" value={form.endDate} onChange={(e: any) => setForm({ ...form, endDate: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-4"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Set as active year</label>
        <Btn onClick={save} disabled={saving || !form.name || !form.startDate || !form.endDate}>{saving ? 'Creating…' : 'Create fiscal year'}</Btn>
      </SlideOver>
    </div>
  );
}
