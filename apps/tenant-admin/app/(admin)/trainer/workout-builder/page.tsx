'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Field, Input } from '../../_ui';

type Ex = { name: string; sets: number; reps: number; weight: number; restSeconds: number };
type Day = { dayName: string; muscleGroup: string; isRestDay: boolean; exercises: Ex[] };

const newEx = (): Ex => ({ name: '', sets: 3, reps: 10, weight: 0, restSeconds: 60 });
const newDay = (i: number): Day => ({ dayName: `Day ${i + 1}`, muscleGroup: '', isRestDay: false, exercises: [newEx()] });

export default function WorkoutBuilder() {
  const subdomain = resolveTenantAdminSubdomain();
  const router = useRouter();
  const preMember = useSearchParams()?.get('member') || '';
  const [members, setMembers] = useState<any[]>([]);
  const [memberId, setMemberId] = useState(preMember);
  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState('MUSCLE_GAIN');
  const [fitnessLevel, setFitnessLevel] = useState('INTERMEDIATE');
  const [days, setDays] = useState<Day[]>([newDay(0), newDay(1), newDay(2)]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const m = await gymApi.members.list(subdomain);
    setMembers(Array.isArray(m.data) ? m.data : (m.data as any)?.items ?? []);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  function updateDay(i: number, patch: Partial<Day>) { setDays((d) => d.map((x, idx) => idx === i ? { ...x, ...patch } : x)); }
  function updateEx(di: number, ei: number, patch: Partial<Ex>) {
    setDays((d) => d.map((day, idx) => idx !== di ? day : { ...day, exercises: day.exercises.map((e, j) => j === ei ? { ...e, ...patch } : e) }));
  }

  async function assign() {
    if (!memberId || !name) return setMsg({ ok: false, text: 'Pick a client and name the plan.' });
    setSaving(true); setMsg(null);
    const payload = {
      memberId, name, goalType, fitnessLevel, daysPerWeek: days.filter((d) => !d.isRestDay).length,
      status: 'ACTIVE',
      workoutDays: days.map((d, i) => ({
        dayNumber: i + 1, dayName: d.dayName, muscleGroup: d.muscleGroup, isRestDay: d.isRestDay,
        exercises: d.isRestDay ? [] : d.exercises.filter((e) => e.name.trim()).map((e, j) => ({
          name: e.name, sets: Number(e.sets), reps: Number(e.reps), weight: Number(e.weight), restSeconds: Number(e.restSeconds), sortOrder: j,
        })),
      })),
    };
    const r = await gymApi.workouts.create(subdomain, payload);
    setSaving(false);
    if (r.error) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: 'Plan assigned ✓' });
    setTimeout(() => router.push(`/trainer/clients?id=${memberId}`), 800);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Workout Builder" subtitle="Design a plan and assign it to a client" />

      <Card className="p-5 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client">
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">— select client —</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.user?.firstName} {m.user?.lastName}</option>)}
            </select>
          </Field>
          <Field label="Plan name"><Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="8-Week Hypertrophy" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Goal">
            <select value={goalType} onChange={(e) => setGoalType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {['WEIGHT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'ENDURANCE', 'GENERAL_FITNESS'].map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Level">
            <select value={fitnessLevel} onChange={(e) => setFitnessLevel(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {days.map((d, di) => (
        <Card key={di} className="p-5 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <input value={d.dayName} onChange={(e) => updateDay(di, { dayName: e.target.value })} className="font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none" />
              <label className="flex items-center gap-1.5 text-xs text-gray-500"><input type="checkbox" checked={d.isRestDay} onChange={(e) => updateDay(di, { isRestDay: e.target.checked })} /> Rest day</label>
            </div>
            {days.length > 1 && <button onClick={() => setDays((x) => x.filter((_, i) => i !== di))} className="text-gray-400 hover:text-red-600 text-sm">Remove</button>}
          </div>
          {!d.isRestDay && (
            <>
              <input value={d.muscleGroup} onChange={(e) => updateDay(di, { muscleGroup: e.target.value })} placeholder="Target: Chest & Triceps" className="w-full mb-3 rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
              <div className="space-y-2">
                {d.exercises.map((ex, ei) => (
                  <div key={ei} className="flex items-center gap-2">
                    <input value={ex.name} onChange={(e) => updateEx(di, ei, { name: e.target.value })} placeholder="Exercise" className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                    <NumBox v={ex.sets} on={(v) => updateEx(di, ei, { sets: v })} suffix="sets" />
                    <NumBox v={ex.reps} on={(v) => updateEx(di, ei, { reps: v })} suffix="reps" />
                    <NumBox v={ex.weight} on={(v) => updateEx(di, ei, { weight: v })} suffix="kg" />
                    {d.exercises.length > 1 && <button onClick={() => updateDay(di, { exercises: d.exercises.filter((_, j) => j !== ei) })} className="text-gray-300 hover:text-red-600">×</button>}
                  </div>
                ))}
              </div>
              <button onClick={() => updateDay(di, { exercises: [...d.exercises, newEx()] })} className="mt-2 text-sm font-semibold text-indigo-600">+ Add exercise</button>
            </>
          )}
        </Card>
      ))}

      <button onClick={() => setDays((d) => [...d, newDay(d.length)])} className="text-sm font-semibold text-gray-600 mb-5">+ Add day</button>

      <div className="flex items-center gap-3">
        <Btn onClick={assign} disabled={saving || !memberId || !name}>{saving ? 'Assigning…' : 'Assign plan to client'}</Btn>
        {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

function NumBox({ v, on, suffix }: { v: number; on: (v: number) => void; suffix: string }) {
  return (
    <div className="flex items-center rounded-lg border border-gray-300 px-2 py-1.5">
      <input type="number" value={v} onChange={(e) => on(Number(e.target.value))} className="w-10 text-sm text-right outline-none" />
      <span className="text-xs text-gray-400 ml-1">{suffix}</span>
    </div>
  );
}
