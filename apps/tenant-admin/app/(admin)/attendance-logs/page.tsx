'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { attendanceApi } from '@/lib/api';
import { PageHeader, Card, Btn, Input, EmptyState, Badge } from '../_ui';

export default function AttendanceLogsPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [rows, setRows] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [l, d] = await Promise.all([
      attendanceApi.logs(subdomain, { from: from || undefined, to: to || undefined, deviceId: deviceId || undefined, search: search || undefined }),
      attendanceApi.devices.list(subdomain),
    ]);
    setRows(Array.isArray(l.data) ? l.data : []);
    setDevices(Array.isArray(d.data) ? d.data : []);
    setLoading(false);
  }, [subdomain, from, to, deviceId, search]);
  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const header = 'Name,Device UID,Check-in,Check-out,Minutes,Method,Device,Branch';
    const lines = rows.map((r) => [
      name(r), r.deviceUid ?? '', r.checkInTime, r.checkOutTime ?? '', r.duration ?? '', r.method ?? '', r.device?.name ?? '', r.branch?.name ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const name = (r: any) => r.member?.user ? `${r.member.user.firstName ?? ''} ${r.member.user.lastName ?? ''}`.trim() || r.member.user.email : (r.deviceUid ? `UID ${r.deviceUid}` : r.userId);

  return (
    <div>
      <PageHeader title="Attendance Logs" subtitle="Every punch — biometric devices, QR and manual check-ins"
        action={<Btn variant="outline" onClick={exportCsv}>⬇ Export CSV</Btn>} />

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div><div className="text-xs font-semibold text-gray-500 mb-1">From</div><Input type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} /></div>
        <div><div className="text-xs font-semibold text-gray-500 mb-1">To</div><Input type="date" value={to} onChange={(e: any) => setTo(e.target.value)} /></div>
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-1">Device</div>
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">All devices</option>
            {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]"><div className="text-xs font-semibold text-gray-500 mb-1">Search</div><Input placeholder="Name, email or device uid…" value={search} onChange={(e: any) => setSearch(e.target.value)} /></div>
      </div>

      {loading ? <div className="text-gray-400">Loading…</div> : rows.length === 0 ? (
        <Card><EmptyState icon="🕐" title="No punches found" msg="Pull a device or adjust the filters." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-5 py-3">Person</th><th className="px-5 py-3">Check-in</th><th className="px-5 py-3">Check-out</th>
                <th className="px-5 py-3">Duration</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Device</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{name(r)}{!r.memberId && r.deviceUid && <span className="ml-2 text-[10px] text-amber-600 font-semibold">unmapped</span>}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(r.checkInTime).toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-500">{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '—'}</td>
                  <td className="px-5 py-3">{r.duration ? `${r.duration} min` : '—'}</td>
                  <td className="px-5 py-3"><Badge color={r.method === 'BIOMETRIC' ? 'indigo' : r.method === 'QR_CODE' ? 'green' : 'gray'}>{r.method ?? '—'}</Badge></td>
                  <td className="px-5 py-3 text-gray-500">{r.device?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
