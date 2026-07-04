'use client';

import { useEffect, useState } from 'react';
import { fitnessApi } from '../../lib/api';

const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export default function DietPage() {
  const [member, setMember] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [foods, setFoods] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [meal, setMeal] = useState('BREAKFAST');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const m = await fitnessApi.me();
      setMember(m.data);
      if (m.data?.id) { const s = await fitnessApi.foodLogs.summary(m.data.id); setSummary(s.data); }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fitnessApi.nepaliFoods(search || undefined);
      setFoods(Array.isArray(r.data) ? r.data : r.data?.items ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const totals = selected.reduce((a, f) => ({
    calories: a.calories + Number(f.calories || 0),
    protein: a.protein + Number(f.protein || 0),
    carbs: a.carbs + Number(f.carbs || 0),
    fats: a.fats + Number(f.fats || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  async function save() {
    if (!member?.id || selected.length === 0) return;
    setSaving(true);
    const res = await fitnessApi.foodLogs.create({
      memberId: member.id, mealType: meal, logDate: new Date().toISOString(),
      foodItems: selected.map((f) => ({ name: f.name, quantity: 1, calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats })),
      totalCalories: Math.round(totals.calories), totalProtein: totals.protein, totalCarbs: totals.carbs, totalFats: totals.fats,
    });
    setSaving(false);
    if (!res.error) {
      setSelected([]);
      const s = await fitnessApi.foodLogs.summary(member.id);
      setSummary(s.data);
      alert('Meal logged!');
    } else {
      alert(res.error);
    }
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-gray-900">Calorie Tracker</h1>

      {summary && (
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-orange-50 p-3 text-center">
          <div><div className="text-lg font-bold text-orange-600">{summary.calories ?? 0}</div><div className="text-xs text-gray-500">kcal today</div></div>
          <div><div className="text-lg font-bold text-orange-600">{Math.round(summary.protein ?? 0)}g</div><div className="text-xs text-gray-500">protein</div></div>
          <div><div className="text-lg font-bold text-orange-600">{Math.round(summary.carbs ?? 0)}g</div><div className="text-xs text-gray-500">carbs</div></div>
        </div>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {MEALS.map((m) => (
          <button key={m} onClick={() => setMeal(m)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${meal === m ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{m}</button>
        ))}
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Nepali foods (dal-bhat, momo…)" className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2" />

      <div className="mt-2 divide-y divide-gray-100">
        {foods.slice(0, 8).map((f) => (
          <button key={f.id} onClick={() => setSelected((s) => [...s, f])} className="flex w-full items-center justify-between py-2 text-left">
            <div>
              <div className="text-sm font-medium text-gray-800">{f.name} {f.nameNepali && <span className="text-gray-400">({f.nameNepali})</span>}</div>
              <div className="text-xs text-gray-400">{f.servingSize} · P {f.protein} C {f.carbs} F {f.fats}</div>
            </div>
            <div className="text-orange-600 font-bold text-sm">{f.calories}</div>
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 p-3">
          <div className="font-semibold text-gray-800">This meal</div>
          {selected.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-700">{f.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{f.calories} kcal</span>
                <button onClick={() => setSelected((s) => s.filter((_, idx) => idx !== i))} className="text-red-500">✕</button>
              </div>
            </div>
          ))}
          <div className="mt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span><span>{Math.round(totals.calories)} kcal · {Math.round(totals.protein)}g P</span>
          </div>
          <button onClick={save} disabled={saving} className="mt-3 w-full rounded-lg py-2 text-white font-semibold bg-orange-500 disabled:opacity-60">{saving ? 'Saving…' : 'Log Meal'}</button>
        </div>
      )}
    </div>
  );
}
