'use client';

import { useEffect, useRef, useState } from 'react';
import { themeBuilderApi, tenantApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { templatesForDomain } from '@dexo/shared/src/themes';
import { PageHeader, Card, Btn, Badge, EmptyState, Field, Input } from '../../_ui';
import WebsiteSubNav from '@/components/WebsiteSubNav';

function previewSiteUrl(subdomain: string): string {
  const isDev = typeof window !== 'undefined' && window.location.hostname.endsWith('localhost');
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';
  return isDev ? `http://${subdomain}.localhost:4005` : `https://${subdomain}.${platformDomain}`;
}

const TOKEN_FIELDS: Array<{ key: string; label: string; type: 'color' | 'text' | 'number' }> = [
  { key: 'colorPrimary', label: 'Primary', type: 'color' },
  { key: 'colorAccent', label: 'Accent', type: 'color' },
  { key: 'colorBackground', label: 'Background', type: 'color' },
  { key: 'colorSurface', label: 'Surface', type: 'color' },
  { key: 'colorText', label: 'Text', type: 'color' },
  { key: 'colorTextSecondary', label: 'Secondary text', type: 'color' },
];

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
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const payload = key === 'borderRadius' ? { [key]: value === '' ? null : Number(value) } : { [key]: value };
    const r = await themeBuilderApi.update(subdomain, themeId, payload);
    if (r.data) {
      setThemes((prev) => prev.map((t) => (t.id === themeId ? r.data : t)));
      setEditing(r.data);
      // Only refresh the preview if this theme is actually the live one —
      // editing an inactive theme's tokens doesn't change what's rendering.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
                    </div>
                    <div className="text-xs text-gray-400">{theme.baseTemplateId ? `Based on ${theme.baseTemplateId}` : 'Blank theme'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => setEditing(editing?.id === theme.id ? null : theme)} className="text-indigo-600 hover:underline">{editing?.id === theme.id ? 'Close' : 'Edit'}</button>
                  <button onClick={() => duplicate(theme)} className="text-gray-500 hover:underline">Duplicate</button>
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
            <iframe key={previewKey} src={previewSiteUrl(subdomain)} className="w-full h-full border-0" title="Live site preview" />
          )}
        </Card>
        <p className="text-[11px] text-gray-400 mt-1">
          Your real homepage, including its nav bar — the pages it links to (About, Services, Contact, etc.) are
          managed under <b>Pages</b> in the sidebar. Colors update automatically when you edit the active theme's tokens.
        </p>
      </div>
      </div>
    </div>
  );
}
