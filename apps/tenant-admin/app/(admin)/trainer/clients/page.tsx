'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { gymApi } from '@/lib/api';
import { PageHeader, Card, Btn, EmptyState, Badge } from '../../_ui';

export default function TrainerClients() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const preselect = useSearchParams()?.get('id') || null;
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(preselect);
  const [detail, setDetail] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

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

  return (
    <div>
      <PageHeader title="Clients" subtitle="Track and coach your members"
        action={<Link href="/trainer/workout-builder" className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold">+ Build workout</Link>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* List */}
        <Card className="md:col-span-1">
          <div className="p-3 border-b border-gray-100">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          {loading ? <div className="p-6 text-center text-gray-400">Loading…</div> : (
            <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {filtered.map((m) => {
                const name = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() || 'Member';
                return (
                  <button key={m.id} onClick={() => setSelected(m.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${selected === m.id ? 'bg-indigo-50' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">{name.charAt(0)}</div>
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                  </button>
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
    </div>
  );
}

function Metric({ label, value }: any) {
  return <div className="rounded-xl bg-gray-50 py-2"><div className="font-bold text-gray-900">{value}</div><div className="text-xs text-gray-500">{label}</div></div>;
}
