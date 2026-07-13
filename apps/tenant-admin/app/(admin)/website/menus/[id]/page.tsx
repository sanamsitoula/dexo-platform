'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { menuBuilderApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Badge, Field, Input, SlideOver, EmptyState } from '../../../_ui';

const TEMPLATES = ['grid', 'table', 'carousel', 'list', 'accordion', 'map'];

const EMPTY_ITEM = {
  title: '', shortDescription: '', description: '', icon: '', linkUrl: '', status: 'draft',
};

export default function MenuEditorPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const subdomain = resolveTenantAdminSubdomain();
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState<any>(EMPTY_ITEM);
  const [itemErr, setItemErr] = useState<string | null>(null);

  async function load() {
    if (!subdomain || !id) return;
    setLoading(true);
    const r = await menuBuilderApi.get(subdomain, id);
    setMenu(r.data || null);
    setLoading(false);
  }
  useEffect(() => { load(); }, [subdomain, id]);

  async function saveMenuField(patch: any) {
    setSaving(true); setMsg(null);
    const r = await menuBuilderApi.update(subdomain, id, patch);
    setSaving(false);
    if (r.error) { setMsg({ ok: false, text: r.error }); return; }
    setMenu((m: any) => ({ ...m, ...r.data }));
    setMsg({ ok: true, text: 'Saved.' });
  }

  function openNewItem() {
    setEditingItem(null);
    setItemForm(EMPTY_ITEM);
    setItemErr(null);
    setItemOpen(true);
  }
  function openEditItem(item: any) {
    setEditingItem(item);
    setItemForm({
      title: item.title, shortDescription: item.shortDescription || '', description: item.description || '',
      icon: item.icon || '', linkUrl: item.linkUrl || '', status: item.status,
    });
    setItemErr(null);
    setItemOpen(true);
  }

  async function saveItem() {
    if (!itemForm.title.trim()) { setItemErr('Title is required'); return; }
    setItemErr(null);
    const r = editingItem
      ? await menuBuilderApi.updateItem(subdomain, editingItem.id, itemForm)
      : await menuBuilderApi.createItem(subdomain, id, itemForm);
    if (r.error) { setItemErr(r.error); return; }
    setItemOpen(false);
    load();
  }

  async function removeItem(itemId: string) {
    if (!confirm('Delete this item?')) return;
    await menuBuilderApi.removeItem(subdomain, itemId);
    load();
  }

  async function move(itemId: string, direction: 'up' | 'down') {
    await menuBuilderApi.reorderItem(subdomain, itemId, direction);
    load();
  }

  async function togglePublish(item: any) {
    await menuBuilderApi.updateItem(subdomain, item.id, { status: item.status === 'published' ? 'draft' : 'published' });
    load();
  }

  if (loading) return <div className="text-gray-400">Loading…</div>;
  if (!menu) return <div className="text-red-600">Menu not found.</div>;

  const items = (menu.items || []).filter((i: any) => !i.parentId);

  return (
    <div className="max-w-4xl">
      <Link href="/website/menus" className="text-sm text-gray-500 hover:text-gray-700">← Back to Menus</Link>
      <PageHeader title={menu.name} subtitle={`/${menu.slug} · ${items.length} item${items.length === 1 ? '' : 's'}`}
        action={<Badge color={menu.status === 'published' ? 'green' : 'gray'}>{menu.status}</Badge>} />

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-3">Settings</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <Input value={menu.name} onChange={(e: any) => setMenu({ ...menu, name: e.target.value })}
              onBlur={() => saveMenuField({ name: menu.name })} />
          </Field>
          <Field label="Display template">
            <select value={menu.displayTemplate} onChange={(e) => { setMenu({ ...menu, displayTemplate: e.target.value }); saveMenuField({ displayTemplate: e.target.value }); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize">
              {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Btn onClick={() => saveMenuField({ status: menu.status === 'published' ? 'draft' : 'published' })} disabled={saving}>
            {menu.status === 'published' ? 'Unpublish' : 'Publish menu'}
          </Btn>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-gray-900">Items</div>
          <Btn onClick={openNewItem}>+ Add item</Btn>
        </div>

        {items.length === 0 ? (
          <EmptyState icon="📋" title="No items yet" msg="Add your first item to this menu." />
        ) : (
          <div className="space-y-2">
            {items.map((item: any, i: number) => (
              <div key={item.id} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3">
                <div className="flex flex-col">
                  <button onClick={() => move(item.id, 'up')} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs">▲</button>
                  <button onClick={() => move(item.id, 'down')} disabled={i === items.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs">▼</button>
                </div>
                {item.icon && <div className="text-2xl">{item.icon}</div>}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{item.title}</div>
                  {item.shortDescription && <div className="text-xs text-gray-500 truncate">{item.shortDescription}</div>}
                </div>
                <Badge color={item.status === 'published' ? 'green' : 'gray'}>{item.status}</Badge>
                <button onClick={() => togglePublish(item)} className="text-xs text-indigo-600 hover:underline">
                  {item.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => openEditItem(item)} className="text-xs text-gray-600 hover:underline">Edit</button>
                <button onClick={() => removeItem(item.id)} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SlideOver open={itemOpen} onClose={() => setItemOpen(false)} title={editingItem ? 'Edit item' : 'New item'}>
        <Field label="Title"><Input value={itemForm.title} onChange={(e: any) => setItemForm({ ...itemForm, title: e.target.value })} placeholder="Gym" /></Field>
        <Field label="Icon (emoji)"><Input value={itemForm.icon} onChange={(e: any) => setItemForm({ ...itemForm, icon: e.target.value })} placeholder="🏋️" /></Field>
        <Field label="Short description"><Input value={itemForm.shortDescription} onChange={(e: any) => setItemForm({ ...itemForm, shortDescription: e.target.value })} placeholder="For card previews" /></Field>
        <Field label="Full description">
          <textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Full details shown on the item page" />
        </Field>
        <Field label="Link (optional)"><Input value={itemForm.linkUrl} onChange={(e: any) => setItemForm({ ...itemForm, linkUrl: e.target.value })} placeholder="/book or https://…" /></Field>
        <div className="flex items-center gap-2 mb-4">
          <input type="checkbox" checked={itemForm.status === 'published'} onChange={(e) => setItemForm({ ...itemForm, status: e.target.checked ? 'published' : 'draft' })} />
          <label className="text-sm text-gray-700">Published (visible on public site)</label>
        </div>
        {itemErr && <p className="text-sm text-red-600 mb-3">{itemErr}</p>}
        <Btn onClick={saveItem} disabled={!itemForm.title.trim()}>{editingItem ? 'Save changes' : 'Add item'}</Btn>
      </SlideOver>
    </div>
  );
}
