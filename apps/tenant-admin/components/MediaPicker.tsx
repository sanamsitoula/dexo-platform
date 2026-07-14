'use client'

import { useEffect, useRef, useState } from 'react'
import { mediaApi } from '@/lib/api'

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')

export interface MediaFile {
  id: string
  originalName: string
  /** Signed S3/MinIO URL — expires in ~1hr, fine for the browser grid preview only. */
  url: string
  mimeType?: string | null
  sizeBytes?: number | null
}

/** Stable, non-expiring URL for anything actually embedded in stored content
 * (rich text HTML, menu item images) — signed URLs above would go dead
 * after an hour if saved into a page. Only correct for isPublic uploads
 * (mediaApi.upload always uploads as public). */
export function permanentMediaUrl(fileId: string): string {
  return `${API_HOST}/api/files/public/${fileId}`
}

/**
 * Modal media browser + uploader. Used both standalone (Media Library page)
 * and embedded (RichTextEditor's image button) — `onSelect` fires with the
 * signed URL of the chosen/uploaded file; the caller decides what to do with
 * it (insert into the editor, save as a field value, etc.).
 */
export default function MediaPicker({
  subdomain,
  open,
  onClose,
  onSelect,
}: {
  subdomain: string
  open: boolean
  onClose: () => void
  onSelect: (file: MediaFile) => void
}) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const r = await mediaApi.list(subdomain)
    setFiles(Array.isArray(r.data) ? r.data : [])
    setLoading(false)
  }

  useEffect(() => {
    if (open) load()
  }, [open, subdomain])

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setErr(null)
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const r = await mediaApi.upload(subdomain, file)
      if (r.error) { setErr(r.error); continue }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this file? This cannot be undone.')) return
    await mediaApi.remove(subdomain, id)
    load()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="font-semibold text-gray-900">Media Library</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
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
          <span className="text-xs text-gray-400">PNG, JPEG, WEBP, GIF, SVG — up to 5MB each</span>
        </div>
        {err && <div className="px-5 py-2 text-sm text-red-600 bg-red-50">{err}</div>}

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : files.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-3xl mb-2">🖼️</div>
              No media yet — upload your first image above.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {files.map((f) => (
                <div key={f.id} className="group relative border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="block w-full aspect-square bg-gray-50"
                    onClick={() => onSelect(f)}
                    title={f.originalName}
                  >
                    {f.mimeType?.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.url} alt={f.originalName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📄</div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs"
                    title="Delete"
                  >
                    &times;
                  </button>
                  <div className="px-1.5 py-1 text-[11px] text-gray-500 truncate border-t border-gray-100">{f.originalName}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
