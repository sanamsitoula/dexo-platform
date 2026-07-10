'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { gymApi } from '@/lib/api';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

const CATEGORIES = ['STAPLE', 'VEGETABLE', 'FRUIT', 'PROTEIN', 'SNACK', 'BEVERAGE'];

export default function FoodDbPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', nameNepali: '', category: 'STAPLE', servingSize: '1 serving', calories: '', protein: '', carbs: '', fats: '', isVegetarian: true, isTraditional: false });

  const load = useCallback(async () => {
    const r = await gymApi.foodDb.list(subdomain, { category: category || undefined, search: search || undefined });
    setRows(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain, category, search]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    const r = await gymApi.foodDb.create(subdomain, {
      ...form,
      calories: Number(form.calories), protein: Number(form.protein || 0),
      carbs: Number(form.carbs || 0), fats: Number(form.fats || 0),
    });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  return (
    <div>
      <PageHeader title="Nepali Food Database" subtitle="Nutrition reference used by diet plans and the calorie tracker"
        action={<Btn onClick={() => setOpen(true)}>+ Add food</Btn>} />
      <div className="flex gap-3 mb-4 flex-wrap">
        <Input placeholder="Search foods…" value={search} onChange={(e: any) => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {loading ? <div className="text-gray-400">Loading…</div> : rows.length === 0 ? (
        <Card><EmptyState icon="🍛" title="No foods found" msg="Adjust your search or add a new food item." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-5 py-3">Food</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Serving</th>
                <th className="px-5 py-3">Kcal</th><th className="px-5 py-3">Protein</th><th className="px-5 py-3">Carbs</th><th className="px-5 py-3">Fats</th><th className="px-5 py-3">Tags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{f.name}{f.nameNepali ? <span className="text-gray-400 font-normal"> · {f.nameNepali}</span> : ''}</td>
                  <td className="px-5 py-3 text-gray-500">{f.category}</td>
                  <td className="px-5 py-3 text-gray-500">{f.servingSize}</td>
                  <td className="px-5 py-3">{f.calories}</td>
                  <td className="px-5 py-3 text-gray-500">{f.protein}g</td>
                  <td className="px-5 py-3 text-gray-500">{f.carbs}g</td>
                  <td className="px-5 py-3 text-gray-500">{f.fats}g</td>
                  <td className="px-5 py-3 space-x-1">
                    {f.isVegetarian && <Badge color="green">veg</Badge>}
                    {f.isTraditional && <Badge color="amber">traditional</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="Add food item">
        <Field label="Name"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Name (Nepali)"><Input value={form.nameNepali} onChange={(e: any) => setForm({ ...form, nameNepali: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Serving size"><Input value={form.servingSize} onChange={(e: any) => setForm({ ...form, servingSize: e.target.value })} /></Field>
          <Field label="Calories"><Input type="number" value={form.calories} onChange={(e: any) => setForm({ ...form, calories: e.target.value })} /></Field>
          <Field label="Protein (g)"><Input type="number" value={form.protein} onChange={(e: any) => setForm({ ...form, protein: e.target.value })} /></Field>
          <Field label="Carbs (g)"><Input type="number" value={form.carbs} onChange={(e: any) => setForm({ ...form, carbs: e.target.value })} /></Field>
          <Field label="Fats (g)"><Input type="number" value={form.fats} onChange={(e: any) => setForm({ ...form, fats: e.target.value })} /></Field>
        </div>
        <div className="flex gap-5 mb-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isVegetarian} onChange={(e) => setForm({ ...form, isVegetarian: e.target.checked })} /> Vegetarian</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isTraditional} onChange={(e) => setForm({ ...form, isTraditional: e.target.checked })} /> Traditional</label>
        </div>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={save} disabled={saving || !form.name || !form.calories}>{saving ? 'Saving…' : 'Add food'}</Btn>
      </SlideOver>
    </div>
  );
}
