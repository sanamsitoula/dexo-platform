'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { resolveClientSubdomain } from '@/lib/subdomain';
import PageSectionRenderer from '@/components/PageSectionRenderer';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
const API_BASE_URL = `${API_HOST}/api`;

/**
 * Authenticated preview — renders a page REGARDLESS OF STATUS (draft, in
 * review, approved, scheduled), unlike /[slug] which only serves published
 * (or past-due scheduled) pages. This closes the "I can't see my draft
 * rendered while I'm still building it" gap: the public route can't show
 * drafts by design (visitors must never see unpublished content), so this
 * is a separate route that requires the editor's own JWT.
 *
 * Reuses the existing authenticated GET /api/pages/:id (tenant-scoped,
 * already used by tenant-admin's own page editor) — no new backend
 * endpoint needed. The token is passed as a query param by tenant-admin's
 * "Preview" button (embedded as an iframe in the page editor), read from
 * the SAME localStorage the editor already authenticates with.
 */
export default function PagePreview() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pageId = params?.pageId as string;
  const token = searchParams?.get('token') || '';

  const [page, setPage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const subdomain = resolveClientSubdomain();

  useEffect(() => {
    if (!pageId || !token) { setError('Missing preview token'); return; }
    fetch(`${API_BASE_URL}/pages/${pageId}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? 'Preview session expired — reopen from the page editor' : 'Page not found');
        return res.json();
      })
      .then(setPage)
      .catch((e) => setError(e.message));
  }, [pageId, token]);

  if (error) {
    return <div className="p-8 text-center text-red-600 text-sm">{error}</div>;
  }
  if (!page) {
    return <div className="p-8 text-center text-gray-400 text-sm">Loading preview…</div>;
  }

  return (
    <div>
      <div className="sticky top-0 z-50 bg-amber-100 text-amber-900 text-xs font-medium text-center py-1.5 border-b border-amber-200">
        Draft preview — status: {page.status.replace('_', ' ')} — not visible to real visitors until published
      </div>
      {page.sections
        .filter((s: any) => s.status !== 'archived')
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        .map((section: any) => (
          <PageSectionRenderer key={section.id} section={section} subdomain={subdomain} />
        ))}
    </div>
  );
}
