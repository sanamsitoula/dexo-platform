'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { tenantApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Field, Input } from '../_ui';
import { templatesForDomain, getTemplate, type WebsiteTemplate } from '@dexo/shared/src/themes';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';

function TemplateSwatch({ t, selected, onClick }: { t: WebsiteTemplate; selected: boolean; onClick: () => void }) {
  const p = t.palette;
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border-2 overflow-hidden transition ${
        selected ? 'border-gray-900 ring-2 ring-gray-900/20 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="h-20 flex items-center justify-center gap-2" style={{ backgroundColor: p.background }}>
        <span className="h-8 w-8 rounded-full" style={{ backgroundColor: p.primary }} />
        <span className="h-8 w-8 rounded-full" style={{ backgroundColor: p.accent }} />
      </div>
      <div className="p-3 bg-white border-t border-gray-100">
        <div className="font-semibold text-sm text-gray-900">{t.templateName}</div>
        <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{t.style}</span>
          {t.premium && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Premium</span>}
        </div>
      </div>
    </button>
  );
}

export default function WebsiteBuilderPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [tenant, setTenant] = useState<any>(null);
  const [templateId, setTemplateId] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!subdomain) return;
    (async () => {
      const r = await tenantApi.getBySubdomain(subdomain);
      const t = r.data;
      setTenant(t);
      const branding = t?.settings?.branding || {};
      setTemplateId(branding.templateId || '');
      setTagline(branding.tagline || '');
      setDescription(branding.description || '');
      setLoading(false);
    })();
  }, [subdomain]);

  const domainType = tenant?.domains?.[0]?.domain?.code || tenant?.settings?.domainType || '';
  const templates = useMemo(() => (domainType ? templatesForDomain(domainType) : []), [domainType]);
  const currentTemplate = useMemo(() => (templateId ? getTemplate(templateId) : undefined), [templateId]);

  async function save() {
    setSaving(true); setMsg(null);
    const r = await tenantApi.updateOwnBranding(subdomain, { templateId, tagline, description });
    setSaving(false);
    setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: 'Published — view your live site.' });
  }

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Website Builder" subtitle="Design your public site — no code"
        action={<a href={`http://${subdomain}.${PLATFORM_DOMAIN}`} target="_blank" rel="noreferrer"><Btn variant="outline">↗ Preview site</Btn></a>} />

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-1">Template</div>
        <p className="text-xs text-gray-500 mb-3">
          {templates.length} designs for {domainType ? domainType.replace(/_/g, ' ').toLowerCase() : 'your business'} — pick any, your site updates immediately.
        </p>
        {templates.length === 0 ? (
          <div className="text-sm text-gray-400">No templates found for this business type.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {templates.map((t) => (
              <TemplateSwatch key={t.id} t={t} selected={templateId === t.id} onClick={() => setTemplateId(t.id)} />
            ))}
          </div>
        )}
        {currentTemplate && (
          <p className="text-xs text-gray-400 mt-3">
            Current: <b>{currentTemplate.templateName}</b> · {currentTemplate.heroType} hero · {currentTemplate.navigationStyle} nav
          </p>
        )}
      </Card>

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-3">Hero</div>
        <Field label="Tagline"><Input value={tagline} onChange={(e: any) => setTagline(e.target.value)} placeholder={currentTemplate?.hero.title || 'Your headline'} /></Field>
      </Card>

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-3">About</div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
          placeholder={currentTemplate?.hero.subtitle || 'Tell visitors about your business…'}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </Card>

      <div className="flex items-center gap-3">
        <Btn onClick={save} disabled={saving || !templateId}>{saving ? 'Publishing…' : 'Publish site'}</Btn>
        {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
      </div>

      <Card className="p-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-gray-900">Content sections</div>
            <p className="text-xs text-gray-500 mt-1">Build reusable content sections — Services, Team, Locations, FAQ, Pricing, Gallery — and render them as a grid, table, carousel, list, accordion or map.</p>
          </div>
          <Link href="/website/menus"><Btn variant="outline">Manage menus →</Btn></Link>
        </div>
      </Card>

      <p className="text-xs text-gray-400 mt-4">Navigation links, logo/colors and social links are managed in <b>Gym Settings</b> and the Domain tools — this page controls your template and homepage copy.</p>
    </div>
  );
}
