'use client';

import { useEffect, useState } from 'react';
import { getPublicForm, submitPublicForm, type PublicForm, type PublicFormField } from '@/lib/api';

/** Renders + submits a Forms Builder form embedded via the "form"
 * Component Library entry (PageSection content: { formId }). Client
 * component (unlike the other section renderers) since it needs to fetch
 * the form definition and POST the submission interactively. */
export default function PublicFormRenderer({ subdomain, formId, colorPrimary }: { subdomain: string; formId: string; colorPrimary?: string }) {
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const color = colorPrimary || '#4F46E5';

  useEffect(() => {
    if (!formId) { setLoading(false); return; }
    getPublicForm(subdomain, formId).then((f) => { setForm(f); setLoading(false); });
  }, [subdomain, formId]);

  if (loading) return null;
  if (!form) return null; // not found / not published — fail silently rather than showing a broken section to visitors

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    const r = await submitPublicForm(subdomain, form.id, values);
    setSubmitting(false);
    setResult(r);
    if (r.ok) setValues({});
  }

  if (result?.ok) {
    return (
      <section className="px-4 py-16 max-w-xl mx-auto text-center">
        <p className="text-lg font-semibold" style={{ color }}>{result.message}</p>
      </section>
    );
  }

  return (
    <section className="px-4 py-16 max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {form.fields.map((field) => (
          <FormFieldInput key={field.id} field={field} value={values[field.id]} onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))} />
        ))}
        {result && !result.ok && <p className="text-sm text-red-600">{result.message}</p>}
        <button type="submit" disabled={submitting} className="w-full py-3 rounded-lg font-semibold text-white disabled:opacity-50" style={{ backgroundColor: color }}>
          {submitting ? 'Submitting…' : form.submitLabel}
        </button>
      </form>
    </section>
  );
}

function FormFieldInput({ field, value, onChange }: { field: PublicFormField; value: any; onChange: (v: any) => void }) {
  const base = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.required && ' *'}</label>
        <textarea required={field.required} placeholder={field.placeholder || ''} rows={3} className={base}
          value={value || ''} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" required={field.required} checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label}{field.required && ' *'}
      </label>
    );
  }

  if (field.type === 'radio') {
    return (
      <div>
        <div className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.required && ' *'}</div>
        <div className="space-y-1">
          {field.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" name={field.id} required={field.required} checked={value === opt} onChange={() => onChange(opt)} />
              {opt}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'dropdown') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.required && ' *'}</label>
        <select required={field.required} className={base} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }

  if (field.type === 'rating') {
    return (
      <div>
        <div className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.required && ' *'}</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => onChange(n)} className={`text-2xl ${value >= n ? 'opacity-100' : 'opacity-30'}`}>★</button>
          ))}
        </div>
      </div>
    );
  }

  const htmlType = field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.required && ' *'}</label>
      <input type={htmlType} required={field.required} placeholder={field.placeholder || ''} className={base}
        value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
