'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { tenantMailApi } from '@/lib/api';
import { PageHeader, Card, Btn, Field, Input } from '../_ui';

export default function EmailSettingsPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [form, setForm] = useState<any>({ host: '', port: 587, secure: false, user: '', pass: '', fromName: '', fromEmail: '', enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await tenantMailApi.getConfig(subdomain);
    if (r.data && r.data.host) setForm({ port: 587, secure: false, enabled: true, ...r.data });
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setMsg(null);
    const r = await tenantMailApi.saveConfig(subdomain, { ...form, port: Number(form.port) });
    setSaving(false);
    setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: 'SMTP settings saved.' });
    if (!r.error && r.data) setForm({ ...form, ...r.data });
  }

  async function test() {
    setTesting(true); setMsg(null);
    const r = await tenantMailApi.test(subdomain);
    setTesting(false);
    const ok = !r.error && r.data?.success;
    setMsg(ok
      ? { ok: true, text: `Test email sent via ${r.data.via} SMTP ✔ (check your inbox / MailHog at :8025)` }
      : { ok: false, text: r.data?.error || r.error || 'Test failed' });
  }

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div>
      <PageHeader title="Email (SMTP)" subtitle="Your own SMTP server for onboarding, password reset and receipt emails. Leave empty to use the platform mail service." />
      <div className="max-w-xl">
        <Card className="p-6">
          <Field label="SMTP host"><Input value={form.host} onChange={(e: any) => setForm({ ...form, host: e.target.value })} placeholder="smtp.yourgym.com" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Port"><Input type="number" value={form.port} onChange={(e: any) => setForm({ ...form, port: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm mt-7">
              <input type="checkbox" checked={!!form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} /> TLS/SSL (port 465)
            </label>
          </div>
          <Field label="Username"><Input value={form.user ?? ''} onChange={(e: any) => setForm({ ...form, user: e.target.value })} placeholder="apikey / mailbox user" /></Field>
          <Field label="Password"><Input type="password" value={form.pass ?? ''} onChange={(e: any) => setForm({ ...form, pass: e.target.value })} placeholder="••••••••" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From name"><Input value={form.fromName ?? ''} onChange={(e: any) => setForm({ ...form, fromName: e.target.value })} placeholder="VR Fitness" /></Field>
            <Field label="From email"><Input type="email" value={form.fromEmail ?? ''} onChange={(e: any) => setForm({ ...form, fromEmail: e.target.value })} placeholder="hello@vrfitness.com" /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm mb-5">
            <input type="checkbox" checked={form.enabled !== false} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Use this SMTP server for outgoing email
          </label>
          {msg && <p className={`text-sm mb-3 ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
          <div className="flex gap-2">
            <Btn onClick={save} disabled={saving || !form.host}>{saving ? 'Saving…' : 'Save settings'}</Btn>
            <Btn variant="outline" onClick={test} disabled={testing}>{testing ? 'Sending…' : 'Send test email'}</Btn>
          </div>
        </Card>
        <p className="text-xs text-gray-400 mt-3">
          Emails sent automatically: <b>welcome email</b> when a customer registers, <b>password reset</b> links, and payment receipts.
          Without your own SMTP these are delivered by the platform mail service (MailHog at <code>localhost:8025</code> in local dev).
        </p>
      </div>
    </div>
  );
}
