'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ecommerceApi } from '@/lib/api';
import { PageHeader, Card, EmptyState, Btn, Field, Input, SlideOver } from '../../_ui';

interface Category {
  id: string;
  name: string;
  slug?: string | null;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
}

const EMPTY = { name: '', slug: '', parentId: '' };

export default function ProductCategoriesPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  async function fetchCategories() {
    setLoading(true);
    const r = await ecommerceApi.categories.list(subdomain);
    if (r.data) setCategories(Array.isArray(r.data) ? r.data : []);
    else if (r.error) setError(r.error);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug || '', parentId: cat.parentId || '' });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = {
      name: form.name,
      slug: form.slug || undefined,
      parentId: form.parentId || undefined,
    };
    const r = editing
      ? await ecommerceApi.categories.update(subdomain, editing.id, data)
      : await ecommerceApi.categories.create(subdomain, data);
    if (r.error) alert(r.error);
    else {
      setOpen(false);
      fetchCategories();
    }
    setSaving(false);
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    const r = await ecommerceApi.categories.remove(subdomain, cat.id);
    if (r.error) alert(r.error);
    else fetchCategories();
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Organize your products into categories"
        action={
          <div className="flex items-center gap-2">
            <Link href="/products" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
              ← Products
            </Link>
            <Btn onClick={openCreate}>+ New Category</Btn>
          </div>
        }
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <Card>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : categories.length === 0 ? (
          <EmptyState icon="🗂️" title="No categories yet" msg="Create categories to organize your products." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Slug</th>
                  <th className="text-left px-4 py-3 font-semibold">Parent</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{cat.name}</td>
                    <td className="px-4 py-3 text-gray-500">{cat.slug || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{cat.parent?.name || '—'}</td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <button onClick={() => openEdit(cat)} className="text-indigo-600 hover:text-indigo-800 font-semibold">Edit</button>
                      <button onClick={() => handleDelete(cat)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SlideOver open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <Field label="Name *">
          <Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electronics" />
        </Field>
        <Field label="Slug">
          <Input value={form.slug} onChange={(e: any) => setForm({ ...form, slug: e.target.value })} placeholder="electronics" />
        </Field>
        <Field label="Parent Category">
          <select
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">None (top-level)</option>
            {categories.filter((c) => c.id !== editing?.id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-center justify-end gap-2 mt-2">
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? 'Saving…' : editing ? 'Save' : 'Create'}</Btn>
        </div>
      </SlideOver>
    </div>
  );
}
