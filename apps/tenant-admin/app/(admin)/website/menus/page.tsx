'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { menuBuilderApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Badge, EmptyState, Field, Input } from '../../_ui';
import WebsiteSubNav from '@/components/WebsiteSubNav';

export default function MenusListPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!subdomain) return;
    setLoading(true);
    const r = await menuBuilderApi.list(subdomain);
    setMenus(Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [subdomain]);

  async function createMenu() {
    if (!name.trim()) return;
    setErr(null);
    const r = await menuBuilderApi.create(subdomain, { name });
    if (r.error) { setErr(r.error); return; }
    setName(''); setCreating(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this menu and all its items? This cannot be undone.')) return;
    await menuBuilderApi.remove(subdomain, id);
    load();
  }

  return (
    <div className="max-w-4xl">
      <WebsiteSubNav />
      <PageHeader title="Homepage Sections" subtitle="Reusable content sections — services, team, locations, FAQ, pricing, gallery — rendered on your homepage. For standalone pages (About, Careers, Landing Pages), use Pages instead."
        action={<Btn onClick={() => setCreating(true)}>+ New menu</Btn>} />

      {creating && (
        <Card className="p-5 mb-4">
          <Field label="Menu name"><Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Services" autoFocus /></Field>
          {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
          <div className="flex gap-2">
            <Btn onClick={createMenu} disabled={!name.trim()}>Create</Btn>
            <Btn variant="outline" onClick={() => { setCreating(false); setName(''); setErr(null); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : menus.length === 0 ? (
        <Card><EmptyState icon="🗂️" title="No menus yet" msg="Create your first menu — e.g. Services, Team, or Locations." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {menus.map((m) => (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/website/menus/${m.id}`} className="text-indigo-600 hover:underline">{m.name}</Link>
                    <div className="text-xs text-gray-400 font-mono">/{m.slug}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{m.displayTemplate}</td>
                  <td className="px-4 py-3">{m._count?.items ?? 0}</td>
                  <td className="px-4 py-3"><Badge color={m.status === 'published' ? 'green' : 'gray'}>{m.status}</Badge></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(m.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(m.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
