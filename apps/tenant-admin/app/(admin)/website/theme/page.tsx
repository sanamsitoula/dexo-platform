'use client';

import { useEffect, useRef, useState } from 'react';
import { themeBuilderApi, tenantApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { templatesForDomain } from '@dexo/shared/src/themes';
import { PageHeader, Card, Btn, Badge, EmptyState, Field, Input } from '../../_ui';
import WebsiteSubNav from '@/components/WebsiteSubNav';

function previewSiteUrl(subdomain: string, previewToken?: string): string {
  const isDev = typeof window !== 'undefined' && window.location.hostname.endsWith('localhost');
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';
  const base = isDev ? `http://${subdomain}.localhost:4005` : `https://${subdomain}.${platformDomain}`;
  // Phase 3 draft/live isolation: token edits no longer touch the live site
  // until "Publish theme" is pressed, so this preview iframe carries a
  // signed admin preview token to see draft changes before publishing.
  return previewToken ? `${base}/?theme_preview=${encodeURIComponent(previewToken)}` : base;
}

const TOKEN_FIELDS: Array<{ key: string; label: string; type: 'color' | 'text' | 'number' }> = [
  { key: 'colorPrimary', label: 'Primary', type: 'color' },
  { key: 'colorAccent', label: 'Accent', type: 'color' },
  { key: 'colorBackground', label: 'Background', type: 'color' },
  { key: 'colorSurface', label: 'Surface', type: 'color' },
  { key: 'colorText', label: 'Text', type: 'color' },
  { key: 'colorTextSecondary', label: 'Secondary text', type: 'color' },
];

/** Workstream B item 1 (website_builder_remaining.md): the same 5 HeroType
 * values from packages/shared/src/themes/templates.ts, with a tiny inline
 * visual sketch per option so the picker isn't just a bare dropdown. */
const HERO_LAYOUT_OPTIONS: Array<{ value: string; label: string; sketch: string }> = [
  { value: 'split', label: 'Split', sketch: '▌ ▐' },
  { value: 'fullscreen', label: 'Fullscreen', sketch: '▉▉▉' },
  { value: 'floating-cards', label: 'Floating cards', sketch: '▘ ▝' },
  { value: 'editorial', label: 'Editorial', sketch: '▔▔▔' },
  { value: 'bold-block', label: 'Bold block', sketch: '▣▣▣' },
];

/** Workstream B item 4 (website_builder_remaining.md): the same 5 cardStyle/
 * ctaStyle/iconStyle values from packages/shared/src/themes/templates.ts,
 * with the same tiny inline-sketch picker convention as HERO_LAYOUT_OPTIONS
 * above (small labeled buttons, not a bare dropdown — matches the existing
 * "sketch or judgment-call plain control" instruction). */
const CARD_STYLE_OPTIONS: Array<{ value: string; label: string; sketch: string }> = [
  { value: 'elevated', label: 'Elevated', sketch: '▢˙' },
  { value: 'image-overlay', label: 'Image overlay', sketch: '▤▤' },
  { value: 'flat-bordered', label: 'Flat bordered', sketch: '▭' },
  { value: 'glassmorphism', label: 'Glass', sketch: '▦' },
  { value: 'thick-border', label: 'Thick border', sketch: '▣' },
];
const CTA_STYLE_OPTIONS: Array<{ value: string; label: string; sketch: string }> = [
  { value: 'gradient-banner', label: 'Gradient', sketch: '▓▒░' },
  { value: 'full-width-banner', label: 'Full-width banner', sketch: '▬▬▬' },
  { value: 'inline-text', label: 'Inline text', sketch: '_a_' },
  { value: 'floating-glow', label: 'Floating glow', sketch: '(●)' },
  { value: 'sticky-bar', label: 'Sticky bar', sketch: '┃▬┃' },
];
const ICON_STYLE_OPTIONS: Array<{ value: string; label: string; sketch: string }> = [
  { value: 'outline', label: 'Outline', sketch: '◯' },
  { value: 'thin-line', label: 'Thin line', sketch: '—' },
  { value: 'geometric', label: 'Geometric', sketch: '◇' },
  { value: 'duotone', label: 'Duotone', sketch: '◐' },
  { value: 'filled', label: 'Filled', sketch: '●' },
];

/** Workstream B item 3 (website_builder_remaining.md): footer structure as
 * data. Same "list of structured items" UI convention already used by
 * ComponentFieldsEditor.tsx's `list` field type (add/remove/edit rows),
 * simplified since there's no Media Library field here. */
interface FooterConfig {
  columns: Array<{ title: string; links: Array<{ label: string; url: string }> }>;
  socialLinks: Array<{ platform: string; url: string }>;
  showNewsletter: boolean;
  copyrightText: string;
}
const BLANK_FOOTER: FooterConfig = { columns: [], socialLinks: [], showNewsletter: false, copyrightText: '' };

export default function ThemeBuilderPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [tenant, setTenant] = useState<any>(null);
  const [themes, setThemes] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [fromTemplate, setFromTemplate] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Whichever theme is live drives the preview iframe — fetch it a signed
   * preview token so draft edits are visible there even though they no
   * longer reach the real public site until published. */
  async function ensurePreviewToken(themeId: string) {
    const r = await themeBuilderApi.previewToken(subdomain, themeId);
    if (r.data?.token) setPreviewToken(r.data.token);
  }

  function refreshPreview(debounced = false) {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    if (debounced) {
      previewDebounceRef.current = setTimeout(() => setPreviewKey((k) => k + 1), 700);
    } else {
      setPreviewKey((k) => k + 1);
    }
  }

  async function load() {
    if (!subdomain) return;
    setLoading(true);
    const [t, list] = await Promise.all([tenantApi.getBySubdomain(subdomain), themeBuilderApi.list(subdomain)]);
    setTenant(t.data);
    setThemes(Array.isArray(list.data) ? list.data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [subdomain]);
  useEffect(() => {
    const active = themes.find((t) => t.isActive);
    if (active) ensurePreviewToken(active.id);
  }, [themes.map((t) => t.id).join(','), themes.find((t) => t.isActive)?.id]);

  // See apps/tenant-admin/app/(admin)/website/page.tsx for why domainCode
  // (not domains[0].domain.code) is the correct field here.
  const domainType = tenant?.domainCode || tenant?.settings?.domainType || '';
  const templates = domainType ? templatesForDomain(domainType) : [];

  async function createTheme() {
    if (!newName.trim()) return;
    const tpl = templates.find((t) => t.id === fromTemplate);
    const r = await themeBuilderApi.create(subdomain, {
      name: newName,
      baseTemplateId: fromTemplate || undefined,
      colorPrimary: tpl?.palette.primary,
      colorAccent: tpl?.palette.accent,
      colorBackground: tpl?.palette.background,
      colorSurface: tpl?.palette.surface,
      colorText: tpl?.palette.text,
      colorTextSecondary: tpl?.palette.textSecondary,
      borderRadius: tpl?.borderRadius,
    });
    setCreating(false); setNewName(''); setFromTemplate('');
    load();
    if (r.data) setEditing(r.data);
  }

  async function saveToken(themeId: string, key: string, value: string) {
    const payload = key === 'borderRadius'
      ? { [key]: value === '' ? null : Number(value) }
      : ['heroLayout', 'cardStyle', 'ctaStyle', 'iconStyle'].includes(key)
        ? { [key]: value === '' ? null : value }
        : { [key]: value };
    const r = await themeBuilderApi.update(subdomain, themeId, payload);
    if (r.data) {
      setThemes((prev) => prev.map((t) => (t.id === themeId ? r.data : t)));
      setEditing(r.data);
      // Only refresh the preview if this theme is actually the live one —
      // editing an inactive theme's tokens doesn't change what's rendering.
      if (r.data.isActive) refreshPreview(true);
    }
  }

  /** Footer config is structured JSON, not a single scalar, so it goes
   * through its own save call (still the exact same `themeBuilderApi.update`
   * draft/preview flow as saveToken above — just carrying an object instead
   * of a string/number). */
  async function saveFooterConfig(themeId: string, config: FooterConfig) {
    const r = await themeBuilderApi.update(subdomain, themeId, { footerConfig: config });
    if (r.data) {
      setThemes((prev) => prev.map((t) => (t.id === themeId ? r.data : t)));
      setEditing(r.data);
      if (r.data.isActive) refreshPreview(true);
    }
  }

  async function activate(themeId: string) {
    await themeBuilderApi.activate(subdomain, themeId);
    setMsg('Live on your site now');
    setTimeout(() => setMsg(null), 2000);
    load();
    refreshPreview();
  }

  async function deactivate(themeId: string) {
    await themeBuilderApi.deactivate(subdomain, themeId);
    load();
    refreshPreview();
  }

  async function remove(themeId: string) {
    if (!confirm('Delete this theme?')) return;
    await themeBuilderApi.remove(subdomain, themeId);
    if (editing?.id === themeId) setEditing(null);
    load();
  }

  async function publish(themeId: string) {
    const r = await themeBuilderApi.publish(subdomain, themeId);
    if (r.data) {
      setThemes((prev) => prev.map((t) => (t.id === themeId ? r.data : t)));
      setEditing((e: any) => (e?.id === themeId ? r.data : e));
      setMsg('Published — live on your site now');
      setTimeout(() => setMsg(null), 2000);
      refreshPreview();
    }
  }

  async function revert(themeId: string) {
    if (!confirm('Revert to the last published version? Unpublished edits since then will be lost.')) return;
    const r = await themeBuilderApi.revert(subdomain, themeId);
    if (r.data) {
      setThemes((prev) => prev.map((t) => (t.id === themeId ? r.data : t)));
      setEditing((e: any) => (e?.id === themeId ? r.data : e));
      setMsg('Reverted to last published version');
      setTimeout(() => setMsg(null), 2000);
      refreshPreview();
    }
  }

  async function duplicate(theme: any) {
    const name = window.prompt('Name for the copy', `${theme.name} copy`);
    if (!name) return;
    await themeBuilderApi.duplicate(subdomain, theme.id, name);
    load();
  }

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-6xl">
      <WebsiteSubNav />
      <PageHeader
        title="Theme Builder"
        subtitle="Full color, font, and radius control beyond the fixed template picker — save multiple themes and switch which one is live."
        action={<Btn onClick={() => setCreating(true)}>+ New theme</Btn>}
      />
      {msg && <p className="text-sm text-green-600 mb-3">{msg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
      <div className="max-w-4xl">

      {creating && (
        <Card className="p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Theme name"><Input value={newName} onChange={(e: any) => setNewName(e.target.value)} placeholder="Summer refresh" autoFocus /></Field>
            <Field label="Start from a template (optional)">
              <select value={fromTemplate} onChange={(e) => setFromTemplate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Blank</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.templateName}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex gap-2 mt-3">
            <Btn onClick={createTheme} disabled={!newName.trim()}>Create</Btn>
            <Btn variant="outline" onClick={() => { setCreating(false); setNewName(''); setFromTemplate(''); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {themes.length === 0 ? (
        <Card><EmptyState icon="🎨" title="No custom themes yet" msg="Create one to get full color/font control beyond the fixed template picker." /></Card>
      ) : (
        <div className="space-y-3">
          {themes.map((theme) => (
            <Card key={theme.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1">
                    {[theme.colorPrimary, theme.colorAccent, theme.colorBackground].filter(Boolean).map((c: string, i: number) => (
                      <span key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                      {theme.name}
                      {theme.isActive && <Badge color="green">Live</Badge>}
                      {theme.isActive && theme.status === 'draft' && <Badge color="amber">Unpublished edits</Badge>}
                    </div>
                    <div className="text-xs text-gray-400">{theme.baseTemplateId ? `Based on ${theme.baseTemplateId}` : 'Blank theme'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => setEditing(editing?.id === theme.id ? null : theme)} className="text-indigo-600 hover:underline">{editing?.id === theme.id ? 'Close' : 'Edit'}</button>
                  <button onClick={() => duplicate(theme)} className="text-gray-500 hover:underline">Duplicate</button>
                  {theme.isActive && theme.status === 'draft' && (
                    <Btn onClick={() => publish(theme.id)}>Publish theme</Btn>
                  )}
                  {theme.isActive && theme.lastPublishedSnapshot && (
                    <button onClick={() => revert(theme.id)} className="text-gray-500 hover:underline">Revert to last published</button>
                  )}
                  {theme.isActive ? (
                    <button onClick={() => deactivate(theme.id)} className="text-gray-500 hover:underline">Deactivate</button>
                  ) : (
                    <Btn onClick={() => activate(theme.id)}>Set as live</Btn>
                  )}
                  <button onClick={() => remove(theme.id)} className="text-red-600 hover:underline">Delete</button>
                </div>
              </div>

              {editing?.id === theme.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {TOKEN_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme[f.key] || '#000000'}
                          onChange={(e) => saveToken(theme.id, f.key, e.target.value)}
                          className="w-9 h-9 rounded border border-gray-300"
                        />
                        <Input defaultValue={theme[f.key] || ''} onBlur={(e: any) => saveToken(theme.id, f.key, e.target.value)} className="text-xs" />
                      </div>
                    </div>
                  ))}
                  <Field label="Heading font">
                    <Input defaultValue={theme.headingFont || ''} onBlur={(e: any) => saveToken(theme.id, 'headingFont', e.target.value)} placeholder="Poppins, sans-serif" />
                  </Field>
                  <Field label="Body font">
                    <Input defaultValue={theme.bodyFont || ''} onBlur={(e: any) => saveToken(theme.id, 'bodyFont', e.target.value)} placeholder="Inter, sans-serif" />
                  </Field>
                  <Field label="Corner radius (px)">
                    <Input type="number" defaultValue={theme.borderRadius ?? ''} onBlur={(e: any) => saveToken(theme.id, 'borderRadius', e.target.value)} />
                  </Field>
                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hero layout</label>
                    <p className="text-[11px] text-gray-400 mb-2">
                      Overrides this theme&apos;s original template hero layout — independent of which of the 60
                      base templates was picked at signup. Leave unset to keep the template&apos;s default.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {HERO_LAYOUT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => saveToken(theme.id, 'heroLayout', theme.heroLayout === opt.value ? '' : opt.value)}
                          className={`p-2 rounded-md border text-center text-xs ${theme.heroLayout === opt.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                          <div className="font-mono text-sm mb-1 tracking-widest">{opt.sketch}</div>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Workstream B item 4: card/button/icon style pickers —
                    * same "small labeled buttons with an inline sketch"
                    * convention as the hero layout picker above, wired
                    * through the same saveToken/preview-iframe flow. */}
                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Card style</label>
                    <p className="text-[11px] text-gray-400 mb-2">
                      Overrides this theme&apos;s original template card treatment for feature/testimonial/pricing
                      cards. Leave unset to keep the template&apos;s default.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {CARD_STYLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => saveToken(theme.id, 'cardStyle', theme.cardStyle === opt.value ? '' : opt.value)}
                          className={`p-2 rounded-md border text-center text-xs ${theme.cardStyle === opt.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                          <div className="font-mono text-sm mb-1 tracking-widest">{opt.sketch}</div>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Button / CTA style</label>
                    <p className="text-[11px] text-gray-400 mb-2">
                      Overrides this theme&apos;s original template button treatment. Leave unset to keep the
                      template&apos;s default.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {CTA_STYLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => saveToken(theme.id, 'ctaStyle', theme.ctaStyle === opt.value ? '' : opt.value)}
                          className={`p-2 rounded-md border text-center text-xs ${theme.ctaStyle === opt.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                          <div className="font-mono text-sm mb-1 tracking-widest">{opt.sketch}</div>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Icon style</label>
                    <p className="text-[11px] text-gray-400 mb-2">
                      Overrides this theme&apos;s original template icon/accent treatment. Leave unset to keep the
                      template&apos;s default.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {ICON_STYLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => saveToken(theme.id, 'iconStyle', theme.iconStyle === opt.value ? '' : opt.value)}
                          className={`p-2 rounded-md border text-center text-xs ${theme.iconStyle === opt.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                          <div className="font-mono text-sm mb-1 tracking-widest">{opt.sketch}</div>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-3 border-t border-gray-100 pt-4">
                    <FooterEditor theme={theme} onSave={(cfg) => saveFooterConfig(theme.id, cfg)} />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      </div>

      <div className="lg:sticky lg:top-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-gray-700">Live site preview</div>
          <button onClick={() => refreshPreview()} className="text-xs text-indigo-600 hover:underline">↻ Refresh</button>
        </div>
        <Card className="p-0 overflow-hidden h-[80vh]">
          {subdomain && (
            <iframe key={previewKey} src={previewSiteUrl(subdomain, previewToken || undefined)} className="w-full h-full border-0" title="Live site preview" />
          )}
        </Card>
        <p className="text-[11px] text-gray-400 mt-1">
          Your real homepage, including its nav bar — the pages it links to (About, Services, Contact, etc.) are
          managed under <b>Pages</b> in the sidebar. This preview shows your unpublished draft edits via a signed
          admin preview link — real visitors won't see them until you press <b>Publish theme</b>.
        </p>
      </div>
      </div>
    </div>
  );
}

/** Workstream B item 3 (website_builder_remaining.md): footer column/link
 * management, social links, newsletter toggle, and copyright text — same
 * add/remove/edit-row complexity as ComponentFieldsEditor.tsx's `list` field
 * type, wired through the same saveToken-style flow (here, saveFooterConfig)
 * so it lands in draft and shows in the live-preview iframe exactly like
 * every other token. Local `draft` state mirrors the theme's current
 * `footerConfig` (or a blank shape if never set) and pushes the FULL config
 * object on every edit — simplest correct approach for a nested structure. */
function FooterEditor({ theme, onSave }: { theme: any; onSave: (cfg: FooterConfig) => void }) {
  const [draft, setDraft] = useState<FooterConfig>(theme.footerConfig || BLANK_FOOTER);

  useEffect(() => {
    setDraft(theme.footerConfig || BLANK_FOOTER);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.id, JSON.stringify(theme.footerConfig)]);

  function update(next: FooterConfig) {
    setDraft(next);
    onSave(next);
  }

  function addColumn() {
    update({ ...draft, columns: [...draft.columns, { title: '', links: [] }] });
  }
  function removeColumn(i: number) {
    update({ ...draft, columns: draft.columns.filter((_, idx) => idx !== i) });
  }
  function updateColumnTitle(i: number, title: string) {
    const columns = draft.columns.slice();
    columns[i] = { ...columns[i], title };
    update({ ...draft, columns });
  }
  function addLink(i: number) {
    const columns = draft.columns.slice();
    columns[i] = { ...columns[i], links: [...columns[i].links, { label: '', url: '' }] };
    update({ ...draft, columns });
  }
  function updateLink(i: number, j: number, key: 'label' | 'url', value: string) {
    const columns = draft.columns.slice();
    const links = columns[i].links.slice();
    links[j] = { ...links[j], [key]: value };
    columns[i] = { ...columns[i], links };
    update({ ...draft, columns });
  }
  function removeLink(i: number, j: number) {
    const columns = draft.columns.slice();
    columns[i] = { ...columns[i], links: columns[i].links.filter((_, idx) => idx !== j) };
    update({ ...draft, columns });
  }

  function addSocial() {
    update({ ...draft, socialLinks: [...draft.socialLinks, { platform: '', url: '' }] });
  }
  function updateSocial(i: number, key: 'platform' | 'url', value: string) {
    const socialLinks = draft.socialLinks.slice();
    socialLinks[i] = { ...socialLinks[i], [key]: value };
    update({ ...draft, socialLinks });
  }
  function removeSocial(i: number) {
    update({ ...draft, socialLinks: draft.socialLinks.filter((_, idx) => idx !== i) });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-600">Footer</label>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">
        Overrides the site&apos;s default footer (Home/About/Services/Book/Join/Contact links + a plain
        copyright line). Leave every column empty to keep that default.
      </p>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">Link columns</span>
        <button type="button" onClick={addColumn} className="text-xs text-indigo-600 hover:underline">+ Add column</button>
      </div>
      <div className="space-y-3 mb-4">
        {draft.columns.map((col, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3 relative">
            <button type="button" onClick={() => removeColumn(i)} className="absolute top-2 right-2 text-xs text-red-600 hover:underline">Remove</button>
            <div className="pr-14">
              <Input
                defaultValue={col.title}
                onBlur={(e: any) => updateColumnTitle(i, e.target.value)}
                placeholder="Column title (e.g. Company)"
                className="text-xs mb-2"
              />
              <div className="space-y-1">
                {col.links.map((link, j) => (
                  <div key={j} className="flex items-center gap-1">
                    <Input defaultValue={link.label} onBlur={(e: any) => updateLink(i, j, 'label', e.target.value)} placeholder="Label" className="text-xs" />
                    <Input defaultValue={link.url} onBlur={(e: any) => updateLink(i, j, 'url', e.target.value)} placeholder="/url or https://…" className="text-xs" />
                    <button type="button" onClick={() => removeLink(i, j)} className="text-xs text-red-600 hover:underline shrink-0">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addLink(i)} className="text-xs text-indigo-600 hover:underline mt-1">+ Add link</button>
            </div>
          </div>
        ))}
        {draft.columns.length === 0 && <div className="text-xs text-gray-400">No columns yet — click &quot;+ Add column&quot;.</div>}
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">Social links</span>
        <button type="button" onClick={addSocial} className="text-xs text-indigo-600 hover:underline">+ Add</button>
      </div>
      <div className="space-y-1 mb-4">
        {draft.socialLinks.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input defaultValue={s.platform} onBlur={(e: any) => updateSocial(i, 'platform', e.target.value)} placeholder="Platform (e.g. Instagram)" className="text-xs" />
            <Input defaultValue={s.url} onBlur={(e: any) => updateSocial(i, 'url', e.target.value)} placeholder="https://…" className="text-xs" />
            <button type="button" onClick={() => removeSocial(i)} className="text-xs text-red-600 hover:underline shrink-0">✕</button>
          </div>
        ))}
        {draft.socialLinks.length === 0 && <div className="text-xs text-gray-400">No social links yet.</div>}
      </div>

      <label className="flex items-center gap-2 mb-3 text-xs text-gray-600">
        <input type="checkbox" checked={draft.showNewsletter} onChange={(e) => update({ ...draft, showNewsletter: e.target.checked })} />
        Show newsletter sign-up line in footer
      </label>

      <Field label="Copyright text">
        <Input
          defaultValue={draft.copyrightText}
          onBlur={(e: any) => update({ ...draft, copyrightText: e.target.value })}
          placeholder={`© ${new Date().getFullYear()} Your business name`}
        />
      </Field>
    </div>
  );
}
