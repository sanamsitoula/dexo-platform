'use client';

import { useEffect, useRef, useState } from 'react';
import { mediaApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { permanentMediaUrl } from '@/components/MediaPicker';
import { PageHeader, Card, Btn, EmptyState } from '../../_ui';
import WebsiteSubNav from '@/components/WebsiteSubNav';

export default function MediaLibraryPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!subdomain) return;
    setLoading(true);
    const r = await mediaApi.list(subdomain);
    setFiles(Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [subdomain]);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setErr(null);
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const r = await mediaApi.upload(subdomain, file);
      if (r.error) setErr(r.error);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this file? Any page/menu still referencing its URL will show a broken image.')) return;
    await mediaApi.remove(subdomain, id);
    load();
  }

  async function copyUrl(url: string) {
    await navigator.clipboard?.writeText(url);
  }

  return (
    <div className="max-w-5xl">
      <WebsiteSubNav />
      <PageHeader
        title="Media Library"
        subtitle="Images used across your website, menus, and pages. Uploads are private to your business."
        action={
          <label className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium cursor-pointer hover:bg-indigo-700">
            {uploading ? 'Uploading…' : '+ Upload'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files)}
            />
          </label>
        }
      />

      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : files.length === 0 ? (
        <Card><EmptyState icon="🖼️" title="No media yet" msg="Upload logos, hero images, and gallery photos to use across your site." /></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((f) => (
            <Card key={f.id} className="overflow-hidden p-0">
              <div className="aspect-square bg-gray-50">
                {f.mimeType?.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={f.originalName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📄</div>
                )}
              </div>
              <div className="p-2">
                <div className="text-xs text-gray-600 truncate" title={f.originalName}>{f.originalName}</div>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => copyUrl(permanentMediaUrl(f.id))} className="text-xs text-indigo-600 hover:underline">Copy URL</button>
                  <button onClick={() => remove(f.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
