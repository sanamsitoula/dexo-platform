'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { gymApi } from '@/lib/api';
import { PageHeader, KpiCard, Card, Btn, Input, EmptyState } from '../_ui';

export default function AttendancePage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [today, setToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await gymApi.attendance.today(subdomain);
    setToday(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function checkIn() {
    if (!qr.trim()) return;
    setBusy(true); setMsg(null);
    const r = await gymApi.attendance.qr(subdomain, qr.trim());
    setBusy(false);
    if (r.error) setMsg({ ok: false, text: r.error });
    else { setMsg({ ok: true, text: r.data?.message || 'Checked in ✓' }); setQr(''); load(); }
  }

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Front-desk check-in · today" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <KpiCard label="Checked in today" value={today.length} accent="#16a34a" />
        <KpiCard label="Currently in gym" value={today.filter((a) => !a.checkOutTime).length} accent="#4f46e5" />
        <KpiCard label="Checked out" value={today.filter((a) => a.checkOutTime).length} accent="#64748b" />
      </div>

      <Card className="p-5 mb-6">
        <div className="font-semibold text-gray-900 mb-3">Scan / enter member QR</div>
        <div className="flex gap-2">
          <input value={qr} onChange={(e) => setQr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkIn()}
            placeholder="VRFIT-XXXXXXXX" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500" />
          <Btn onClick={checkIn} disabled={busy || !qr}>{busy ? 'Checking…' : 'Check in'}</Btn>
        </div>
        {msg && <p className={`text-sm mt-2 ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
      </Card>

      <Card>
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900">Today’s check-ins</div>
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : today.length === 0 ? (
          <EmptyState icon="🚪" title="No check-ins yet today" msg="Members appear here as they arrive." />
        ) : (
          <div className="divide-y divide-gray-100">
            {today.map((a) => {
              const name = `${a.member?.user?.firstName ?? ''} ${a.member?.user?.lastName ?? ''}`.trim() || 'Member';
              return (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">{name.charAt(0)}</div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{name}</div>
                      <div className="text-xs text-gray-400">in {a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}{a.checkOutTime ? ` · out ${new Date(a.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${a.checkOutTime ? 'text-gray-400' : 'text-green-600'}`}>{a.checkOutTime ? 'Left' : 'In gym'}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
