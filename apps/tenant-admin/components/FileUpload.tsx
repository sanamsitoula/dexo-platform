'use client';

import { useRef, useState } from 'react';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');

export type DocumentType = 'LOGO' | 'PROFILE_PIC' | 'DOCUMENT' | 'INVOICE' | 'CONTRACT' | 'ID_PROOF' | 'OTHER';

const RULES: Record<DocumentType, { accept: string; maxBytes: number; label: string }> = {
  LOGO: { accept: 'image/png,image/jpeg', maxBytes: 500 * 1024, label: 'PNG or JPEG, up to 500KB' },
  PROFILE_PIC: { accept: 'image/png,image/jpeg', maxBytes: 500 * 1024, label: 'PNG or JPEG, up to 500KB' },
  DOCUMENT: {
    accept: 'application/pdf,application/msword,.doc,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,.xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg',
    maxBytes: 10 * 1024 * 1024,
    label: 'PDF, Word, Excel or image, up to 10MB',
  },
  INVOICE: { accept: 'application/pdf,image/png,image/jpeg', maxBytes: 10 * 1024 * 1024, label: 'PDF or image, up to 10MB' },
  CONTRACT: { accept: 'application/pdf,image/png,image/jpeg', maxBytes: 10 * 1024 * 1024, label: 'PDF or image, up to 10MB' },
  ID_PROOF: { accept: 'application/pdf,image/png,image/jpeg', maxBytes: 5 * 1024 * 1024, label: 'PDF or image, up to 5MB' },
  OTHER: { accept: '*/*', maxBytes: 10 * 1024 * 1024, label: 'Up to 10MB' },
};

function getToken(subdomain: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`tenant-token-${subdomain}`) || localStorage.getItem('token');
}

/** Stable, non-expiring URL for a public file — safe to persist (unlike the
 * time-limited presigned S3 URL from /files/download/:id). */
export function publicFileUrl(fileId: string): string {
  return `${API_HOST}/api/files/public/${fileId}`;
}

interface UploadedFileResult {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  url: string;
}

interface FileUploadProps {
  subdomain: string;
  documentType: DocumentType;
  scope?: 'TENANT' | 'PLATFORM';
  multiple?: boolean;
  isPublic?: boolean;
  onUploaded: (files: UploadedFileResult[]) => void;
  /** Optional preview to show above the picker (e.g. current logo/avatar). */
  preview?: React.ReactNode;
  buttonLabel?: string;
}

export default function FileUpload({
  subdomain,
  documentType,
  scope = 'TENANT',
  multiple = false,
  isPublic = false,
  onUploaded,
  preview,
  buttonLabel,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rule = RULES[documentType];

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const files = Array.from(fileList);
    for (const f of files) {
      if (f.size > rule.maxBytes) {
        setError(`"${f.name}" is ${Math.round(f.size / 1024)}KB, which exceeds the ${Math.round(rule.maxBytes / 1024)}KB limit.`);
        return;
      }
    }

    setUploading(true);
    try {
      const token = getToken(subdomain);
      const endpoint = multiple && files.length > 1 ? '/api/files/upload-multiple' : '/api/files/upload';
      const fd = new FormData();
      if (multiple && files.length > 1) {
        files.forEach((f) => fd.append('files', f));
      } else {
        fd.append('file', files[0]);
      }
      fd.append('documentType', documentType);
      fd.append('scope', scope);
      fd.append('isPublic', String(isPublic));

      const res = await fetch(`${API_HOST}${endpoint}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.message || `Upload failed (${res.status})`);
        return;
      }
      const results = Array.isArray(body) ? body : [body];
      onUploaded(
        results.map((r: any) => ({
          id: r.id,
          originalName: r.originalName,
          sizeBytes: r.sizeBytes,
          mimeType: r.mimeType,
          url: isPublic ? publicFileUrl(r.id) : r.downloadUrl,
        })),
      );
    } catch (e: any) {
      setError(e?.message || 'Upload failed — check your connection.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      {preview}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : buttonLabel || (multiple ? 'Upload files' : 'Upload')}
        </button>
        <span className="text-xs text-gray-400">{rule.label}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={rule.accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-sm text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
