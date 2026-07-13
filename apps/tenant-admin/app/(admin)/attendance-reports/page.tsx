'use client';

import { useEffect, useState, useCallback } from 'react';
import { attendanceApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Input, KpiCard, EmptyState } from '../_ui';

const fmtTime = (v: any) => (v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
const fmtMin = (m: number | null) => (m == null ? '—' : `${Math.floor(m / 60)}h ${m % 60}m`);

export default function AttendanceReportsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [daily, setDaily] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, m, s] = await Promise.all([
      attendanceApi.reports.daily(subdomain, date),
      attendanceApi.reports.monthly(subdomain, month),
      attendanceApi.reports.summary(subdomain, 14),
    ]);
    setDaily(d.data ?? null);
    setMonthly(m.data ?? null);
    setSummary(Array.isArray(s.data) ? s.data : []);
    setLoading(false);
  }, [subdomain, date, month]);
  useEffect(() => { load(); }, [load]);

  const maxPresent = Math.max(1, ...summary.map((s) => s.present));

  return (
    <div>
      <PageHeader title="Attendance Reports" subtitle="Daily and monthly attendance analysis"
        action={<Btn variant="outline" onClick={() => window.print()}>🖨 Print</Btn>} />

      {/* 14-day trend */}
      <Card className="p-5 mb-6">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Presence — last 14 days</div>
        <div className="flex items-end gap-1.5 h-24">
          {summary.map((s) => (
            <div key={s.date} className="flex-1 flex flex-col items-center justify-end" title={`${s.date}: ${s.present}`}>
              <div className="w-full rounded-t bg-indigo-500" style={{ height: `${(s.present / maxPresent) * 100}%`, minHeight: s.present ? 4 : 1, opacity: s.present ? 1 : 0.2 }} />
              <div className="text-[9px] text-gray-400 mt-1">{s.date.slice(8)}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-2 mb-4">
        <Btn variant={tab === 'daily' ? 'primary' : 'ghost'} onClick={() => setTab('daily')}>Daily report</Btn>
        <Btn variant={tab === 'monthly' ? 'primary' : 'ghost'} onClick={() => setTab('monthly')}>Monthly report</Btn>
      </div>

      {loading ? <div className="text-gray-400">Loading…</div> : tab === 'daily' ? (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Input type="date" value={date} onChange={(e: any) => setDate(e.target.value)} style={{ maxWidth: 180 }} />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <KpiCard label="Present" value={daily?.presentCount ?? 0} accent="#16a34a" />
            <KpiCard label="Absent (active members)" value={daily?.absentCount ?? 0} accent="#dc2626" />
            <KpiCard label="Active members" value={daily?.totalActiveMembers ?? 0} />
          </div>
          {(daily?.present ?? []).length === 0 ? (
            <Card><EmptyState icon="📅" title="No attendance on this date" /></Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-5 py-3">Person</th><th className="px-5 py-3">First in</th><th className="px-5 py-3">Last out</th>
                    <th className="px-5 py-3">Time</th><th className="px-5 py-3">Punches</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.present.map((p: any) => (
                    <tr key={p.key} className="border-b border-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-5 py-3">{fmtTime(p.firstIn)}</td>
                      <td className="px-5 py-3">{fmtTime(p.lastOut)}</td>
                      <td className="px-5 py-3">{fmtMin(p.minutes)}</td>
                      <td className="px-5 py-3 text-gray-500">{p.punchCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Input type="month" value={month} onChange={(e: any) => setMonth(e.target.value)} style={{ maxWidth: 180 }} />
          </div>
          {(monthly?.people ?? []).length === 0 ? (
            <Card><EmptyState icon="📆" title="No attendance this month" /></Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-5 py-3">Person</th><th className="px-5 py-3">Present days</th><th className="px-5 py-3">Total time</th>
                    <th className="px-5 py-3">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.people.map((p: any) => (
                    <tr key={p.key} className="border-b border-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-5 py-3">{p.presentDays} / {monthly.daysInMonth}</td>
                      <td className="px-5 py-3">{fmtMin(p.totalMinutes)}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-[2px]">
                          {Array.from({ length: monthly.daysInMonth }).map((_, i) => {
                            const dk = `${monthly.month}-${String(i + 1).padStart(2, '0')}`;
                            const present = p.days.some((d: any) => d.date === dk);
                            return <div key={i} title={dk} className={`w-2 h-4 rounded-sm ${present ? 'bg-green-500' : 'bg-gray-100'}`} />;
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
