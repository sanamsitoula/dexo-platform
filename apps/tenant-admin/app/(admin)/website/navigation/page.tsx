'use client';

import { useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { siteNavigationApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Field, Input } from '../../_ui';
import WebsiteSubNav from '@/components/WebsiteSubNav';

interface NavItem {
  id: string;
  label: string;
  order: number;
  kind: 'page' | 'route' | 'external';
  targetValue: string;
  enabled: boolean;
}

const KIND_LABELS: Record<NavItem['kind'], string> = {
  page: 'Internal page (slug)',
  route: 'Built-in route',
  external: 'External URL',
};

/**
 * Workstream A — Site Navigation tab. Unifies what was previously two
 * separate, fully hardcoded nav link lists (SiteNav.tsx and TemplateHome.tsx)
 * into one tenant-editable, drag-reorderable list backed by
 * Tenant.settings.navigation.items (see api/site-navigation module).
 * Auto-populated on first load from real Pages/Blog/ecommerce-domain status
 * — see SiteNavigationService.buildDefaultItems.
 */
export default function SiteNavigationPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKind, setNewKind] = useState<NavItem['kind']>('external');
  const [newTarget, setNewTarget] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!subdomain) return;
    setLoading(true);
    const r = await siteNavigationApi.list(subdomain);
    setItems(Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [subdomain]);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 2000);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(items, oldIndex, newIndex).map((i, idx) => ({ ...i, order: idx }));
    setItems(reordered); // optimistic
    const r = await siteNavigationApi.reorderAll(subdomain, reordered.map((i) => i.id));
    if (Array.isArray(r.data)) setItems(r.data);
  }

  async function toggleEnabled(item: NavItem) {
    const r = await siteNavigationApi.update(subdomain, item.id, { enabled: !item.enabled });
    if (r.data) setItems((prev) => prev.map((i) => (i.id === item.id ? r.data : i)));
  }

  async function rename(item: NavItem, label: string) {
    if (!label.trim() || label === item.label) return;
    const r = await siteNavigationApi.update(subdomain, item.id, { label });
    if (r.data) setItems((prev) => prev.map((i) => (i.id === item.id ? r.data : i)));
  }

  async function remove(item: NavItem) {
    if (!confirm(`Remove "${item.label}" from the nav?`)) return;
    await siteNavigationApi.remove(subdomain, item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function addItem() {
    if (!newLabel.trim() || !newTarget.trim()) return;
    const r = await siteNavigationApi.create(subdomain, { label: newLabel, kind: newKind, targetValue: newTarget, enabled: true });
    if (r.data) {
      setItems((prev) => [...prev, r.data]);
      setAdding(false); setNewLabel(''); setNewTarget(''); setNewKind('external');
      flash('Nav item added');
    }
  }

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <WebsiteSubNav />
      <PageHeader
        title="Navigation"
        subtitle="What shows in your site's top nav, in what order. Drag to reorder, toggle to show/hide, or add a custom link."
        action={<Btn onClick={() => setAdding(true)}>+ Add link</Btn>}
      />
      {msg && <p className="text-sm text-green-600 mb-3">{msg}</p>}

      {adding && (
        <Card className="p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Label"><Input value={newLabel} onChange={(e: any) => setNewLabel(e.target.value)} placeholder="Gallery" autoFocus /></Field>
            <Field label="Type">
              <select value={newKind} onChange={(e) => setNewKind(e.target.value as NavItem['kind'])} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label={newKind === 'page' ? 'Page slug' : newKind === 'route' ? 'Path (e.g. /shop)' : 'URL'}>
              <Input value={newTarget} onChange={(e: any) => setNewTarget(e.target.value)} placeholder={newKind === 'external' ? 'https://…' : newKind === 'page' ? 'about' : '/shop'} />
            </Field>
          </div>
          <div className="flex gap-2 mt-3">
            <Btn onClick={addItem} disabled={!newLabel.trim() || !newTarget.trim()}>Add</Btn>
            <Btn variant="outline" onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Card><p className="text-sm text-gray-500 p-4">No nav items yet.</p></Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableNavRow key={item.id} item={item} onToggle={() => toggleEnabled(item)} onRename={(l) => rename(item, l)} onRemove={() => remove(item)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableNavRow({ item, onToggle, onRename, onRemove }: {
  item: NavItem;
  onToggle: () => void;
  onRename: (label: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-3 flex items-center gap-3">
        <button {...attributes} {...listeners} type="button" title="Drag to reorder" className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 px-1 touch-none">⠿</button>
        <Input defaultValue={item.label} onBlur={(e: any) => onRename(e.target.value)} className="text-sm max-w-[10rem]" />
        <span className="text-xs text-gray-400 flex-1 truncate">
          {item.kind === 'page' ? `/${item.targetValue}` : item.targetValue}
        </span>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={item.enabled} onChange={onToggle} />
          {item.enabled ? 'Shown' : 'Hidden'}
        </label>
        <button onClick={onRemove} className="text-xs text-red-600 hover:underline">Remove</button>
      </Card>
    </div>
  );
}
