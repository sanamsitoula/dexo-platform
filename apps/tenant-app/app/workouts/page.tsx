'use client';

import { useEffect, useState } from 'react';
import { fitnessApi, publicApi } from '../../lib/api';

export default function WorkoutsPage() {
  const [info, setInfo] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [i, m] = await Promise.all([publicApi.info(), fitnessApi.me()]);
      setInfo(i.data);
      if (m.data?.id) {
        const [p, l] = await Promise.all([fitnessApi.workoutPlans(m.data.id), fitnessApi.workoutLogs.list(m.data.id)]);
        setPlans(Array.isArray(p.data) ? p.data : p.data?.items ?? []);
        setLogs(Array.isArray(l.data) ? l.data : l.data?.items ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const primary = info?.colorPrimary || '#E85D24';
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const active = plans.find((p) => String(p.status).toUpperCase() === 'ACTIVE') || plans[0];
  const today = active?.workoutDays?.find((d: any) => !d.isRestDay) || active?.workoutDays?.[0];

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-extrabold text-gray-900 px-2 -tracking-tight">Workouts</h1>

      {!active ? (
        <div className="mt-6 rounded-3xl border border-dashed border-gray-300 p-8 text-center">
          <div className="text-5xl">🏋️</div>
          <p className="mt-3 font-bold text-gray-900">No plan assigned yet</p>
          <p className="text-sm text-gray-500 mt-1">Your trainer will build one after your assessment.</p>
        </div>
      ) : (
        <>
          {/* Today's session hero */}
          {today && (
            <div className="mt-4 rounded-[28px] p-6 text-white shadow-lg" style={{ background: primary }}>
              <div className="text-xs font-extrabold tracking-widest opacity-90">TODAY · {today.dayName?.toUpperCase()}</div>
              <div className="text-2xl font-extrabold mt-1">{active.name}</div>
              <div className="flex gap-4 mt-2 text-sm opacity-95">
                <span>🏋 {today.exercises?.length ?? 0} exercises</span>
                <span>🎯 {active.goalType || 'General'}</span>
              </div>
            </div>
          )}

          {/* Day-by-day plan */}
          <h2 className="mt-6 px-2 font-extrabold text-gray-900">This week</h2>
          <div className="mt-2 space-y-3">
            {active.workoutDays?.map((d: any) => (
              <div key={d.id} className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setOpen(open === d.id ? null : d.id)} className="w-full flex items-center justify-between p-5">
                  <div className="text-left">
                    <div className="font-bold text-gray-900">{d.dayName}{d.isRestDay ? ' · Rest' : ''}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{d.isRestDay ? 'Recovery day' : `${d.exercises?.length ?? 0} exercises`}</div>
                  </div>
                  {!d.isRestDay && <span className="text-gray-400">{open === d.id ? '▲' : '▼'}</span>}
                </button>
                {open === d.id && !d.isRestDay && (
                  <div className="px-5 pb-4 space-y-2">
                    {d.exercises?.map((ex: any) => (
                      <div key={ex.id} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{ex.name}</div>
                          <div className="text-xs text-gray-500">{ex.targetMuscle || ex.muscleGroup || 'Full body'}</div>
                        </div>
                        <div className="text-sm font-bold" style={{ color: primary }}>{ex.sets ?? 3}×{ex.reps ?? 10}{ex.weight ? ` · ${ex.weight}kg` : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {logs.length > 0 && (
        <>
          <h2 className="mt-6 px-2 font-extrabold text-gray-900">Recent sessions</h2>
          <div className="mt-2 space-y-2">
            {logs.slice(0, 8).map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-2xl bg-white border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: primary + '15', color: primary }}>✓</span>
                  <span className="text-sm font-semibold text-gray-800">{new Date(l.workoutDate || l.createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                <span className="text-sm text-gray-500">{l.duration ?? 0} min · {l.caloriesBurned ?? 0} kcal</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
