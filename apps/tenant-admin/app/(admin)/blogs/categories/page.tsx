'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { blogCategoryApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, EmptyState, Btn, Field, Input, SlideOver } from '../../_ui';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  thumbnail?: string | null;
  _count?: { blogs: number };
}

const EMPTY = { name: '', description: '', color: '#6366f1', thumbnail: '' };

export default function BlogCategoriesPage() {
  const subdomain = resolveTenantAdminSubdomain();
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
    const r = await blogCategoryApi.list(subdomain);
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
    setForm({
      name: cat.name,
      description: cat.description || '',
      color: cat.color || '#6366f1',
      thumbnail: cat.thumbnail || '',
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = {
      name: form.name,
      description: form.description || undefined,
      color: form.color || undefined,
      thumbnail: form.thumbnail || undefined,
    };
    const r = editing
      ? await blogCategoryApi.update(subdomain, editing.id, data)
      : await blogCategoryApi.create(subdomain, data);
    if (r.error) alert(r.error);
    else {
      setOpen(false);
      fetchCategories();
    }
    setSaving(false);
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    const r = await blogCategoryApi.remove(subdomain, cat.id);
    if (r.error) alert(r.error);
    else fetchCategories();
  }

  return (
    <div>
      <PageHeader
        title="Blog Categories"
        subtitle="Organize your blog posts into categories"
        action={
          <div className="flex items-center gap-2">
            <Link href="/blogs" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
              ← Blogs
            </Link>
            <Btn onClick={openCreate}>+ New Category</Btn>
          </div>
        }
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <Card><div className="p-10 text-center text-gray-400">Loading…</div></Card>
      ) : categories.length === 0 ? (
        <Card><EmptyState icon="🗂️" title="No categories yet" msg="Create categories to organize your blog posts." /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} className="overflow-hidden">
              {cat.thumbnail ? (
                <img src={cat.thumbnail} alt={cat.name} className="w-full h-28 object-cover" />
              ) : (
                <div
                  className="w-full h-28 flex items-center justify-center text-white text-3xl font-bold"
                  style={{ background: `linear-gradient(135deg, ${cat.color || '#6366f1'}, #8b5cf6)` }}
                >
                  {cat.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: cat.color || '#6366f1' }} />
                  <div className="font-semibold text-gray-900">{cat.name}</div>
                </div>
                {cat.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cat.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">{cat._count?.blogs ?? 0} posts</span>
                  <div className="space-x-3 text-sm">
                    <button onClick={() => openEdit(cat)} className="text-indigo-600 hover:text-indigo-800 font-semibold">Edit</button>
                    <button onClick={() => handleDelete(cat)} className="text-red-600 hover:text-red-800">Delete</button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <Field label="Name *">
          <Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fitness Tips" />
        </Field>
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Color">
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
          />
        </Field>
        <Field label="Thumbnail URL">
          <Input value={form.thumbnail} onChange={(e: any) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://example.com/image.jpg" />
        </Field>
        {form.thumbnail && <img src={form.thumbnail} alt="Preview" className="h-24 object-cover rounded-lg mb-4" />}
        <div className="flex items-center justify-end gap-2 mt-2">
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? 'Saving…' : editing ? 'Save' : 'Create'}</Btn>
        </div>
      </SlideOver>
    </div>
  );
}
