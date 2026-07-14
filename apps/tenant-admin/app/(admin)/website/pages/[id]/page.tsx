'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { pageBuilderApi, tenantApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { COMPONENT_LIBRARY, getComponentDef, mapTemplateSectionToComponent } from '@dexo/shared/src/page-builder';
import { getTemplate } from '@dexo/shared/src/themes';
import SortableSectionList from '@/components/SortableSectionList';
import { PageHeader, Card, Btn, Badge, Field, Input, SlideOver } from '../../../_ui';
import WebsiteSubNav from '@/components/WebsiteSubNav';

function previewUrl(subdomain: string, pageId: string): string {
  const isDev = typeof window !== 'undefined' && window.location.hostname.endsWith('localhost');
  const token = typeof window !== 'undefined'
    ? localStorage.getItem(`tenant-token-${subdomain}`) || localStorage.getItem('token') || ''
    : '';
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';
  const host = isDev ? `${subdomain}.localhost:4005` : `${subdomain}.${platformDomain}`;
  const scheme = isDev ? 'http' : 'https';
  return `${scheme}://${host}/preview/${pageId}?token=${encodeURIComponent(token)}`;
}

export default function PageEditorPage() {
  const params = useParams();
  const pageId = params?.id as string;
  const subdomain = resolveTenantAdminSubdomain();

  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!subdomain || !pageId) return;
    setLoading(true);
    const r = await pageBuilderApi.get(subdomain, pageId);
    setPage(r.data || null);
    setLoading(false);
    setPreviewKey((k) => k + 1); // refresh the preview iframe after any structural change
  }
  useEffect(() => { load(); }, [subdomain, pageId]);

  async function saveSettings(patch: any) {
    setSavingSettings(true);
    const r = await pageBuilderApi.update(subdomain, pageId, patch);
    setSavingSettings(false);
    if (!r.error) { setMsg('Saved'); setTimeout(() => setMsg(null), 1500); load(); }
  }

  const [workflowErr, setWorkflowErr] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');

  async function runTransition(action: () => Promise<any>) {
    setWorkflowErr(null);
    const r = await action();
    if (r?.error) { setWorkflowErr(r.error); return; }
    setScheduling(false);
    load();
  }

  async function addSection(componentType: string) {
    const def = getComponentDef(componentType);
    await pageBuilderApi.createSection(subdomain, pageId, { componentType, content: def?.defaultContent || {} });
    setPickerOpen(false);
    load();
  }

  const [importing, setImporting] = useState(false);

  // The tenant picks a business-type template in Website Builder, and that
  // template already knows a recommended section "journey" (hero, services,
  // testimonials, pricing, faq, ...) — but until now that was purely
  // descriptive metadata with no way to turn it into actual editable
  // content, so every new page started completely blank regardless of the
  // chosen template. This creates real, editable sections seeded from it.
  async function importFromTemplate() {
    setImporting(true);
    const t = await tenantApi.getBySubdomain(subdomain);
    const templateId = t.data?.settings?.branding?.templateId;
    const tpl = templateId ? getTemplate(templateId) : undefined;
    if (!tpl) {
      alert('No website template is selected yet — pick one on the Website Builder overview page first.');
      setImporting(false);
      return;
    }
    for (const keyword of tpl.sections) {
      const componentType = mapTemplateSectionToComponent(keyword);
      if (!componentType) continue;
      const def = getComponentDef(componentType);
      let content = def?.defaultContent || {};
      if (componentType === 'hero') content = { ...content, title: tpl.hero.title, subtitle: tpl.hero.subtitle, ctaLabel: tpl.hero.cta };
      if (componentType === 'cta') content = { ...content, ctaLabel: tpl.hero.cta };
      await pageBuilderApi.createSection(subdomain, pageId, { componentType, content });
    }
    setImporting(false);
    load();
  }

  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Updates local state immediately (no full reload — the field editors are
  // controlled inputs, so a page-wide refetch on every keystroke would both
  // spam the API and be visibly janky) and saves in the background. The
  // preview iframe refreshes on a short debounce instead of every keystroke.
  function updateSectionContent(sectionId: string, content: any) {
    setPage((prev: any) => ({
      ...prev,
      sections: prev.sections.map((s: any) => (s.id === sectionId ? { ...s, content } : s)),
    }));
    pageBuilderApi.updateSection(subdomain, sectionId, { content });
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => setPreviewKey((k) => k + 1), 1200);
  }

  async function removeSection(sectionId: string) {
    if (!confirm('Remove this section?')) return;
    await pageBuilderApi.removeSection(subdomain, sectionId);
    load();
  }

  async function moveSection(sectionId: string, direction: 'up' | 'down') {
    await pageBuilderApi.reorderSection(subdomain, sectionId, direction);
    load();
  }

  // Drag-and-drop drop handler: reorder locally first (instant feedback,
  // no flicker waiting on the network), then persist with one bulk call.
  function reorderSections(orderedIds: string[]) {
    setPage((prev: any) => {
      const byId = new Map(prev.sections.map((s: any) => [s.id, s]));
      return { ...prev, sections: orderedIds.map((id) => byId.get(id)) };
    });
    pageBuilderApi.reorderSections(subdomain, pageId, orderedIds);
  }

  if (loading || !page) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-6xl">
      <WebsiteSubNav />
      <PageHeader
        title={page.name}
        subtitle={`/${page.slug}`}
        action={
          <div className="flex items-center gap-2">
            <Badge color={
              page.status === 'published' ? 'green' :
              page.status === 'scheduled' ? 'indigo' :
              page.status === 'approved' ? 'indigo' :
              page.status === 'in_review' ? 'amber' :
              page.status === 'archived' ? 'red' : 'gray'
            }>{page.status.replace('_', ' ')}</Badge>
            <Btn variant="outline" onClick={() => setPreviewOpen((v) => !v)}>{previewOpen ? 'Hide preview' : 'Show preview'}</Btn>
          </div>
        }
      />

      <div className={previewOpen ? 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-start' : ''}>
        <div className="max-w-4xl">

      <Card className="p-5 mb-4">
        <div className="font-bold text-gray-900 mb-3">Publishing</div>
        {workflowErr && <p className="text-sm text-red-600 mb-2">{workflowErr}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {page.status === 'draft' && (
            <Btn onClick={() => runTransition(() => pageBuilderApi.submitForReview(subdomain, pageId))}>Submit for review</Btn>
          )}
          {page.status === 'in_review' && (
            <>
              <Btn onClick={() => runTransition(() => pageBuilderApi.approve(subdomain, pageId))}>Approve</Btn>
              <Btn variant="outline" onClick={() => runTransition(() => pageBuilderApi.revertToDraft(subdomain, pageId))}>Send back to draft</Btn>
            </>
          )}
          {page.status === 'approved' && (
            <>
              <Btn onClick={() => runTransition(() => pageBuilderApi.publishNow(subdomain, pageId))}>Publish now</Btn>
              {!scheduling ? (
                <Btn variant="outline" onClick={() => setScheduling(true)}>Schedule…</Btn>
              ) : (
                <span className="flex items-center gap-2">
                  <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                  <Btn onClick={() => runTransition(() => pageBuilderApi.schedule(subdomain, pageId, new Date(scheduleAt).toISOString()))} disabled={!scheduleAt}>Confirm</Btn>
                  <button onClick={() => setScheduling(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                </span>
              )}
              <Btn variant="outline" onClick={() => runTransition(() => pageBuilderApi.revertToDraft(subdomain, pageId))}>Send back to draft</Btn>
            </>
          )}
          {page.status === 'scheduled' && (
            <>
              <span className="text-sm text-gray-500">Publishes automatically at {new Date(page.publishAt).toLocaleString()}</span>
              <Btn onClick={() => runTransition(() => pageBuilderApi.publishNow(subdomain, pageId))}>Publish now instead</Btn>
              <Btn variant="outline" onClick={() => runTransition(() => pageBuilderApi.revertToDraft(subdomain, pageId))}>Cancel & send back to draft</Btn>
            </>
          )}
          {page.status === 'published' && (
            <Btn variant="outline" onClick={() => runTransition(() => pageBuilderApi.archivePage(subdomain, pageId))}>Archive</Btn>
          )}
          {page.status === 'archived' && (
            <Btn variant="outline" onClick={() => runTransition(() => pageBuilderApi.revertToDraft(subdomain, pageId))}>Restore to draft</Btn>
          )}
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <div className="font-bold text-gray-900 mb-3">Page settings</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name">
            <Input defaultValue={page.name} onBlur={(e: any) => e.target.value !== page.name && saveSettings({ name: e.target.value })} />
          </Field>
          <Field label="Slug">
            <Input defaultValue={page.slug} onBlur={(e: any) => e.target.value !== page.slug && saveSettings({ slug: e.target.value })} />
          </Field>
          <Field label="Homepage">
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
              <input type="checkbox" defaultChecked={page.isHomepage} onChange={(e) => saveSettings({ isHomepage: e.target.checked })} />
              Use as homepage
            </label>
          </Field>
        </div>
        {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
      </Card>

      <Card className="p-5 mb-4">
        <div className="font-bold text-gray-900 mb-3">SEO</div>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Meta title">
            <Input defaultValue={page.metaTitle || ''} onBlur={(e: any) => saveSettings({ metaTitle: e.target.value })} />
          </Field>
          <Field label="Meta description">
            <textarea defaultValue={page.metaDescription || ''} onBlur={(e) => saveSettings({ metaDescription: e.target.value })} rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </Field>
          <Field label="Canonical URL">
            <Input defaultValue={page.canonicalUrl || ''} onBlur={(e: any) => saveSettings({ canonicalUrl: e.target.value })} placeholder="https://…" />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-gray-900">Sections</div>
        <div className="flex gap-2">
          {page.sections.length === 0 && (
            <Btn variant="outline" onClick={importFromTemplate} disabled={importing}>
              {importing ? 'Importing…' : '✨ Import from your template'}
            </Btn>
          )}
          <Btn onClick={() => setPickerOpen(true)}>+ Add section</Btn>
        </div>
      </div>

      {page.sections.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">No sections yet — add one manually, or use "Import from your template" above to start from your chosen website template's recommended layout.</Card>
      ) : (
        <SortableSectionList
          subdomain={subdomain}
          sections={page.sections}
          onReorder={reorderSections}
          onContentChange={updateSectionContent}
          onMove={moveSection}
          onRemove={removeSection}
        />
      )}

      <SlideOver open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add a section">
        <div className="grid grid-cols-1 gap-2">
          {COMPONENT_LIBRARY.map((c) => (
            <button
              key={c.key}
              onClick={() => addSection(c.key)}
              className="text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 flex items-start gap-3"
            >
              <span className="text-xl">{c.icon}</span>
              <div>
                <div className="font-semibold text-sm text-gray-900">{c.label}</div>
                <div className="text-xs text-gray-500">{c.description}</div>
              </div>
            </button>
          ))}
        </div>
      </SlideOver>
        </div>

        {previewOpen && (
          <div className="lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">Live preview</div>
              <button onClick={() => setPreviewKey((k) => k + 1)} className="text-xs text-indigo-600 hover:underline">↻ Refresh</button>
            </div>
            <Card className="p-0 overflow-hidden h-[80vh]">
              <iframe
                key={previewKey}
                src={previewUrl(subdomain, pageId)}
                className="w-full h-full border-0"
                title="Page preview"
              />
            </Card>
            <p className="text-[11px] text-gray-400 mt-1">Shows the page as it actually renders, at any status (draft/in review/scheduled) — visitors can't see this until you publish.</p>
          </div>
        )}
      </div>
    </div>
  );
}
