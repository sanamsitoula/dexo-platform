'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formsBuilderApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Badge, EmptyState, Field, Input } from '../../_ui';
import WebsiteSubNav from '@/components/WebsiteSubNav';

export default function FormsListPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!subdomain) return;
    setLoading(true);
    const r = await formsBuilderApi.list(subdomain);
    setForms(Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [subdomain]);

  async function createForm() {
    if (!name.trim()) return;
    setErr(null);
    const r = await formsBuilderApi.create(subdomain, { name });
    if (r.error) { setErr(r.error); return; }
    setName(''); setCreating(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this form and all its submissions? This cannot be undone.')) return;
    await formsBuilderApi.remove(subdomain, id);
    load();
  }

  return (
    <div className="max-w-4xl">
      <WebsiteSubNav />
      <PageHeader title="Forms" subtitle="Build forms and embed them on any page via the Component Library's Form section."
        action={<Btn onClick={() => setCreating(true)}>+ New form</Btn>} />

      {creating && (
        <Card className="p-5 mb-4">
          <Field label="Form name"><Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Contact Us" autoFocus /></Field>
          {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
          <div className="flex gap-2">
            <Btn onClick={createForm} disabled={!name.trim()}>Create</Btn>
            <Btn variant="outline" onClick={() => { setCreating(false); setName(''); setErr(null); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : forms.length === 0 ? (
        <Card><EmptyState icon="📋" title="No forms yet" msg="Create a contact, booking, or feedback form." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Fields</th>
                <th className="px-4 py-3">Submissions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/website/forms/${f.id}`} className="text-indigo-600 hover:underline">{f.name}</Link>
                  </td>
                  <td className="px-4 py-3">{f._count?.fields ?? 0}</td>
                  <td className="px-4 py-3">{f._count?.submissions ?? 0}</td>
                  <td className="px-4 py-3"><Badge color={f.status === 'published' ? 'green' : 'gray'}>{f.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(f.id)} className="text-red-600 hover:underline text-xs">Delete</button>
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
