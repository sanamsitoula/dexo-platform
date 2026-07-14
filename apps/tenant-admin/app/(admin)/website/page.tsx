'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { tenantApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, Field, Input } from '../_ui';
import WebsiteSubNav from '@/components/WebsiteSubNav';
import { templatesForDomain, getTemplate, type WebsiteTemplate } from '@dexo/shared/src/themes';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';

/** Dev builds always need a real, resolvable dev URL (subdomain.localhost:4005)
 * instead of the production domain — this link previously always pointed at
 * http://<subdomain>.onedexo.com even in local dev, where that hostname
 * doesn't resolve to the local tenant-website at all, so "Preview site" was
 * loading whatever onedexo.com actually is/was, not your local changes. */
function previewSiteUrl(subdomain: string): string {
  const isDev = typeof window !== 'undefined' && window.location.hostname.endsWith('localhost');
  return isDev ? `http://${subdomain}.localhost:4005` : `https://${subdomain}.${PLATFORM_DOMAIN}`;
}

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
  const [blogEnabled, setBlogEnabled] = useState(true);
  const [bookEnabled, setBookEnabled] = useState(true);
  const [navMsg, setNavMsg] = useState<string | null>(null);

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
      const navFlags = branding.navFlags || {};
      setBlogEnabled(navFlags.blogEnabled ?? true);
      setBookEnabled(navFlags.bookEnabled ?? true);
      setLoading(false);
    })();
  }, [subdomain]);

  async function saveNavFlags(next: { blogEnabled?: boolean; bookEnabled?: boolean }) {
    const merged = { blogEnabled, bookEnabled, ...next };
    setBlogEnabled(merged.blogEnabled);
    setBookEnabled(merged.bookEnabled);
    const r = await tenantApi.updateOwnBranding(subdomain, { navFlags: merged });
    if (!r.error) { setNavMsg('Saved'); setTimeout(() => setNavMsg(null), 1500); }
  }

  // tenant.service.ts's findBySubdomain() flattens TenantDomain into a plain
  // tenant.domainCode string and strips `domains` entirely — the
  // domains[0].domain.code path always silently evaluated to undefined and
  // fell through to settings.domainType (which is why this page happened to
  // still work; other call sites without that fallback did not).
  const domainType = tenant?.domainCode || tenant?.settings?.domainType || '';
  const templates = useMemo(() => (domainType ? templatesForDomain(domainType) : []), [domainType]);
  const currentTemplate = useMemo(() => (templateId ? getTemplate(templateId) : undefined), [templateId]);
  // Business-type-driven label, not hardcoded to any one industry — e.g.
  // "Fitness Center Settings", "Restaurant Settings" — falls back generically
  // when a tenant's domain type isn't resolved yet.
  const settingsLabel = domainType
    ? `${domainType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())} Settings`
    : 'Business Settings';

  async function save() {
    setSaving(true); setMsg(null);
    const r = await tenantApi.updateOwnBranding(subdomain, { templateId, tagline, description });
    setSaving(false);
    setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: 'Published — view your live site.' });
  }

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <WebsiteSubNav />
      <PageHeader title="Website Builder" subtitle="Design your public site — no code"
        action={<a href={previewSiteUrl(subdomain)} target="_blank" rel="noreferrer"><Btn variant="outline">↗ Preview site</Btn></a>} />

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
          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-400">
              Current: <b>{currentTemplate.templateName}</b> · {currentTemplate.heroType} hero · {currentTemplate.navigationStyle} nav
            </p>
            <Link href="/website/theme">
              <Btn variant="outline">🎨 Customize this template's colors, fonts & radius →</Btn>
            </Link>
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-2">
          These 5 designs are fixed starting points, not directly editable here — pick one, then open
          <Link href="/website/theme" className="text-indigo-600 hover:underline mx-1">Theme Builder</Link>
          to actually change its colors, fonts, and corner radius. The first time you open it, your
          current template's exact colors are copied in automatically as an editable theme, so nothing
          changes on your live site until you edit it there.
        </p>
      </Card>

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-1">Navigation</div>
        <p className="text-xs text-gray-500 mb-3">Show or hide these links in your site's nav bar. Enabled by default. The pages themselves stay reachable by direct link either way — this only controls whether they're advertised in the menu.</p>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={blogEnabled} onChange={(e) => saveNavFlags({ blogEnabled: e.target.checked })} />
            Show "Blog" in nav
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={bookEnabled} onChange={(e) => saveNavFlags({ bookEnabled: e.target.checked })} />
            Show "Book" in nav
          </label>
        </div>
        {navMsg && <p className="text-xs text-green-600 mt-2">{navMsg}</p>}
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
            <div className="font-bold text-gray-900">Theme Builder</div>
            <p className="text-xs text-gray-500 mt-1">Save multiple named custom themes — full color, font, and radius control beyond the fixed template picker above.</p>
          </div>
          <Link href="/website/theme"><Btn variant="outline">Open Theme Builder →</Btn></Link>
        </div>
      </Card>

      <Card className="p-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-gray-900">Pages</div>
            <p className="text-xs text-gray-500 mt-1">Build custom pages — Home, About, Careers, Landing Pages — from the Component Library (hero, testimonials, pricing, FAQ, and more).</p>
          </div>
          <Link href="/website/pages"><Btn variant="outline">Manage pages →</Btn></Link>
        </div>
      </Card>

      <Card className="p-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-gray-900">Content sections</div>
            <p className="text-xs text-gray-500 mt-1">Build reusable content sections — Services, Team, Locations, FAQ, Pricing, Gallery — and render them as a grid, table, carousel, list, accordion or map.</p>
          </div>
          <Link href="/website/menus"><Btn variant="outline">Manage menus →</Btn></Link>
        </div>
      </Card>

      <Card className="p-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-gray-900">Forms</div>
            <p className="text-xs text-gray-500 mt-1">Build contact/booking/feedback forms and embed them on any page via the Component Library.</p>
          </div>
          <Link href="/website/forms"><Btn variant="outline">Manage forms →</Btn></Link>
        </div>
      </Card>

      <Card className="p-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-gray-900">Media Library</div>
            <p className="text-xs text-gray-500 mt-1">Upload and manage images used across your website, menus, and pages.</p>
          </div>
          <Link href="/website/media"><Btn variant="outline">Manage media →</Btn></Link>
        </div>
      </Card>

      <p className="text-xs text-gray-400 mt-4">Navigation links, logo/colors and social links are managed in <b>{settingsLabel}</b> and the Domain tools — this page controls your template and homepage copy.</p>
    </div>
  );
}
