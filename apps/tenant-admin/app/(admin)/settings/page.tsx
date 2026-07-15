'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tenantApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Field, Input } from '../_ui';
import FileUpload from '@/components/FileUpload';

export default function SettingsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [tenant, setTenant] = useState<any>(null);
  // Brand color and tagline are deliberately NOT edited here — the Theme
  // Builder (Website → Theme) is the single owner of visual branding, so the
  // two surfaces can't fight over the same settings.branding keys.
  const [form, setForm] = useState({
    logo: '',
    email: '', phone: '', address: '',
    facebook: '', instagram: '', tiktok: '', youtube: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const t = await tenantApi.getBySubdomain(subdomain);
      setTenant(t.data);
      // branding lives nested under settings.branding (see
      // provisioning.service.ts) — reading it flat off settings was this
      // page's original bug (signup-time logo/colors/tagline never showed up).
      const b = t.data?.settings?.branding || {};
      setForm((f) => ({
        ...f,
        logo: b.logo || '',
        email: b.email || '', phone: b.phone || '', address: b.address || '',
        facebook: b.social?.facebook || '',
        instagram: b.social?.instagram || '',
        tiktok: b.social?.tiktok || '',
        youtube: b.social?.youtube || '',
      }));
      setLoading(false);
    })();
  }, [subdomain]);

  async function save() {
    setSaving(true); setMsg(null);
    // Shallow-merged server-side into settings.branding — only sends the
    // fields this page owns (logo + contact + socials), so it never clobbers
    // colorPrimary/tagline/templateId owned by the Theme Builder and Website
    // Builder pages.
    const r = await tenantApi.updateOwnBranding(subdomain, {
      logo: form.logo,
      email: form.email, phone: form.phone, address: form.address,
      social: { facebook: form.facebook, instagram: form.instagram, tiktok: form.tiktok, youtube: form.youtube },
    });
    setSaving(false);
    setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: 'Saved — your website updates automatically.' });
  }

  const set = (k: keyof typeof form) => (e: any) => setForm({ ...form, [k]: e.target.value });
  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Gym Settings" subtitle={`${tenant?.name || subdomain} · these details power your public website`} />

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-1">Logo</div>
        <p className="text-xs text-gray-400 mb-4">
          Colors, tagline and fonts are managed in{' '}
          <Link href="/website/theme" className="text-indigo-600 hover:underline font-medium">Website → Theme Builder</Link>{' '}
          so your site stays consistent. If you don&apos;t upload a logo, your website shows its default.
        </p>
        <Field label="Logo">
          <FileUpload
            subdomain={subdomain}
            documentType="LOGO"
            isPublic
            preview={
              form.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo} alt="Logo preview" className="w-16 h-16 rounded-lg object-cover mb-2 border border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-lg mb-2 border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xl font-bold text-gray-400">
                  {(tenant?.name || subdomain || '?').charAt(0).toUpperCase()}
                </div>
              )
            }
            onUploaded={(files) => {
              if (files[0]) setForm((f) => ({ ...f, logo: files[0].url }));
            }}
          />
        </Field>
      </Card>

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-4">Contact (shown on your website footer)</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><Input value={form.email} onChange={set('email')} placeholder="hello@yourgym.com" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set('phone')} placeholder="+977…" /></Field>
        </div>
        <Field label="Address"><Input value={form.address} onChange={set('address')} /></Field>
      </Card>

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-4">Social links (footer)</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Facebook"><Input value={form.facebook} onChange={set('facebook')} placeholder="https://facebook.com/…" /></Field>
          <Field label="Instagram"><Input value={form.instagram} onChange={set('instagram')} placeholder="https://instagram.com/…" /></Field>
          <Field label="TikTok"><Input value={form.tiktok} onChange={set('tiktok')} /></Field>
          <Field label="YouTube"><Input value={form.youtube} onChange={set('youtube')} /></Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Btn>
        {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
