'use client';

import { useEffect, useState } from 'react';
import { fitnessApi } from '../../lib/api';

export default function WorkoutsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const m = await fitnessApi.me();
      if (m.data?.id) {
        const [p, l] = await Promise.all([fitnessApi.workoutPlans(m.data.id), fitnessApi.workoutLogs.list(m.data.id)]);
        setPlans(Array.isArray(p.data) ? p.data : p.data?.items ?? []);
        setLogs(Array.isArray(l.data) ? l.data : l.data?.items ?? []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-gray-900">My Workouts</h1>
      {plans.length === 0 ? (
        <div className="mt-8 text-center text-gray-400">
          <div className="text-4xl">🏋️</div>
          <p className="mt-2">No workout plan yet.</p>
          <p className="text-sm">Your trainer will assign one after your assessment.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-start">
                <div className="font-bold text-gray-900">{p.name}</div>
                <span className={`text-xs px-2 py-0.5 rounded ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{p.goalType} · {p.fitnessLevel} · {p.daysPerWeek} days/week</div>
              {p.workoutDays?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.workoutDays.map((d: any) => (
                    <span key={d.id} className="text-xs bg-gray-100 rounded px-2 py-1">{d.dayName} · {d.exercises?.length ?? 0} ex</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <>
          <h2 className="mt-6 font-bold text-gray-900">Recent logs</h2>
          <div className="mt-2 space-y-2">
            {logs.slice(0, 8).map((l) => (
              <div key={l.id} className="flex justify-between rounded-lg border border-gray-100 p-3">
                <span className="text-sm text-gray-800">{new Date(l.workoutDate || l.createdAt).toLocaleDateString()}</span>
                <span className="text-sm text-gray-500">{l.duration ?? 0} min · {l.caloriesBurned ?? 0} kcal</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
