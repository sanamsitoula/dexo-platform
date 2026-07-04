'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fitnessApi } from '../../lib/api';

const GOALS = [
  { key: 'WEIGHT_LOSS', label: 'Lose weight', icon: '🔥' },
  { key: 'MUSCLE_GAIN', label: 'Build muscle', icon: '💪' },
  { key: 'ENDURANCE', label: 'Endurance', icon: '🏃' },
  { key: 'FLEXIBILITY', label: 'Flexibility', icon: '🧘' },
  { key: 'GENERAL_FITNESS', label: 'Stay fit', icon: '⚡' },
  { key: 'STRENGTH', label: 'Get stronger', icon: '🏋️' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [medical, setMedical] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [m, p] = await Promise.all([fitnessApi.me(), fitnessApi.plans()]);
      if (m.data) setMember(m.data);
      if (p.data) setPlans(Array.isArray(p.data) ? p.data : p.data?.items ?? []);
    })();
  }, []);

  const toggleGoal = (k: string) => setGoals((g) => (g.includes(k) ? g.filter((x) => x !== k) : [...g, k]));

  async function saveProfile() {
    setSaving(true);
    await fitnessApi.updateMe({ goals: goals.join(','), height: height ? parseFloat(height) : undefined, weight: weight ? parseFloat(weight) : undefined, medicalConditions: medical || undefined });
    setSaving(false);
    setStep(2);
  }

  async function choose(planId: string) {
    if (!member?.id) return;
    setSaving(true);
    await fitnessApi.memberships.create(member.id, planId);
    setSaving(false);
    router.replace('/membership');
  }

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-10 pb-6 text-white" style={{ background: '#E85D24' }}>
        <div className="text-sm opacity-90">Step {step} of 2</div>
        <div className="mt-2 h-1.5 bg-white/30 rounded"><div className="h-1.5 bg-white rounded" style={{ width: step === 1 ? '50%' : '100%' }} /></div>
      </div>

      <div className="px-6 py-6">
        {step === 1 ? (
          <>
            <h1 className="text-xl font-bold text-gray-900">Set up your profile</h1>
            <p className="text-gray-500 text-sm">Tell us your goals so we can tailor your plan.</p>

            <div className="mt-4 text-sm font-semibold text-gray-700">Your goals</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {GOALS.map((g) => {
                const active = goals.includes(g.key);
                return (
                  <button key={g.key} onClick={() => toggleGoal(g.key)}
                    className={`rounded-xl border p-3 text-center ${active ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <div className="text-2xl">{g.icon}</div>
                    <div className={`text-xs mt-1 ${active ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}>{g.label}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Height (cm)</label>
                <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="170" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Weight (kg)</label>
                <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="65" />
              </div>
            </div>

            <label className="mt-4 block text-sm font-semibold text-gray-700">Medical conditions (optional)</label>
            <textarea value={medical} onChange={(e) => setMedical(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" rows={2} placeholder="Injuries, allergies…" />

            <button onClick={saveProfile} disabled={saving} className="mt-6 w-full rounded-lg py-2.5 text-white font-semibold disabled:opacity-60" style={{ background: '#E85D24' }}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">Choose your plan</h1>
            <p className="text-gray-500 text-sm">Pick a membership to unlock everything.</p>
            <div className="mt-4 space-y-3">
              {plans.length === 0 && <p className="text-gray-400 text-sm">No plans available yet — you can pick one later.</p>}
              {plans.map((p) => (
                <div key={p.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-gray-900">{p.name}</div>
                    <div className="font-bold text-orange-600">NPR {p.totalWithVat}</div>
                  </div>
                  {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
                  <button onClick={() => choose(p.id)} disabled={saving} className="mt-3 w-full rounded-lg py-2 text-white text-sm font-semibold disabled:opacity-60" style={{ background: '#E85D24' }}>
                    Select {p.name}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => router.replace('/')} className="mt-4 w-full text-gray-500 text-sm font-medium py-2">Skip for now</button>
          </>
        )}
      </div>
    </div>
  );
}
