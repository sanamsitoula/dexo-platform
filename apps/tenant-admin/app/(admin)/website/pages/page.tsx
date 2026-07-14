'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { pageBuilderApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Badge, EmptyState, Field, Input } from '../../_ui';
import WebsiteSubNav from '@/components/WebsiteSubNav';

export default function PagesListPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!subdomain) return;
    setLoading(true);
    const r = await pageBuilderApi.list(subdomain);
    setPages(Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [subdomain]);

  async function createPage() {
    if (!name.trim()) return;
    setErr(null);
    const r = await pageBuilderApi.create(subdomain, { name });
    if (r.error) { setErr(r.error); return; }
    setName(''); setCreating(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this page and all its sections? This cannot be undone.')) return;
    await pageBuilderApi.remove(subdomain, id);
    load();
  }

  return (
    <div className="max-w-4xl">
      <WebsiteSubNav />
      <PageHeader title="Pages" subtitle="Custom pages built from the Component Library — Home, About, Landing Pages, and more."
        action={<Btn onClick={() => setCreating(true)}>+ New page</Btn>} />

      {creating && (
        <Card className="p-5 mb-4">
          <Field label="Page name"><Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="About Us" autoFocus /></Field>
          {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
          <div className="flex gap-2">
            <Btn onClick={createPage} disabled={!name.trim()}>Create</Btn>
            <Btn variant="outline" onClick={() => { setCreating(false); setName(''); setErr(null); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : pages.length === 0 ? (
        <Card><EmptyState icon="📄" title="No pages yet" msg="Create your first page — e.g. About, Careers, or a Landing Page." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Sections</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/website/pages/${p.id}`} className="text-indigo-600 hover:underline">{p.name}</Link>
                    <div className="text-xs text-gray-400 font-mono">/{p.slug}{p.isHomepage && ' (homepage)'}</div>
                  </td>
                  <td className="px-4 py-3">{p._count?.sections ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge color={
                      p.status === 'published' ? 'green' :
                      p.status === 'scheduled' || p.status === 'approved' ? 'indigo' :
                      p.status === 'in_review' ? 'amber' :
                      p.status === 'archived' ? 'red' : 'gray'
                    }>{p.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(p.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(p.id)} className="text-red-600 hover:underline text-xs">Delete</button>
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
