'use client';

import { useEffect, useState } from 'react';
import { tenantSettingsApi, tenantApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Field, Input } from '../_ui';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';

const TEMPLATES = [
  { key: 'energetic', name: 'Energetic', desc: 'Bold hero, big imagery', color: '#E85D24' },
  { key: 'minimal', name: 'Minimal', desc: 'Clean, lots of whitespace', color: '#0F172A' },
  { key: 'vibrant', name: 'Vibrant', desc: 'Colorful & playful', color: '#7C3AED' },
];

export default function WebsiteBuilderPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [tenant, setTenant] = useState<any>(null);
  const [cfg, setCfg] = useState({ template: 'energetic', heroTitle: '', heroSubtitle: '', about: '', ctaLabel: 'Join now' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const [t, s] = await Promise.all([tenantApi.getBySubdomain(subdomain), tenantSettingsApi.get(subdomain).catch(() => ({ data: null }))]);
      setTenant(t.data);
      const w = (s.data?.websiteConfig) || (t.data?.settings?.websiteConfig) || {};
      setCfg((c) => ({ ...c, ...w, heroTitle: w.heroTitle || t.data?.name || '', heroSubtitle: w.heroSubtitle || t.data?.settings?.tagline || '' }));
      setLoading(false);
    })();
  }, [subdomain]);

  async function save() {
    setSaving(true); setMsg(null);
    const r = await tenantSettingsApi.set(subdomain, 'websiteConfig', cfg);
    setSaving(false);
    setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: 'Published — view your live site.' });
  }

  const set = (k: keyof typeof cfg) => (e: any) => setCfg({ ...cfg, [k]: e.target.value });
  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Website Builder" subtitle="Design your public site — no code"
        action={<a href={`http://${subdomain}.${PLATFORM_DOMAIN}`} target="_blank" rel="noreferrer"><Btn variant="outline">↗ Preview site</Btn></a>} />

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-3">Template</div>
        <div className="grid grid-cols-3 gap-3">
          {TEMPLATES.map((t) => (
            <button key={t.key} onClick={() => setCfg({ ...cfg, template: t.key })}
              className="rounded-xl border-2 p-4 text-left transition" style={{ borderColor: cfg.template === t.key ? t.color : '#e5e7eb' }}>
              <div className="h-2 w-10 rounded-full mb-2" style={{ background: t.color }} />
              <div className="font-semibold text-gray-900">{t.name}</div>
              <div className="text-xs text-gray-500">{t.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-3">Hero</div>
        <Field label="Headline"><Input value={cfg.heroTitle} onChange={set('heroTitle')} /></Field>
        <Field label="Subtitle"><Input value={cfg.heroSubtitle} onChange={set('heroSubtitle')} /></Field>
        <Field label="Call-to-action label"><Input value={cfg.ctaLabel} onChange={set('ctaLabel')} /></Field>
      </Card>

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-3">About</div>
        <textarea value={cfg.about} onChange={set('about')} rows={4} placeholder="Tell members about your gym…" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </Card>

      <div className="flex items-center gap-3">
        <Btn onClick={save} disabled={saving}>{saving ? 'Publishing…' : 'Publish site'}</Btn>
        {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
      <p className="text-xs text-gray-400 mt-4">Menu items, branding and social links are managed in <b>Gym Settings</b> and the Domain/menu tools — this builder composes them into your public site.</p>
    </div>
  );
}
