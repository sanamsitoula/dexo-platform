'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { attendanceApi } from '@/lib/api';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

const statusColor: any = { OK: 'green', FAILED: 'red', NEVER: 'gray', RUNNING: 'amber', SUCCESS: 'green' };

export default function DevicesPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [devices, setDevices] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', ip: '', port: 4370, model: '', commKey: '', forceUdp: false, timeoutSec: 10 });

  const load = useCallback(async () => {
    const [d, s] = await Promise.all([attendanceApi.devices.list(subdomain), attendanceApi.devices.sessions(subdomain)]);
    setDevices(Array.isArray(d.data) ? d.data : []);
    setSessions(Array.isArray(s.data) ? s.data : []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    const r = await attendanceApi.devices.create(subdomain, { ...form, port: Number(form.port), timeoutSec: Number(form.timeoutSec) });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  async function pull(id: string) {
    setBusy(id);
    const r = await attendanceApi.devices.pull(subdomain, id);
    setBusy(null);
    if (r.error) alert(r.error); else alert(`Pulled ${r.data?.recordsPulled ?? 0} records (${r.data?.newInserts ?? 0} new)`);
    load();
  }

  async function test(id: string) {
    setBusy(id);
    const r = await attendanceApi.devices.test(subdomain, id);
    setBusy(null);
    alert(r.data?.ok ? '✅ Device reachable' : `❌ ${r.data?.error ?? r.error ?? 'Unreachable'}`);
  }

  return (
    <div>
      <PageHeader title="Biometric Devices" subtitle="ZKTeco device registry & attendance data puller (TCP :4370)"
        action={<div className="flex gap-2"><Btn variant="outline" onClick={async () => { const r = await attendanceApi.devices.pullAll(subdomain); if (r.error) alert(r.error); load(); }}>⟳ Pull all</Btn><Btn onClick={() => setOpen(true)}>+ Add device</Btn></div>} />

      {loading ? <div className="text-gray-400">Loading…</div> : devices.length === 0 ? (
        <Card><EmptyState icon="🖐️" title="No devices yet" msg="Register a ZKTeco device to start pulling punches." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-gray-900">{d.name} {d.model ? <span className="text-gray-400 font-normal text-sm">({d.model})</span> : ''}</div>
                  <div className="text-xs text-gray-500 mt-0.5 font-mono">{d.ip}:{d.port}{d.forceUdp ? ' · UDP' : ' · TCP'} · timeout {d.timeoutSec}s</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {d._count?.attendances ?? 0} punches · last pull {d.lastPullAt ? new Date(d.lastPullAt).toLocaleString() : 'never'}
                    {d.branch?.name ? ` · ${d.branch.name}` : ''}
                  </div>
                </div>
                <Badge color={statusColor[d.lastStatus] ?? 'gray'}>{d.lastStatus ?? 'NEVER'}</Badge>
              </div>
              <div className="flex gap-2 mt-4">
                <Btn variant="primary" onClick={() => pull(d.id)} disabled={busy === d.id}>{busy === d.id ? 'Pulling…' : '⬇ Pull now'}</Btn>
                <Btn variant="outline" onClick={() => test(d.id)} disabled={busy === d.id}>Test connection</Btn>
                <Btn variant="ghost" onClick={async () => { if (window.confirm(`Remove ${d.name}? Attendance history is kept.`)) { await attendanceApi.devices.remove(subdomain, d.id); load(); } }}>Remove</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h3 className="font-bold text-gray-900 mt-8 mb-3">Pull sessions (audit trail)</h3>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
              <th className="px-5 py-3">Started</th><th className="px-5 py-3">Device</th><th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Pulled</th><th className="px-5 py-3">New</th><th className="px-5 py-3">Error</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="px-5 py-3 text-gray-500">{new Date(s.startedAt).toLocaleString()}</td>
                <td className="px-5 py-3 font-medium text-gray-900">{s.device?.name}</td>
                <td className="px-5 py-3"><Badge color={statusColor[s.status] ?? 'gray'}>{s.status}</Badge></td>
                <td className="px-5 py-3">{s.recordsPulled}</td>
                <td className="px-5 py-3">{s.newInserts}</td>
                <td className="px-5 py-3 text-xs text-red-500 max-w-[240px] truncate">{s.errorDetail?.split('\n')[0] ?? ''}</td>
              </tr>
            ))}
            {sessions.length === 0 && <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-400">No pulls yet</td></tr>}
          </tbody>
        </table>
      </Card>

      <SlideOver open={open} onClose={() => setOpen(false)} title="Add ZKTeco device">
        <Field label="Name"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Main Door K40" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="IP address"><Input value={form.ip} onChange={(e: any) => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.201" /></Field>
          <Field label="Port"><Input type="number" value={form.port} onChange={(e: any) => setForm({ ...form, port: e.target.value })} /></Field>
          <Field label="Model"><Input value={form.model} onChange={(e: any) => setForm({ ...form, model: e.target.value })} placeholder="K40, iFace302…" /></Field>
          <Field label="Comm key"><Input value={form.commKey} onChange={(e: any) => setForm({ ...form, commKey: e.target.value })} placeholder="0 (blank)" /></Field>
          <Field label="Timeout (s)"><Input type="number" value={form.timeoutSec} onChange={(e: any) => setForm({ ...form, timeoutSec: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 mb-4 text-sm">
          <input type="checkbox" checked={form.forceUdp} onChange={(e) => setForm({ ...form, forceUdp: e.target.checked })} />
          Force UDP (older models like iFace302 that time out on TCP)
        </label>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={save} disabled={saving || !form.name || !form.ip}>{saving ? 'Saving…' : 'Add device'}</Btn>
        <p className="text-xs text-gray-400 mt-3">Port 4370 must be reachable from the server — check firewall / network. Set ZK_MOCK=true in dev to pull sample punches without hardware.</p>
      </SlideOver>
    </div>
  );
}
