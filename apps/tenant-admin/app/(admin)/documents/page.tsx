'use client';

import { useCallback, useEffect, useState } from 'react';
import { filesApi, TenantFile } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, EmptyState, Badge } from '../_ui';
import FileUpload from '@/components/FileUpload';

function formatBytes(bytes: number | string): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${Math.round((n / (1024 * 1024)) * 10) / 10} MB`;
}

const TYPE_LABELS: Record<string, string> = {
  LOGO: 'Logo', PROFILE_PIC: 'Profile Photo', DOCUMENT: 'Document',
  INVOICE: 'Invoice', CONTRACT: 'Contract', ID_PROOF: 'ID Proof', OTHER: 'Other',
};

const TYPE_ICONS: Record<string, string> = {
  DOCUMENT: '📄', INVOICE: '🧾', CONTRACT: '📝', ID_PROOF: '🪪', LOGO: '🖼️', PROFILE_PIC: '👤', OTHER: '📎',
};

/** Business-document library — invoices, contracts, ID proofs and general
 * documents (not logos/profile pics, which live in their own settings
 * screens). Any staff member can upload; every upload/delete is written to
 * AuditLog server-side (files.service.ts logFileAction). */
export default function DocumentsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [files, setFiles] = useState<TenantFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [docType, setDocType] = useState<'DOCUMENT' | 'INVOICE' | 'CONTRACT' | 'ID_PROOF'>('DOCUMENT');

  const load = useCallback(async () => {
    const r = await filesApi.list(subdomain);
    const all = Array.isArray(r.data) ? r.data : [];
    // This screen is for business documents — logos/avatars are managed in
    // their own settings screens (Gym Settings, My Profile).
    setFiles(all.filter((f) => !['LOGO', 'PROFILE_PIC'].includes(f.documentType)));
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await filesApi.delete(subdomain, id);
    setDeletingId(null);
    load();
  }

  async function handleDownload(id: string, name: string) {
    const r = await filesApi.downloadUrl(subdomain, id);
    if (r.data?.downloadUrl) {
      const a = document.createElement('a');
      a.href = r.data.downloadUrl;
      a.download = name;
      a.click();
    }
  }

  return (
    <div>
      <PageHeader title="Documents" subtitle="Invoices, contracts, ID proofs and other business files." />

      <Card className="p-6 mb-4">
        <div className="font-bold text-gray-900 mb-3">Upload</div>
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm text-gray-600">Document type</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="DOCUMENT">Document</option>
            <option value="INVOICE">Invoice</option>
            <option value="CONTRACT">Contract</option>
            <option value="ID_PROOF">ID Proof</option>
          </select>
        </div>
        <FileUpload
          subdomain={subdomain}
          documentType={docType}
          multiple
          onUploaded={() => load()}
          buttonLabel="Upload document(s)"
        />
      </Card>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : files.length === 0 ? (
        <Card><EmptyState icon="📁" title="No documents yet" msg="Upload invoices, contracts, or other business files above." /></Card>
      ) : (
        <Card className="divide-y divide-gray-100">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl">{TYPE_ICONS[f.documentType] || '📎'}</span>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{f.originalName}</div>
                  <div className="text-xs text-gray-400">
                    {formatBytes(f.sizeBytes)} · {new Date(f.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <Badge color="indigo">{TYPE_LABELS[f.documentType] || f.documentType}</Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(f.id, f.originalName)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  disabled={deletingId === f.id}
                  className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                >
                  {deletingId === f.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
