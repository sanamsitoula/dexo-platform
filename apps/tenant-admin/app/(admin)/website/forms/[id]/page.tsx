'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formsBuilderApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { FORM_FIELD_TYPES } from '@dexo/shared/src/forms-builder';
import { PageHeader, Card, Btn, Badge, Field, Input } from '../../../_ui';
import WebsiteSubNav from '@/components/WebsiteSubNav';

export default function FormEditorPage() {
  const params = useParams();
  const formId = params?.id as string;
  const subdomain = resolveTenantAdminSubdomain();

  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'fields' | 'submissions'>('fields');
  const [submissions, setSubmissions] = useState<any[] | null>(null);
  const [addingField, setAddingField] = useState(false);
  const [newField, setNewField] = useState({ type: 'text', label: '', required: false, options: '' });
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!subdomain || !formId) return;
    setLoading(true);
    const r = await formsBuilderApi.get(subdomain, formId);
    setForm(r.data || null);
    setLoading(false);
  }
  useEffect(() => { load(); }, [subdomain, formId]);

  async function loadSubmissions() {
    const r = await formsBuilderApi.submissions(subdomain, formId);
    setSubmissions(Array.isArray(r.data) ? r.data : []);
  }
  useEffect(() => { if (tab === 'submissions' && submissions === null) loadSubmissions(); }, [tab]);

  async function saveSettings(patch: any) {
    const r = await formsBuilderApi.update(subdomain, formId, patch);
    if (!r.error) { setMsg('Saved'); setTimeout(() => setMsg(null), 1500); load(); }
  }

  async function addField() {
    if (!newField.label.trim()) return;
    const def = FORM_FIELD_TYPES.find((f) => f.key === newField.type);
    const options = def?.needsOptions ? newField.options.split(',').map((s) => s.trim()).filter(Boolean) : [];
    await formsBuilderApi.createField(subdomain, formId, { type: newField.type, label: newField.label, required: newField.required, options });
    setNewField({ type: 'text', label: '', required: false, options: '' });
    setAddingField(false);
    load();
  }

  async function removeField(fieldId: string) {
    if (!confirm('Remove this field?')) return;
    await formsBuilderApi.removeField(subdomain, fieldId);
    load();
  }

  async function moveField(fieldId: string, direction: 'up' | 'down') {
    await formsBuilderApi.reorderField(subdomain, fieldId, direction);
    load();
  }

  if (loading || !form) return <div className="text-gray-400">Loading…</div>;

  const needsOptions = FORM_FIELD_TYPES.find((f) => f.key === newField.type)?.needsOptions;

  return (
    <div className="max-w-4xl">
      <WebsiteSubNav />
      <PageHeader
        title={form.name}
        action={<Badge color={form.status === 'published' ? 'green' : 'gray'}>{form.status}</Badge>}
      />

      <Card className="p-5 mb-4">
        <div className="font-bold text-gray-900 mb-3">Settings</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name">
            <Input defaultValue={form.name} onBlur={(e: any) => e.target.value !== form.name && saveSettings({ name: e.target.value })} />
          </Field>
          <Field label="Status">
            <select
              defaultValue={form.status}
              onChange={(e) => saveSettings({ status: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Submit button text">
            <Input defaultValue={form.submitLabel} onBlur={(e: any) => e.target.value !== form.submitLabel && saveSettings({ submitLabel: e.target.value })} />
          </Field>
          <Field label="Notify email (optional)">
            <Input defaultValue={form.notifyEmail || ''} onBlur={(e: any) => saveSettings({ notifyEmail: e.target.value })} placeholder="you@business.com" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Success message">
            <textarea defaultValue={form.successMessage} onBlur={(e) => saveSettings({ successMessage: e.target.value })} rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </Field>
        </div>
        {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
        {form.status !== 'published' && <p className="text-xs text-amber-600 mt-2">This form must be published before it can be embedded on a live page.</p>}
      </Card>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('fields')} className={`px-3 py-1.5 text-sm rounded-md ${tab === 'fields' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Fields</button>
        <button onClick={() => setTab('submissions')} className={`px-3 py-1.5 text-sm rounded-md ${tab === 'submissions' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Submissions ({form._count?.submissions ?? 0})</button>
      </div>

      {tab === 'fields' && (
        <>
          <div className="flex justify-end mb-3">
            <Btn onClick={() => setAddingField(true)}>+ Add field</Btn>
          </div>
          {addingField && (
            <Card className="p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Field type">
                  <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {FORM_FIELD_TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                  </select>
                </Field>
                <Field label="Label"><Input value={newField.label} onChange={(e: any) => setNewField({ ...newField, label: e.target.value })} placeholder="Your name" /></Field>
                {needsOptions && (
                  <Field label="Options (comma-separated)">
                    <Input value={newField.options} onChange={(e: any) => setNewField({ ...newField, options: e.target.value })} placeholder="Option A, Option B" />
                  </Field>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
                  <input type="checkbox" checked={newField.required} onChange={(e) => setNewField({ ...newField, required: e.target.checked })} />
                  Required
                </label>
              </div>
              <div className="flex gap-2 mt-3">
                <Btn onClick={addField} disabled={!newField.label.trim()}>Add</Btn>
                <Btn variant="outline" onClick={() => setAddingField(false)}>Cancel</Btn>
              </div>
            </Card>
          )}

          {form.fields.length === 0 ? (
            <Card className="p-8 text-center text-gray-400">No fields yet.</Card>
          ) : (
            <div className="space-y-2">
              {form.fields.map((field: any, i: number) => {
                const def = FORM_FIELD_TYPES.find((t) => t.key === field.type);
                return (
                  <Card key={field.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>{def?.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{field.label}{field.required && <span className="text-red-500"> *</span>}</div>
                        <div className="text-xs text-gray-400">{def?.label}{field.options?.length ? ` — ${field.options.join(', ')}` : ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button onClick={() => moveField(field.id, 'up')} disabled={i === 0} className="text-gray-500 hover:text-gray-800 disabled:opacity-30">↑</button>
                      <button onClick={() => moveField(field.id, 'down')} disabled={i === form.fields.length - 1} className="text-gray-500 hover:text-gray-800 disabled:opacity-30">↓</button>
                      <button onClick={() => removeField(field.id)} className="text-red-600 hover:underline">Remove</button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'submissions' && (
        submissions === null ? (
          <div className="text-gray-400">Loading…</div>
        ) : submissions.length === 0 ? (
          <Card className="p-8 text-center text-gray-400">No submissions yet.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Submitted</th>
                  {form.fields.map((f: any) => <th key={f.id} className="px-4 py-3">{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(s.createdAt).toLocaleString()}</td>
                    {form.fields.map((f: any) => (
                      <td key={f.id} className="px-4 py-3">{String(s.data?.[f.id] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}
    </div>
  );
}
