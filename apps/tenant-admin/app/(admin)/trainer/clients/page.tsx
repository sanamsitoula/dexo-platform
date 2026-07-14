'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, EmptyState, Badge, SlideOver, Field, Input } from '../../_ui';

export default function TrainerClients() {
  const subdomain = resolveTenantAdminSubdomain();
  const preselect = useSearchParams()?.get('id') || null;
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(preselect);
  const [detail, setDetail] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const m = await gymApi.members.list(subdomain);
    setMembers(Array.isArray(m.data) ? m.data : (m.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    const m = members.find((x) => x.id === selected);
    setDetail(m);
    (async () => {
      const [wp, pr] = await Promise.all([
        gymApi.workouts.byMember(subdomain, selected),
        gymApi.assessments.progress(subdomain, selected).catch(() => ({ data: [] })),
      ]);
      setPlans(Array.isArray(wp.data) ? wp.data : (wp.data as any)?.items ?? []);
      setProgress(Array.isArray(pr.data) ? pr.data : (pr.data as any)?.items ?? []);
    })();
  }, [selected, members, subdomain]);

  const filtered = members.filter((m) => {
    const name = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.toLowerCase();
    return !q || name.includes(q.toLowerCase());
  });
  const latest = [...progress].sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())[0];

  function toggleChecked(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allFilteredChecked = filtered.length > 0 && filtered.every((m) => checked.has(m.id));
  function toggleSelectAllFiltered() {
    setChecked((prev) => {
      const next = new Set(prev);
      if (allFilteredChecked) {
        filtered.forEach((m) => next.delete(m.id));
      } else {
        filtered.forEach((m) => next.add(m.id));
      }
      return next;
    });
  }

  function selectEveryClient() {
    setChecked(new Set(members.map((m) => m.id)));
  }

  async function sendAnnouncement() {
    if (!announceTitle.trim() || !announceMessage.trim() || checked.size === 0) return;
    setSending(true);
    setSendResult(null);
    const r = await gymApi.announcements.send(subdomain, {
      title: announceTitle,
      message: announceMessage,
      memberIds: Array.from(checked),
    });
    setSending(false);
    if (r.error) { setSendResult(`Failed: ${r.error}`); return; }
    setSendResult(`Sent to ${(r.data as any)?.audienceCount ?? checked.size} client(s).`);
    setAnnounceTitle('');
    setAnnounceMessage('');
    setTimeout(() => { setAnnounceOpen(false); setSendResult(null); setChecked(new Set()); }, 1500);
  }

  return (
    <div>
      <PageHeader title="Clients" subtitle="Track and coach your members"
        action={
          <div className="flex items-center gap-2">
            {checked.size > 0 && (
              <Btn variant="outline" onClick={() => setAnnounceOpen(true)}>📣 Announce to {checked.size} selected</Btn>
            )}
            <Link href="/trainer/workout-builder" className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold">+ Build workout</Link>
          </div>
        } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* List */}
        <Card className="md:col-span-1">
          <div className="p-3 border-b border-gray-100 space-y-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={allFilteredChecked} onChange={toggleSelectAllFiltered} />
                Select all {q ? 'shown' : ''} ({filtered.length})
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value === 'all') selectEveryClient();
                  if (e.target.value === 'none') setChecked(new Set());
                  e.target.value = '';
                }}
                className="text-xs border border-gray-200 rounded-md px-1.5 py-1 text-gray-600"
              >
                <option value="" disabled>Bulk select…</option>
                <option value="all">Add all customers ({members.length})</option>
                <option value="none">Clear selection</option>
              </select>
            </div>
          </div>
          {loading ? <div className="p-6 text-center text-gray-400">Loading…</div> : (
            <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {filtered.map((m) => {
                const name = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() || 'Member';
                return (
                  <div key={m.id} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ${selected === m.id ? 'bg-indigo-50' : ''}`}>
                    <input type="checkbox" checked={checked.has(m.id)} onChange={() => toggleChecked(m.id)} onClick={(e) => e.stopPropagation()} />
                    <button onClick={() => setSelected(m.id)} className="flex items-center gap-3 text-left flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">{name.charAt(0)}</div>
                      <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Detail */}
        <div className="md:col-span-2">
          {!detail ? (
            <Card><EmptyState icon="👈" title="Select a client" msg="Pick someone to see their plan and progress." /></Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl">
                    {(detail.user?.firstName || 'M').charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{detail.user?.firstName} {detail.user?.lastName}</div>
                    <div className="text-sm text-gray-500">{detail.goals ? String(detail.goals).split(',').join(' · ') : 'No goals set'}</div>
                  </div>
                </div>
                {latest && (
                  <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                    <Metric label="Weight" value={latest.weight != null ? `${latest.weight}kg` : '—'} />
                    <Metric label="BMI" value={latest.bmi ?? '—'} />
                    <Metric label="Body fat" value={latest.bodyFatPercent != null ? `${latest.bodyFatPercent}%` : '—'} />
                    <Metric label="Muscle" value={latest.muscleMass != null ? `${latest.muscleMass}kg` : '—'} />
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-900">Workout plans</div>
                  <Link href={`/trainer/workout-builder?member=${detail.id}`} className="text-sm font-semibold text-indigo-600">+ Assign new</Link>
                </div>
                {plans.length === 0 ? (
                  <p className="text-sm text-gray-500">No plan yet. Build one for this client.</p>
                ) : (
                  <div className="space-y-2">
                    {plans.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.goalType} · {p.daysPerWeek} days/wk · {p.workoutDays?.length ?? 0} days</div>
                        </div>
                        <Badge color={String(p.status).toUpperCase() === 'ACTIVE' ? 'green' : 'amber'}>{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      <SlideOver open={announceOpen} onClose={() => setAnnounceOpen(false)} title={`Announce to ${checked.size} client${checked.size === 1 ? '' : 's'}`}>
        <Field label="Title"><Input value={announceTitle} onChange={(e: any) => setAnnounceTitle(e.target.value)} placeholder="New exercise plan available" /></Field>
        <Field label="Message">
          <textarea value={announceMessage} onChange={(e) => setAnnounceMessage(e.target.value)} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Describe the exercise or update…" />
        </Field>
        {sendResult && <p className="text-sm text-gray-600 mb-3">{sendResult}</p>}
        <Btn onClick={sendAnnouncement} disabled={sending || !announceTitle.trim() || !announceMessage.trim() || checked.size === 0}>
          {sending ? 'Sending…' : `Send to ${checked.size} client${checked.size === 1 ? '' : 's'}`}
        </Btn>
      </SlideOver>
    </div>
  );
}

function Metric({ label, value }: any) {
  return <div className="rounded-xl bg-gray-50 py-2"><div className="font-bold text-gray-900">{value}</div><div className="text-xs text-gray-500">{label}</div></div>;
}
